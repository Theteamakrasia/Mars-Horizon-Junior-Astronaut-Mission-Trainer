#!/usr/bin/env node
/**
 * Architecture and banned-API checker for Mars Horizon.
 *
 * Run with `npm run check`. Exits 1 on any violation, 0 otherwise.
 *
 * The project is layered so that a rule can be *enforced* rather than trusted:
 *
 *   core/  pure mathematics, zero DOM access, fully unit tested
 *   data/  the ONLY layer permitted to touch the network
 *   dom/   browser side effects — rAF, DOM writes, pointer events
 *   ui/    screens and rendering
 *   main.ts  the entry point, exempt from layer-crossing but not from banned APIs
 *
 * Imports must point "upward" only, per ALLOWED below. Anything not listed is a
 * violation, so adding a layer means adding it here deliberately.
 *
 * Every violation prints file:line, because a rule that cannot point at the
 * offending character is a rule nobody can act on.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');

/** Layers, lowest first. A module may import from its own layer or from lower ones. */
const LAYERS = ['core', 'data', 'dom', 'ui'];

/**
 * Which layers each layer is allowed to import from.
 *
 * Deliberately an allow-list of pairs rather than a rank comparison: an explicit
 * table can be printed into architecture.md and read by a human, and it cannot be
 * defeated by inserting a new layer at the wrong position.
 *
 *   core  -> core          pure maths must not depend on anything impure
 *   data  -> data, core    data shaping may use maths, never the DOM
 *   dom   -> dom, core, data  animation may read data, never render screens
 *   ui    -> ui, core, data, dom
 *   main  -> anything      the composition root, by definition
 *
 * Every layer may import its own layer — sibling modules within a layer are the
 * normal case — plus the layers listed beneath it.
 */
const ALLOWED = {
  core: ['core'],
  data: ['data', 'core'],
  dom: ['dom', 'core', 'data'],
  ui: ['ui', 'core', 'data', 'dom'],
  entry: LAYERS,
};

/**
 * Pre-existing violations that are tolerated for now.
 *
 * Each entry is `"<relative path>:<line>:<ruleId>"`. A matching violation is
 * reported as KNOWN and does not fail the check.
 *
 * This list is deliberately EMPTY. There are currently no outstanding violations,
 * and seeding it with a speculative entry would be worse than leaving it empty —
 * a KNOWN entry that never matches is caught by the staleness rule below, so a
 * fabricated one would fail the build immediately and teach the team nothing.
 *
 * Self-cleaning rule: if an entry here matches no current violation, the script
 * FAILS and tells you to delete it. A KNOWN list that can only grow is a list
 * nobody reads by month three. When you fix a KNOWN violation, delete its entry in
 * the same commit.
 */
const KNOWN = new Set();

/**
 * Banned APIs.
 *
 * `layers: null` means banned everywhere. Otherwise the API is banned in every
 * layer not listed, which is the form that scales as layers are added.
 */
const BANNED_APIS = [
  {
    id: 'no-alert',
    api: /\b(alert|confirm|prompt)\s*\(/,
    layers: null,
    reason: 'blocking browser dialogs have no place in a game for children; route through ui/',
  },
  {
    id: 'no-dom-outside-dom',
    api: /\b(document|window)\b/,
    layers: ['dom', 'ui', 'entry'],
    reason: 'DOM access is confined to dom/, ui/ and the entry point so that core/ stays unit testable',
  },
  {
    id: 'no-network-outside-data',
    api: /\b(fetch|XMLHttpRequest|WebSocket|EventSource|navigator\.sendBeacon)\b/,
    layers: ['data'],
    reason: 'all network access belongs to the data/ layer, so failures and fallbacks are handled in one place',
  },
];

/** Extensions treated as source. */
const CODE_EXT = new Set(['.ts', '.tsx', '.mts', '.js', '.mjs', '.jsx']);

/** Files worth scanning, relative to root, with posix separators. */
function walk(dir) {
  const found = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);

    if (entry.isDirectory()) found.push(...walk(full));
    else if (CODE_EXT.has(extname(entry.name))) found.push(full);
  }

  return found;
}

/** posix-normalised path relative to the repo root. */
function rel(file) {
  return relative(ROOT, file).split(sep).join('/');
}

/** Which layer is this file in? `entry` for main.ts, `null` if unrecognised. */
function layerOf(file) {
  const r = rel(file);

  if (r === 'src/main.ts') return 'entry';

  const match = /^src\/([^/]+)\//.exec(r);
  return match ? match[1] : null;
}

/** 1-based line number of a character offset. */
function lineAt(source, index) {
  let line = 1;
  for (let i = 0; i < index && i < source.length; i++) {
    if (source[i] === '\n') line++;
  }
  return line;
}

/**
 * Remove comments so that prose mentioning `document` or `fetch` is not mistaken
 * for code calling them. Block comments first, then line comments, so that a `//`
 * inside a block comment cannot split it incorrectly.
 */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, ' '));
}

/**
 * Every module specifier in a file, with its offset.
 *
 * Handles multi-line `import {...} from '...'`, bare side-effect imports,
 * re-exports, and dynamic `import()`.
 */
function findImports(code) {
  const specifiers = [];
  const patterns = [
    /\bimport\s+[\s\S]*?\bfrom\s*['"]([^'"]+)['"]/g,
    /\bimport\s*['"]([^'"]+)['"]/g,
    /\bexport\s+[\s\S]*?\bfrom\s*['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];

  for (const pattern of patterns) {
    for (const match of code.matchAll(pattern)) {
      specifiers.push({ specifier: match[1], index: match.index });
    }
  }

  return specifiers.sort((a, b) => a.index - b.index);
}

/** Is this specifier a relative path to code inside the repo? */
function isLocalCode(fromFile, specifier) {
  if (!specifier.startsWith('.')) return null; // bare specifier: external package

  const ext = extname(specifier);

  // A non-code extension is an asset the bundler owns — CSS, PNG, SVG. The layer
  // rules say nothing about those, so they are skipped rather than misclassified.
  if (ext !== '' && !CODE_EXT.has(ext)) return null;

  const target = resolve(dirname(fromFile), specifier);
  const candidate = CODE_EXT.has(extname(target)) ? target : `${target}.ts`;

  // A relative non-asset specifier that does not resolve is a typo, and is
  // reported rather than skipped. Silently ignoring it would let a broken import
  // pass the very check meant to catch bad wiring.
  return { target: candidate, isFile: exists(candidate) };
}

function exists(file) {
  try {
    return statSync(file).isFile();
  } catch {
    return false;
  }
}

const violations = [];

function report(file, line, ruleId, message) {
  violations.push({ where: `${rel(file)}:${line}`, ruleId, message });
}

const files = walk(SRC);

for (const file of files) {
  const source = readFileSync(file, 'utf8');
  const code = stripComments(source);
  const layer = layerOf(file);

  if (layer === null) {
    // An ambient declaration file declares types for the compiler; it is not a
    // module belonging to a layer, so it is exempt from classification.
    if (!file.endsWith('.d.ts')) {
      report(
        file,
        1,
        'unknown-layer',
        `${rel(file)} is not inside a known layer (${LAYERS.join(', ')}) and is not src/main.ts`,
      );
    }
    continue;
  }

  // --- Layer boundaries -----------------------------------------------------
  const permitted = ALLOWED[layer];

  if (!permitted) {
    report(file, 1, 'unknown-layer', `layer "${layer}" has no entry in ALLOWED`);
  } else {
    for (const { specifier, index } of findImports(code)) {
      const local = isLocalCode(file, specifier);

      if (local === null) continue;

      // A specifier that does not resolve to a file is either an asset or a typo.
      // Both are reported: a mistyped path should not silently pass.
      if (!local.isFile) {
        report(file, lineAt(code, index), 'unresolved-import', `"${specifier}" does not resolve to a file`);
        continue;
      }

      const targetLayer = layerOf(local.target);

      if (targetLayer === null) {
        report(
          file,
          lineAt(code, index),
          'import-outside-src',
          `"${specifier}" escapes src/ into ${rel(local.target)}`,
        );
        continue;
      }

      if (!permitted.includes(targetLayer)) {
        report(
          file,
          lineAt(code, index),
          'layer-boundary',
          `${layer}/ may not import ${targetLayer}/ ("${specifier}") — allowed: ${permitted.join(', ')}`,
        );
      }
    }
  }

  // --- Banned APIs ----------------------------------------------------------
  for (const rule of BANNED_APIS) {
    if (rule.layers !== null && rule.layers.includes(layer)) continue;

    for (const match of code.matchAll(new RegExp(rule.api.source, 'g'))) {
      report(file, lineAt(code, match.index), rule.id, `${match[0]} — ${rule.reason}`);
    }
  }
}

// --- Inline event handlers in markup ---------------------------------------
for (const name of readdirSync(ROOT)) {
  if (extname(name) !== '.html') continue;

  const html = readFileSync(join(ROOT, name), 'utf8');

  // script and style bodies are code, not markup attributes: blank them out first.
  const markup = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/<style\b[\s\S]*?<\/style>/gi, (m) => m.replace(/[^\n]/g, ' '));

  for (const match of markup.matchAll(/<[a-zA-Z][^>]*?\son[a-zA-Z]+\s*=\s*["'][^"']*["']/g)) {
    const at = markup.slice(0, match.index).match(/\n/g);
    report(join(ROOT, name), (at ? at.length : 0) + 1, 'no-inline-handler', match[0].trim());
  }
}

// --- Report -----------------------------------------------------------------
const known = [];
const fresh = [];

for (const violation of violations) {
  const key = `${violation.where}:${violation.ruleId}`;
  (KNOWN.has(key) ? known : fresh).push(violation);
}

const stale = [...KNOWN].filter(
  (key) => !violations.some((v) => `${v.where}:${v.ruleId}` === key),
);

if (fresh.length > 0) {
  console.error(`\ncheck-imports: ${fresh.length} violation(s)\n`);

  for (const v of fresh) {
    console.error(`  ${v.where}  [${v.ruleId}]  ${v.message}`);
  }

  console.error('');
}

if (known.length > 0) {
  console.warn(`check-imports: ${known.length} known violation(s) tolerated\n`);

  for (const v of known) {
    console.warn(`  ${v.where}  [${v.ruleId}]  ${v.message}`);
  }

  console.warn('');
}

if (stale.length > 0) {
  console.error(
    `check-imports: ${stale.length} KNOWN entr(y|ies) no longer match any violation.\n` +
      'A KNOWN entry that no longer applies must be deleted in the same commit that\n' +
      'fixed it, otherwise the list only ever grows:\n',
  );

  for (const key of stale) console.error(`  delete KNOWN entry: "${key}"`);

  console.error('');
}

const failed = fresh.length > 0 || stale.length > 0;

console.log(
  failed
    ? 'check-imports: FAIL'
    : `check-imports: OK — ${files.length} file(s) scanned, no layer or banned-API violations` +
      (known.length > 0 ? `, ${known.length} known` : ''),
);

process.exit(failed ? 1 : 0);