# `src/features/` — one folder per screen

**This folder is empty of code.** Nothing here is implemented. Each screen folder
appears in the repository with a README like this one, and is filled in by whoever picks
up its task. A folder existing does not mean the screen is built — check `model.ts` and
`view.ts` for that.

## Layout contract

Every feature is exactly four files. Depth never exceeds two levels.

```
features/<name>/
├── model.ts         pure game rules for this screen. No DOM, no network.
├── model.test.ts    every input literal — never Math.random, never the clock
├── view.ts          DOM only. Imports its own model.ts. Nothing else.
└── <name>.css       imported by view.ts, never added to src/style.css
```

## Rules the checker enforces for you

Run `npm run check`. You do not have to remember these:

| rule | what it stops |
| --- | --- |
| `cross-feature` | one feature importing another. Shared state travels through `RunState`, passed from `main.ts`. |
| `no-dom-in-pure-zone` | `document` or `window` in `model.ts`, `types.ts`, `constants.ts` or a test |
| `purity-inversion` | `model.ts` importing its own `view.ts` |

Two rules are conventions, not enforced — do not forget them:

- **No `index.ts` barrel files.** Import the concrete path: `from '../act/view'`.
  A barrel is the one file every feature edits and nobody owns.
- **Feature CSS is imported by your own `view.ts`.** Never add a line to
  `src/style.css` — that file is the landing page's, and it becomes a merge magnet.

## Screens in scope before the Nov 8 feature freeze

| folder | screen | task |
| --- | --- | --- |
| `landing-site/` | choose a landing region | TASK-028 |
| `base/` | establish the outpost | TASK-029 |
| `act/` | advance a sol, resolve a mission | TASK-030 |
| `debrief/` | explain the outcome | TASK-031 |

**There is deliberately no `plan/`.** The act screen is built without a planning phase —
confirmed by the project owner and recorded as decision D-018. Do not add one unasked.

## Start here

`landing-site/` is the best first task: one folder, no dependency on the resource model,
and its rules are fully specified by the project README.

The pure simulation those screens share — five resources with per-sol drain, advancing a
sol, and the `RunState` shape — lives in `src/sim/resources.ts`, `src/sim/sol.ts` and
`src/sim/run.ts`. **Those do not exist yet either.**