/**
 * The base screen: spend the build points on modules before the landing, with
 * a live preview of what the build will do for the five goals.
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
import { gamePanel, gameScreen, gameSection, gameWorld, moduleArt, moduleFigures, type HudStat, type SignalCard } from '../../ui/gameLoop';
import { readButton } from '../../ui/readButton';
import { guideButton, guidePanel } from '../../ui/guide';
import { nextStop } from '../../ui/registry';
import { navigate } from '../../ui/router';

import {
  BUDGET_NONE,
  CORE_MODULES,
  addModule,
  buildCards,
  extraSlots,
  goalPreview,
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

/** How long the toast that says what you just built stays on screen. */
const TOAST_MS = 4000;

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
  /** What the player just did, so the screen can say so. */
  let toast = '';
  /** The card that changed, so it can flash. */
  let changed: ModuleKind | null = null;
  let toastTimer: number | null = null;
  const controller = new AbortController();

  /* One live region for the whole screen. It is re-parented on every render
     rather than rebuilt, so a change of its text is actually announced. */
  const live = h('div', { class: 'gl__live', 'aria-live': 'polite', 'aria-atomic': 'true' });

  /** The forecast the screen is working from: live data once it arrives. */
  function forecast(): readonly ForecastEvent[] {
    return loaded?.forecast ?? start.forecast;
  }

  /** The world's forecast card: the next few things that will happen. */
  function forecastSignal(): SignalCard {
    const events = upcomingWarnings(forecast());

    if (loaded === null && start.forecast.length === 0) {
      return { icon: 'cloud-sun', kicker: 'Forecast', text: 'Reading live space weather…' };
    }

    return {
      icon: 'cloud-sun',
      kicker: 'Coming up',
      text: events.map((event) => `Sol ${event.sol}: ${event.summary}`).join(' · '),
      detail: loaded?.detail,
    };
  }

  /** Whether the how-to-play guide is open. */
  let guideOpen = false;
  /** The guide has been offered once, so it never ambushes the player twice. */
  let guideShown = false;

  /** Say what the player just did, and let it go after a few seconds. */
  function announce(message: string): void {
    toast = message;

    if (toastTimer !== null) window.clearTimeout(toastTimer);

    toastTimer = window.setTimeout(() => {
      toastTimer = null;
      toast = '';
      render();
    }, TOAST_MS);
  }

  function render(focusKey?: string): void {
    const focusable = new Map<string, HTMLElement>();
    const summary = previewSummary(extras, regionId);
    const lines = previewFor(extras, regionId);
    const warning = lines.find((line) => line.tone !== 'ok') ?? null;

    const daysLabel = (days: number, steady: string): string => (Number.isFinite(days) ? `${days} sols` : steady);

    /* Day power is on the screen because it is the number that moves when the
       player adds a solar array. Nothing else on this screen did. */
    const hud: readonly HudStat[] = [
      { icon: 'sun', label: 'Day power', value: `${summary.dayKwh} kWh` },
      { icon: 'moon', label: 'Night power', value: `${summary.nightHours} / 12 h`, tone: summary.nightHours < 12 ? ('warn' as const) : ('ok' as const) },
      { icon: 'oxygen', label: 'Air', value: 'Ready' },
      { icon: 'droplet', label: 'Water', value: daysLabel(summary.waterDays, 'Recycled'), tone: summary.waterDays < 12 ? ('warn' as const) : ('ok' as const) },
      { icon: 'leaf', label: 'Food', value: daysLabel(summary.foodDays, 'Grown'), tone: summary.foodDays < 12 ? ('warn' as const) : ('ok' as const) },
      { icon: 'shield', label: 'Shield', value: `${summary.shielding} / 100`, tone: summary.shielding < 40 ? ('warn' as const) : ('ok' as const) },
    ];

    const signals: SignalCard[] = [
      {
        icon: 'check',
        kicker: 'Already on your lander',
        text: CORE_MODULES.map((kind) => SHORT_NAME[kind]).join(' · '),
      },
      warning === null
        ? { icon: 'check', tone: 'good', kicker: 'This build', text: 'It stays steady through a calm sol.' }
        : { icon: 'bolt', tone: 'warn', kicker: warning.label, text: warning.text },
      forecastSignal(),
    ];

    const world = gameWorld({
      label: region ? region.name : 'Mars',
      weather: 'Clear skies',
      crew: "Hi, explorer! Let's build a home on Mars.",
      signals,
      figures: moduleFigures([...CORE_MODULES, ...extras]),
      /* No crewmate on this screen: the outpost itself is the subject, and
       * the sprite stood where the modules go. */
      showAstronaut: false,
    });

    // ---- The catalogue.
    const budget = h(
      'div',
      { class: 'gl__budget' },
      h('span', null, h('span', { 'aria-hidden': 'true', text: '✦ ' }), `${pointsLeft(extras)} points left`),
      h('span', { text: `${extras.length} / ${extraSlots(regionId)} extras` }),
    );

    const cards = h('div', { class: 'gl__grid' });

    for (const card of buildCards(extras, regionId)) {
      const add = h('button', { class: 'gl__step gl__step--add', type: 'button', 'aria-label': `Add ${card.name}`, disabled: card.blocked !== '' }, '+');
      const remove = h('button', { class: 'gl__step', type: 'button', 'aria-label': `Remove ${card.name}`, disabled: card.have === 0 }, '−');

      focusable.set(`add-${card.kind}`, add);
      focusable.set(`remove-${card.kind}`, remove);

      add.addEventListener('click', () => {
        const next = addModule(extras, card.kind, regionId);

        if (next === extras) return;

        extras = next;
        changed = card.kind;
        announce(`${card.name} added · ${card.cost} points spent`);
        render(`add-${card.kind}`);
      });

      remove.addEventListener('click', () => {
        const next = removeModule(extras, card.kind);

        if (next === extras) return;

        extras = next;
        changed = card.kind;
        announce(`${card.name} removed · ${card.cost} points back`);
        render(`remove-${card.kind}`);
      });

      cards.append(
        h(
          'article',
          { class: card.kind === changed ? 'gl__card gl__card--changed' : 'gl__card' },
          h(
            'div',
            { class: 'gl__card-head' },
            h('img', { class: 'gl__card-img', src: moduleArt(card.kind), alt: '' }),
            h('p', { class: 'gl__card-name', text: card.name }),
            h('span', { class: 'gl__cost', text: `✦ ${card.cost}` }),
            card.atLimit ? h('span', { class: 'gl__card-max', text: 'MAX' }) : null,
          ),
          h('p', { class: 'gl__card-line', text: card.gives }),
          h('p', { class: 'gl__card-tag', text: card.needs }),
          h(
            'div',
            { class: 'gl__stepper' },
            remove,
            h(
              'span',
              { class: 'gl__count' },
              h('strong', { text: String(card.have) }),
              h('small', { text: `/${card.limit}` }),
            ),
            add,
          ),
          /* The reason is shown whenever the "+" is dead, not only the first
             time. The old code hid it the moment the player owned one, which
             is exactly when the limit started to matter. */
          card.blocked !== '' ? h('p', { class: 'gl__card-why', text: card.blocked }) : null,
        ),
      );
    }

    // ---- What this build can do for the five goals.
    const goals = h('div', { class: 'gl__goals' });

    for (const goal of goalPreview(extras, regionId)) {
      goals.append(
        h(
          'div',
          { class: 'gl__goal', 'data-ok': String(goal.ok) },
          h('span', { class: 'gl__goal-mark', 'aria-hidden': 'true', text: goal.ok ? '✓' : '✗' }),
          h('span', { class: 'gl__goal-title', text: goal.title }),
          h('span', { class: 'gl__goal-why', text: goal.ok ? '' : goal.why }),
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

    /* The whole build, read out. The cards are the decision, and a player
       who cannot read yet still gets to make it. */
    const read = readButton(
      () =>
        [
          `You have ${pointsLeft(extras)} build points left and ${extras.length} modules on the ground.`,
          ...buildCards(extras, regionId).map(
            (card) =>
              `${card.name}. ${card.gives}. ${card.needs}. You have ${card.have} of ${card.limit}.${card.blocked === '' ? '' : ` ${card.blocked}`}`,
          ),
        ].join(' '),
      { ariaLabel: 'Read the build screen aloud' },
    );

    const panel = gamePanel({
      kicker: 'Build your outpost',
      title: 'What will you bring?',
      sub: 'Choose extras to keep your crew safe.',
      body: [
        budget,
        toast === '' ? null : h('p', { class: 'gl__toast', text: toast }),
        gameSection('Your goals with this build', goals),
        cards,
        h('p', { class: 'gl__note', text: `NASA fact · ${factFor(start.sol + regionId.length).text} (${factFor(start.sol + regionId.length).credit})` }),
      ],
      footer: [launch, h('p', { class: 'gl__note', text: BUDGET_NONE }), read ?? false],
    });

    const screen = gameScreen({
      hud,
      world,
      panel,
      variant: 'gl--base',
      headerSub: 'BUILD YOUR OUTPOST',
      onLeave: () => navigate('naming'),
      help: guideButton(() => {
        guideOpen = true;
        render();
      }),
    });

    /* The guide opens by itself the first time the player reaches the build
       screen, because that is the first screen where they have to decide
       something and nothing has explained the outpost yet. After that it is
       there whenever they want it. */
    if (!guideShown) {
      guideShown = true;
      guideOpen = true;
    }

    if (guideOpen) screen.append(guidePanel(() => {
      guideOpen = false;
      render();
    }));

    live.textContent = toast;
    screen.append(live);
    mount.replaceChildren(screen);

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
    if (toastTimer !== null) window.clearTimeout(toastTimer);
    mount.replaceChildren();
  };
}
