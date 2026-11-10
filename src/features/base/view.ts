/**
 * The base screen: spend a fixed number of build points on modules before the
 * landing, with a live preview of what the build will do.
 *
 * Owns the DOM only. Placement rules and the preview come from ./model, and the
 * preview runs the real sol step, so it cannot promise what the sim will not
 * deliver.
 *
 * Space-weather data is fetched here (through `dom/forecastLoader`) so the
 * forecast warning is on screen before the player commits, which is the README's
 * first lesson: forecast before you act.
 *
 * The layout follows the game-loop frame (`66:14`): the outpost on Mars on the
 * left, the module catalogue on the right, five resource cards above.
 */

import { loadForecast, type LoadedForecast } from '../../dom/forecastLoader';
import { h } from '../../dom/h';
import { factFor } from '../../data/nasaGallery';
import { createForecast, type ForecastEvent } from '../../sim/forecast';
import { newRun, startOutpost, withState, type RunState } from '../../sim/run';
import { regionById, siteScore } from '../../sim/regions';
import { gamePanel, gameScreen, gameWorld, moduleArt, moduleFigures, type SignalCard } from '../../ui/gameLoop';
import { nextStop } from '../../ui/registry';
import { navigate } from '../../ui/router';

import {
  BUDGET_NONE,
  BUILDABLE,
  CORE_MODULES,
  addModule,
  canPlace,
  extraSlots,
  pointsLeft,
  previewFor,
  previewSummary,
  removeModule,
  upcomingWarnings,
  type ModuleKind,
} from './model';

import '../../styles/game-loop.css';
import './base.css';

/** What the crew calls each module on the "already on your lander" card. */
const SHORT_NAME: Readonly<Record<ModuleKind, string>> = {
  habitat: 'Home',
  'life-support': 'Air',
  'solar-array': 'Solar',
  batteries: 'Battery',
  greenhouse: 'Food',
  'ice-miner': 'Ice',
  'regolith-shield': 'Shield',
  'nuclear-unit': 'Nuclear',
};

export function mountBase(
  mount: HTMLElement,
  run: RunState | null,
  setRun: (next: RunState | null) => void,
): () => void {
  const start = run ?? newRun('', 'Astronaut');
  const regionId = start.regionId;
  const region = regionById(regionId);
  let extras: readonly ModuleKind[] = start.modules.length > 0 ? start.modules.slice(CORE_MODULES.length) : [];
  let loaded: LoadedForecast | null = null;
  let disposed = false;
  const controller = new AbortController();

  /** The forecast the screen is working from: live data once it arrives. */
  function forecast(): readonly ForecastEvent[] {
    return loaded?.forecast ?? start.forecast;
  }

  /** The world's forecast card: the next few things that will happen. */
  function forecastSignal(): SignalCard {
    const events = upcomingWarnings(forecast());

    if (loaded === null && start.forecast.length === 0) {
      return { icon: '🌤', kicker: 'Forecast', text: 'Reading live space weather…' };
    }

    return {
      icon: '🌤',
      kicker: 'Coming up',
      text: events.map((event) => `Sol ${event.sol}: ${event.summary}`).join(' · '),
      detail: loaded?.detail,
    };
  }

  function render(focusKey?: string): void {
    const focusable = new Map<string, HTMLElement>();
    const summary = previewSummary(extras, regionId);
    const lines = previewFor(extras, regionId);
    const warning = lines.find((line) => line.tone !== 'ok') ?? null;

    const daysLabel = (days: number, steady: string): string => (Number.isFinite(days) ? `${days} sols` : steady);

    const hud = [
      { icon: '⚡', label: 'Night power', value: `${summary.nightHours} / 12 h`, tone: summary.nightHours < 12 ? ('warn' as const) : ('ok' as const) },
      { icon: '🫧', label: 'Air', value: 'Ready' },
      { icon: '💧', label: 'Water', value: daysLabel(summary.waterDays, 'Recycled'), tone: summary.waterDays < 12 ? ('warn' as const) : ('ok' as const) },
      { icon: '🍞', label: 'Food', value: daysLabel(summary.foodDays, 'Grown'), tone: summary.foodDays < 12 ? ('warn' as const) : ('ok' as const) },
      { icon: '🛡️', label: 'Shield', value: `${summary.shielding} / 100`, tone: summary.shielding < 40 ? ('warn' as const) : ('ok' as const) },
    ];

    const signals: SignalCard[] = [
      {
        icon: '✓',
        kicker: 'Already on your lander',
        text: CORE_MODULES.map((kind) => SHORT_NAME[kind]).join(' · '),
      },
      warning === null
        ? { icon: '✓', tone: 'good', kicker: 'This build', text: 'It stays steady through a calm sol.' }
        : { icon: '⚡', tone: 'warn', kicker: warning.label, text: warning.text },
      forecastSignal(),
    ];

    const world = gameWorld({
      label: region ? region.name : 'Mars',
      weather: 'Clear skies',
      crew: "Hi, explorer! Let's build a home on Mars.",
      signals,
      figures: moduleFigures([...CORE_MODULES, ...extras]),
    });

    // ---- The catalogue.
    const budget = h(
      'div',
      { class: 'gl__budget' },
      h('span', null, h('span', { 'aria-hidden': 'true', text: '✦ ' }), `${pointsLeft(extras)} points left`),
      h('span', { text: `${extras.length} / ${extraSlots(regionId)} extras` }),
    );

    const cards = h('div', { class: 'gl__grid' });

    for (const spec of BUILDABLE) {
      const have = extras.filter((kind) => kind === spec.kind).length;
      const placement = canPlace(spec.kind, extras, regionId);
      const add = h('button', { class: 'gl__step gl__step--add', type: 'button', 'aria-label': `Add ${spec.name}`, disabled: !placement.ok }, '+');
      const remove = h('button', { class: 'gl__step', type: 'button', 'aria-label': `Remove ${spec.name}`, disabled: have === 0 }, '−');

      focusable.set(`add-${spec.kind}`, add);
      focusable.set(`remove-${spec.kind}`, remove);

      add.addEventListener('click', () => {
        extras = addModule(extras, spec.kind, regionId);
        render(`add-${spec.kind}`);
      });
      remove.addEventListener('click', () => {
        extras = removeModule(extras, spec.kind);
        render(`remove-${spec.kind}`);
      });

      cards.append(
        h(
          'article',
          { class: 'gl__card' },
          h(
            'div',
            { class: 'gl__card-head' },
            h('img', { class: 'gl__card-img', src: moduleArt(spec.kind), alt: '' }),
            h('p', { class: 'gl__card-name', text: spec.name }),
            h('span', { class: 'gl__cost', text: `✦ ${spec.cost}` }),
          ),
          h('p', { class: 'gl__card-line', text: spec.gives }),
          h('p', { class: 'gl__card-line', text: spec.needs }),
          h('div', { class: 'gl__stepper' }, remove, h('span', { class: 'gl__count', text: String(have) }), add),
          !placement.ok && have === 0 ? h('p', { class: 'gl__card-why', text: placement.reason }) : null,
        ),
      );
    }

    const launch = h(
      'button',
      { class: 'gl__btn gl__btn--primary gl__btn--start', type: 'button' },
      'Land & start sol 1',
      h('span', { class: 'gl__btn-arrow', 'aria-hidden': 'true', text: '→' }),
    );

    launch.addEventListener('click', () => {
      const forecastNow = forecast();
      const prepared = withState(start, {
        forecast: forecastNow.length > 0 ? forecastNow : createForecast([], Date.now(), siteScore(regionId).dust),
      });
      const landed = startOutpost(prepared, [...CORE_MODULES, ...extras]);

      setRun(landed);
      navigate(nextStop('base') ?? 'act');
    });

    const panel = gamePanel({
      kicker: 'Build your outpost',
      title: 'What will you bring?',
      sub: 'Choose extras to keep your crew safe.',
      body: [
        budget,
        cards,
        h('p', { class: 'gl__note', text: `NASA fact · ${factFor(start.sol + regionId.length).text} (${factFor(start.sol + regionId.length).credit})` }),
      ],
      footer: [launch, h('p', { class: 'gl__note', text: BUDGET_NONE })],
    });

    mount.replaceChildren(gameScreen({ hud, world, panel, variant: 'gl--base', headerSub: 'BUILD YOUR OUTPOST', onLeave: () => navigate('naming') }));

    if (focusKey !== undefined) focusable.get(focusKey)?.focus();
  }

  render();

  void loadForecast(controller.signal, Date.now(), siteScore(regionId).dust).then((result) => {
    if (disposed) return;

    loaded = result;
    setRun(withState(start, { forecast: result.forecast }));
    render();
  });

  return () => {
    disposed = true;
    controller.abort();
    mount.replaceChildren();
  };
}
