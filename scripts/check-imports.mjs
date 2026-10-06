#!/usr/bin/env node
/**
 * Architecture and banned-API checker for Mars Horizon.
 *
 * Run with `npm run check`. Exits 1 on any violation, 0 otherwise.
 *
 * Every source file is classified into a *zone* — its layer plus, for features,
 * its role — and each zone has an explicit allow-list of zones it may import.
 * Anything not listed is a violation, so adding a layer or a role means adding
 * it here deliberately rather than discovering it is allowed.
 *
 *   sim/            pure, deterministic, tested. No DOM, no network.
 *   data/           the ONLY zone permitted to touch the network
 *   dom/            landing-page side effects: rAF, DOM writes, pointer events
 *   ui/             cross-screen browser glue. No framework, so no components.
 *   features/<f>/
 *     model.ts      pure logic for one feature. No DOM, no network.
 *     view.ts       one feature's DOM. May import its own model.ts.
 *   main.ts         composition root. Exempt from layer rules, not from banned APIs.
 *
 * Two invariants this file exists to protect:
 *   1. sim/ and each feature's model.ts stay pure, so the game can be unit tested
 *      the way drift.ts and deform.ts already are.
 *   2. one feature never imports another. State crosses screens through RunState,
 *      passed explicitly from main.ts — not through module imports.
 *
 * Every violation prints file:line, because a rule that cannot point at the
 * offending character is a rule nobody can act on.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');

/** Every zone, for documentation and validation. */
const ZONES = ['sim', 'data', 'dom', 'ui', 'feature-model', 'feature-view', 'entry'];

/**
 * Which zones each zone may import from.
 *
 * A zone may always import its own — sibling modules within a zone are the
 * normal case — plus the zones listed beneath it.
 *
 * feature-view may import any feature-model, because a view legitimately needs
 * its own model. "Any" is then narrowed to "its own" by the `cross-feature`
 * rule, because a zone table alone cannot express "same feature but not a
 * different one".
 */
const ALLOWED = {
  sim: ['sim'],
  data: ['data', 'sim'],
  dom: ['dom', 'data', 'sim'],
  ui: ['ui', 'dom', 'data', 'sim'],
  'feature-model': ['feature-model', 'sim'],
  'feature-view': ['feature-view', 'feature-model', 'ui', 'dom', 'data', 'sim'],
  entry: [...ZONES],
};

/**
 * Pure zones: no DOM, no network. A violation here is the expensive kind,
 * because it is invisible until someone tries to test the code.
 */
const PURE_ZONES = new Set(['sim', 'feature-model']);

/** Zones allowed to reference `document` or `window`. */
const DOM_ZONES = new Set(['dom', 'ui', 'feature-view', 'entry']);

/** Zones allowed to perform network I/O. */
const NETWORK_ZONES = new Set(['data']);

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

/** Blocking browser dialogs, banned everywhere with no exceptions. */
const ALWAYS_BANNED = [
  {
    id: 'no-alert',
    api: /\b(alert|confirm|prompt)\s*\(/,
    reason: 'blocking browser dialogs have no place in a game for children; route through ui/',
  },
];

/** Network I/O outside data/. */
const NETWORK_APIS = /\b(fetch|XMLHttpRequest|WebSocket|EventSource|navigator\.sendBeacon)\b/;

/** DOM globals. Matched with word boundaries so prose like "documented" never trips it. */
const DOM_APIS = /\b(document|window)\b/;

/** Extensions treated as source. */
const CODE_EXT = new Set(['.ts', '.tsx', '.mts', '.js', '.mjs', '.jsx']);

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

/**
 * Filenames inside a feature that are pure by convention.
 *
 * Recognised names matter: a pure file must be able to import its siblings, and
 * the checker can only tell a pure file from a DOM-bearing one by name. Anything
 * not listed here is treated as view-like, so the rule errs toward "put shared
 * pure values in one of these names, or in sim/".
 */
const PURE_BASENAMES = new Set(['model.ts', 'types.ts', 'constants.ts']);

/** Classify a file into its zone and, for features, its owning feature name. */
function zoneOf(file) {
  const r = rel(file);

  if (r === 'src/main.ts') return { zone: 'entry', feature: null };
  if (r.endsWith('.d.ts')) return { zone: null, feature: null }; // ambient types, exempt

  const feature = /^src\/features\/([^/]+)\//.exec(r);
  if (feature) {
    const name = feature[1];
    const base = r.slice(r.lastIndexOf('/') + 1);
    const pure = PURE_BASENAMES.has(base) || base.endsWith('.test.ts');
    return { zone: pure ? 'feature-model' : 'feature-view', feature: name };
  }

  const layer = /^src\/([^/]+)\//.exec(r);
  return { zone: layer ? layer[1] : null, feature: null };
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
 * Remove comments so prose mentioning `document` or `fetch` is not mistaken for
 * code calling them. Block comments first, then line comments, so a `//` inside a
 * block comment cannot split it incorrectly.
 */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, ' '));
}

/**
 * Every module specifier in a file, with its offset. Handles multi-line
 * `import {...} from '...'`, bare side-effect imports, re-exports, and `import()`.
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

/**
 * Resolve a specifier to a local code file, or null when it is not one.
 *
 * A relative non-asset specifier that does not resolve is returned with
 * isFile:false so it is reported as `unresolved-import` rather than silently
 * skipped. Silently ignoring it would let a typo pass the very check meant to
 * catch bad wiring.
 */
function isLocalCode(fromFile, specifier) {
  if (!specifier.startsWith('.')) return null; // bare specifier: external package

  const ext = extname(specifier);

  // A non-code extension is an asset the bundler owns — CSS, PNG, SVG.
  if (ext !== '' && !CODE_EXT.has(ext)) return null;

  const target = resolve(dirname(fromFile), specifier);
  const candidate = CODE_EXT.has(extname(target)) ? target : `${target}.ts`;

  return { target: candidate, isFile: existsSync(candidate) };
}

const violations = [];

function report(file, line, ruleId, message) {
  violations.push({ where: `${rel(file)}:${line}`, ruleId, message });
}

const files = walk(SRC);

for (const file of files) {
  const source = readFileSync(file, 'utf8');
  const code = stripComments(source);
  const { zone, feature } = zoneOf(file);

  if (zone === null) {
    if (!rel(file).startsWith('src/') || rel(file) !== 'src/main.ts') {
      if (!rel(file).endsWith('.d.ts')) {
        report(
          file,
          1,
          'unknown-layer',
          `${rel(file)} is not inside a known layer (sim, data, dom, ui, features/) and is not src/main.ts`,
        );
      }
    }
    continue;
  }

  const permitted = ALLOWED[zone];

  if (!permitted) {
    report(file, 1, 'unknown-layer', `zone "${zone}" has no entry in ALLOWED`);
  } else {
    for (const { specifier, index } of findImports(code)) {
      const local = isLocalCode(file, specifier);

      if (local === null) continue;

      if (!local.isFile) {
        report(
          file,
          lineAt(code, index),
          'unresolved-import',
          `"${specifier}" does not resolve to a file`,
        );
        continue;
      }

      const target = zoneOf(local.target);

      if (target.zone === null) {
        report(
          file,
          lineAt(code, index),
          'import-outside-src',
          `"${specifier}" escapes src/ into ${rel(local.target)}`,
        );
        continue;
      }

      // Intra-feature imports are governed by role, not by the zone table.
      //
      // A feature's files may import each other freely — model.ts needs its own
      // types.ts, view.ts needs its own model.ts — so a zone table is the wrong
      // tool here and would produce false positives on any file the role heuristic
      // does not recognise. The single exception is a purity inversion: a model
      // importing a view would let the DOM leak into pure logic.
      if (feature !== null && target.feature !== null) {
        if (feature === target.feature) {
          if (zone === 'feature-model' && target.zone === 'feature-view') {
            report(
              file,
              lineAt(code, index),
              'purity-inversion',
              `features/${feature}/model.ts may not import its own view ("${specifier}") — that would pull the DOM into pure logic; move shared values into the model`,
            );
          }
          continue;
        }

        report(
          file,
          lineAt(code, index),
          'cross-feature',
          `features/${feature}/ may not import features/${target.feature}/ ("${specifier}") — pass shared state through RunState from main.ts instead`,
        );
        continue;
      }

      if (!permitted.includes(target.zone)) {
        report(
          file,
          lineAt(code, index),
          'layer-boundary',
          `${zone}/ may not import ${target.zone}/ ("${specifier}") — allowed: ${permitted.join(', ')}`,
        );
      }
    }
  }

  // --- Banned APIs ----------------------------------------------------------
  for (const rule of ALWAYS_BANNED) {
    for (const match of code.matchAll(new RegExp(rule.api.source, 'g'))) {
      report(file, lineAt(code, match.index), rule.id, `${match[0]} — ${rule.reason}`);
    }
  }

  const purityNote = PURE_ZONES.has(zone)
    ? 'sim/ and features/*/model.ts must stay pure so the game stays unit testable'
    : null;

  if (!DOM_ZONES.has(zone)) {
    for (const match of code.matchAll(new RegExp(DOM_APIS.source, 'g'))) {
      report(
        file,
        lineAt(code, match.index),
        'no-dom-in-pure-zone',
        `${match[0]} — ${purityNote}`,
      );
    }
  }

  if (!NETWORK_ZONES.has(zone)) {
    for (const match of code.matchAll(new RegExp(NETWORK_APIS.source, 'g'))) {
      report(
        file,
        lineAt(code, match.index),
        'no-network-outside-data',
        `${match[0]} — all network access belongs to data/, so failures and fallbacks are handled in one place`,
      );
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