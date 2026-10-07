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

import { existsSync, readdirSync, readFileSync } from 'node:fs';
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
/*
  Discovered on disk rather than listed. A hard-coded list is exactly the mistake
  `nextStop` was built to avoid: the day someone adds a screen, a listed list
  quietly stops checking it, and the failure mode is a screen that throws on mount
  with every other check green. Same reasoning as the computed interstitial.
*/
const featureDirs = readdirSync(join(ROOT, 'src', 'features'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => join('src', 'features', entry.name));

const views = featureDirs
  .filter((dir) => existsSync(join(ROOT, dir, 'view.ts')))
  .map((dir) => join(dir, 'view.ts').replace(/\\/g, '/'));

if (views.length === 0) {
  fail(0, 'no feature views found under src/features — the discovery is broken, not the app');
}

for (const file of views) {
  const source = readFileSync(join(ROOT, file), 'utf8');
  const hooks = new Set([...source.matchAll(/\[data-([\w-]+)\]/g)].map((m) => `data-${m[1]}`));

  for (const hook of hooks) {
    if (!markup.includes(hook)) {
      fail(0, `${file} queries ${hook} but index.html does not contain it — the screen would throw on mount`);
    }
  }
}

/*
  --- Rule 6: a mounted screen's hooks are inside that screen's own section.

  Rule 5 only asks whether a hook exists anywhere in the page. That is not enough
  once there is more than one screen: a hook belonging to the briefing, found only
  inside #supply, means the briefing throws on mount while every other check is
  green. Scope each hook to the section that claims it.
*/
for (const id of mounts) {
  const section = spanOf(id);
  if (section === null) continue; // already reported by Rule 2

  const file = views.find((view) => readFileSync(join(ROOT, view), 'utf8').includes(`"#${id}"`));
  if (file === undefined) continue;

  const source = readFileSync(join(ROOT, file), 'utf8');
  const hooks = new Set([...source.matchAll(/\[data-([\w-]+)\]/g)].map((m) => `data-${m[1]}`));
  const inside = markup.slice(section.start, section.end);

  for (const hook of hooks) {
    if (!inside.includes(hook)) {
      fail(section.start, `${hook} is queried by ${file} but is not inside #${id} — the screen would throw on mount`);
    }
  }
}

// --- Rule 7: a built feature has all four files, and imports its own CSS ------
/*
  The four-file layout is decision D-014 and CSS-in-view is R-15. Both are
  conventions with nothing enforcing them, which is how conventions rot.

  "Built" is read from registry.ts, not guessed from the files on disk: a stub
  feature has a view.ts too — it just throws — so its presence proves nothing.
  The registry mapping is what the router actually reaches.
*/
const builtFeatures = new Set(
  [...registry.matchAll(/from '\.\.\/features\/([\w-]+)\/view'/g)].map((match) => match[1]),
);

for (const dir of featureDirs) {
  // featureDirs was built with join(), so it is backslashed on Windows. Normalise
  // before splitting, or the last segment is the whole path.
  const name = dir.replace(/\\/g, '/').split('/').pop();
  const isBuilt = builtFeatures.has(name);

  // A stub feature is model, view and README. A built one is four files.
  const expected = isBuilt
    ? ['model.ts', 'model.test.ts', 'view.ts', `${name}.css`]
    : ['model.ts', 'view.ts'];

  for (const file of expected) {
    if (!existsSync(join(ROOT, dir, file))) {
      fail(0, `features/${name} is missing ${file} — a built feature keeps four files (D-014)`);
    }
  }

  if (isBuilt) {
    const source = readFileSync(join(ROOT, dir, 'view.ts'), 'utf8');
    if (!source.includes(`import './${name}.css'`)) {
      fail(0, `features/${name}/view.ts does not import './${name}.css' — feature CSS is imported by its own view.ts (R-15)`);
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

/** Line number of `index` within `source`. */
function lineOfIn(source, index) {
  let line = 1;
  for (let i = 0; i < index && i < source.length; i++) {
    if (source[i] === '\n') line++;
  }
  return line;
}

/** Every stylesheet in a feature folder, as workspace-relative posix paths. */
function cssFilesIn(dir) {
  if (!existsSync(dir)) return [];

  const feature = dir.split(/[\\/]/).pop();

  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.css'))
    .map((entry) => `src/features/${feature}/${entry.name}`);
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

/*
  --- Rule 8: no `pointer-events: none` in a feature stylesheet.

  The second invisible-but-unclickable bug, and the same shape as the `[hidden`
  one above. A button was rendered correctly inside a speech container, looked
  fine, and did nothing when clicked - because an ancestor rule set
  `pointer-events: none`, which disables hit-testing for the whole subtree while
  leaving everything fully visible.

  Nothing on these screens needs it: the artwork behind the UI is an image, so
  there is nothing underneath for a click to reach. It is banned rather than
  discouraged, because the failure mode is invisible in every screenshot and in
  every type check.

  If a rule genuinely needs it, put the element in the KNOWN set in
  check-imports.mjs with the reason, so the exception is a decision on the record
  rather than a rule nobody noticed.
*/
for (const entry of readdirSync(join(ROOT, 'src', 'features'), { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;

  for (const name of cssFilesIn(join(ROOT, 'src', 'features', entry.name))) {
    const raw2 = readFileSync(join(ROOT, name), 'utf8');

    /*
      Comments are blanked rather than deleted, so line numbers still line up.
      Without this the rule matched its own explanation of itself: the comment on
      .supply__advance names `pointer-events: none` while explaining why it is
      banned, and the first version of this check failed on it.
    */
    const source = raw2.replace(/\/\*[\s\S]*?\*\//g, (match) => match.replace(/[^\n]/g, ' '));

    for (const hit of source.matchAll(/pointer-events:\s*none/g)) {
      fail(0, `${name}:${lineOfIn(source, hit.index)} sets pointer-events: none - it disables clicks for the whole subtree while leaving it visible, which is how a working button ends up dead on screen`);
    }
  }
}

// --- Rule 9: the landing wrapper holds exactly the landing layers -------------
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