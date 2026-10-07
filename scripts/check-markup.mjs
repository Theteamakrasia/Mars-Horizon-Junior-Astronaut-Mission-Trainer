#!/usr/bin/env node
/**
 * Markup checks that `check-imports.mjs` cannot do, because they are about the
 * HTML rather than the module graph.
 *
 * All of these exist because the briefing screen shipped broken while every other
 * check passed: the naming menu painted on top of it, so the briefing showed its
 * heading and nothing responded. Neither the type checker nor the zone checker
 * can see that — it is a question about layout and the DOM, not about types or
 * imports.
 *
 * Run with `npm run check`.
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const raw = readFileSync(join(ROOT, 'index.html'), 'utf8');

/** Remove comments so a commented-out block cannot trip a structural rule. */
const markup = raw.replace(/<!--[\s\S]*?-->/g, (match) => match.replace(/[^\n]/g, ' '));

const problems = [];

function lineOf(index) {
  let line = 1;
  for (let i = 0; i < index && i < markup.length; i++) {
    if (markup[i] === '\n') line++;
  }
  return line;
}

function fail(index, message) {
  problems.push({ line: lineOf(index), message });
}

/** Openings and closings of one element, so nesting can be checked properly. */
function spanOf(id) {
  const open = new RegExp(`<(\\w+)[^>]*\\bid="${id}"[^>]*>`, 'i').exec(markup);
  if (!open) return null;

  const tag = open[1];
  const after = open.index + open[0].length;

  // Walk forward counting this tag, so a self-closing or void element is handled
  // and a nested tag of the same name cannot end the span early.
  const scanner = new RegExp(`<${tag}\\b|</${tag}\\s*>`, 'gi');
  scanner.lastIndex = after;

  let depth = 1;
  let step = scanner.exec(markup);
  while (step !== null) {
    depth += step[0].startsWith('</') ? -1 : 1;
    if (depth === 0) return { start: open.index, end: scanner.lastIndex, tag };
    step = scanner.exec(markup);
  }

  // Unbalanced; treat as running to the end so containment checks stay conservative.
  return { start: open.index, end: markup.length, tag };
}

// --- Rule 1: exactly one #landing wrapper ------------------------------------
const landingOpen = (markup.match(/<div id="landing">/g) ?? []).length;

if (landingOpen !== 1) {
  fail(markup.indexOf('id="landing"'), `expected exactly one #landing wrapper, found ${landingOpen}`);
}

const landing = spanOf('landing');

// --- Rule 2: every mounted screen exists, and is not inside #landing ---------
const registry = readFileSync(join(ROOT, 'src', 'ui', 'registry.ts'), 'utf8');
const mounts = [...registry.matchAll(/^\s*\w+:\s*'#([\w-]+)',/gm)].map((match) => match[1]);

if (mounts.length === 0) {
  fail(0, 'no screen mounts found in src/ui/registry.ts — the parse is broken, not the app');
}

for (const id of mounts) {
  const index = markup.search(new RegExp(`\\bid="${id}"`, 'i'));

  if (index < 0) {
    fail(0, `registry mounts '#${id}' but index.html has no element with that id`);
    continue;
  }

  if (landing !== null && index > landing.start && index < landing.end) {
    fail(index, `#${id} sits inside #landing and would be hidden along with the landing page`);
  }
}

/*
  --- Rule 3: no two screens overlap in the document.

  Every routed screen is position:fixed at the same z-index, so one screen
  covering another is purely a question of order in the markup. `hidden` is set by
  main.ts at runtime, which means the ordering here is the only thing preventing
  a static markup mistake from putting two screens on top of each other.
*/
const positions = mounts.map((id) => ({ id, index: markup.search(new RegExp(`\\bid="${id}"`, 'i')) }));
positions.sort((a, b) => a.index - b.index);

/*
  The layers #landing must contain. Mixed forms on purpose, because the landing
  page itself mixes them: the script resolves #starfield and #astronaut by id,
  while the stage and the vignette are only ever found by class.
*/

/*
  --- Rule 4: the `hidden` attribute must be able to hide a screen at all.

  This is the bug that cost the most time: every routed screen sets
  `display: flex`, which beats the browser's `[hidden] { display: none }`, so
  `element.hidden = true` did nothing and all screens rendered on top of each
  other. Verified by injecting the removal and confirming this fails.
*/
const baseCss = readFileSync(join(ROOT, 'src', 'styles', 'base.css'), 'utf8');

if (!/\[hidden\]\s*\{[^}]*display:\s*none\s*!important/s.test(baseCss)) {
  fail(0, 'base.css has no `[hidden] { display: none !important }` rule — screens that set `display` cannot be hidden by the `hidden` attribute, so they render on top of each other');
}

// --- Rule 5: every data hook a view queries is present -----------------------
const VIEWS = ['src/features/naming/view.ts', 'src/features/briefing/view.ts'];

for (const file of VIEWS) {
  const source = readFileSync(join(ROOT, file), 'utf8');
  const hooks = new Set([...source.matchAll(/\[data-([\w-]+)\]/g)].map((m) => `data-${m[1]}`));

  for (const hook of hooks) {
    if (!markup.includes(hook)) {
      fail(0, `${file} queries ${hook} but index.html does not contain it — the screen would throw on mount`);
    }
  }
}

/**
 * Whether `value`, a class attribute's contents, contains `name` as a whole word.
 *
 * Split on whitespace rather than pattern-matched. Two earlier attempts were
 * wrong: a plain substring accepted `class="stage-oops"`, and a regex using `^`
 * inside a group silently never matched at all, because `^` anchors to the start
 * of the whole input, not to the position inside the group.
 */
function hasClass(value, name) {
  return value.split(/\s+/).includes(name);
}

/** Every class name used anywhere inside an element's markup. */
function classNamesIn(markupSlice) {
  return [...markupSlice.matchAll(/class="([^"]*)"/g)].flatMap((match) =>
    match[1].split(/\s+/).filter(Boolean),
  );
}

/*
  The layers #landing must keep, in the form the code finds them: #starfield and
  #astronaut by id, the stage and the vignette by class.

  Hard-coded on purpose. Each is named in three places — markup, main.ts and
  src/styles/*.css — so a rename has to break this check rather than quietly drop
  a layer off the landing page.
*/
const LANDING_IDS = ['starfield', 'astronaut'];
const LANDING_CLASSES = ['stage', 'vignette'];

// --- Rule 5: the landing wrapper holds exactly the landing layers -------------
if (landing !== null) {
  const inside = markup.slice(landing.start, landing.end);
  const ids = [...inside.matchAll(/\bid="([\w-]+)"/g)].map((m) => m[1]);

  for (const id of mounts) {
    if (ids.includes(id)) {
      fail(landing.start, `#${id} is inside #landing`);
    }
  }

  const insideIds = [...inside.matchAll(/\bid="([\w-]+)"/g)].map((m) => m[1]);
  const insideClasses = classNamesIn(inside);

  const missing = [
    ...LANDING_IDS.filter((id) => !insideIds.includes(id)),
    ...LANDING_CLASSES.filter((name) => !hasClass(insideClasses.join(' '), name)),
  ];

  if (missing.length > 0) {
    fail(landing.start, `#landing is missing expected layer(s): ${missing.join(', ')}`);
  }
}

// --- Report -----------------------------------------------------------------
if (problems.length > 0) {
  console.error(`\ncheck-markup: ${problems.length} problem(s)\n`);

  for (const problem of problems) {
    console.error(`  index.html:${problem.line || 1}  ${problem.message}`);
  }

  console.error('');
  process.exit(1);
}

console.log(
  `check-markup: OK — ${mounts.length} routed screen(s) (${positions
    .map((p) => p.id)
    .join(', ')}), all inside no wrapping element and landing scoped correctly`,
);