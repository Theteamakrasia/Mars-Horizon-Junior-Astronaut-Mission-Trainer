# `src/features/` — one folder per screen

Every journey screen is built. The folder layout is the map: open the screen's folder
and its `README.md` says what it is meant to contain. A folder existing still does not
mean the screen is complete — check `model.ts` and `view.ts` for that — but there are
no stubs left.

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

## Screens

| folder | screen | state |
| --- | --- | --- |
| `naming/` | main menu, name entry, rotating stage | built (TASK-043) |
| `briefing/` | mission briefing, one beat at a time | built |
| `supply/` | ration check | built |
| `launch/` | launch reel and parts tour | built |
| `interior/` | exploration rooms | built |
| `landing-site/` | choose a landing region | built (TASK-028) |
| `landing-cinematic/` | the landing film, between the map and the outpost | built (TASK-108) |
| `base/` | establish the outpost | built (TASK-029) |
| `act/` | advance a sol, resolve a crisis | built (TASK-030) |
| `debrief/` | explain the outcome | built (TASK-031) |
| `encyclopedia/` | equipment reference, reached from the game menu | built |

**There is deliberately no `plan/`.** The act screen is built without a planning phase —
confirmed by the project owner and recorded as decision D-018. Do not add one unasked.

## Start here

All nine journey screens are built plus the `encyclopedia/` reference, and the pure
simulation behind them is complete:
`src/sim/resources.ts`, `src/sim/sol.ts`, `src/sim/run.ts` and `src/sim/forecast.ts`.
Pick up an open task from `docs/team/tasks.md`; every journey screen is wired into
`src/ui/registry.ts`, which is the only file permitted to import a feature's `view.ts`.
