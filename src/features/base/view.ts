/**
 * The base screen: spend the build points on modules before the landing, with
 * a live preview of what the build will do for the five goals.
 *
 * Owns the DOM only. Placement rules and the preview come from ./model, and the
 * preview runs the real sol step, so it cannot promise what the sim will not
 * deliver.
 *
 * The supply list lives in the setup popup (./setupPopup), the landing window
 * that opens over this screen. The panel keeps the state of the build — the
 * points, the goals and the button that starts the run — and the popup is
 * where the modules are bought, so the two are never on screen at once.
 *
 * Space-weather data is fetched here (through `dom/forecastLoader`) so the
 * forecast warning is on screen before the player commits, which is the README's
 * first lesson: forecast before you act.
 *
 * The layout follows the game-loop frame (`66:14`): the outpost on Mars on the
 * left, the build panel on the right, five resource cards above.
 */

import { loadForecast, type LoadedForecast } from '../../dom/forecastLoader';
import { h } from '../../dom/h';
import { factFor } from '../../data/nasaGallery';
import { createForecast, type ForecastEvent } from '../../sim/forecast';
import { hasReachedOutpost, newRun, startOutpost, withState, type RunState } from '../../sim/run';
import { regionById, siteScore } from '../../sim/regions';
import { gamePanel, gameScreen, gameSection, gameWorld, keepScroll, moduleFigures, type HudStat, type SignalCard } from '../../ui/gameLoop';
import { dayModel } from '../../ui/dayTracker';
import { readButton } from '../../ui/readButton';
import { guideButton, guidePanel } from '../../ui/guide';
import { nextStop } from '../../ui/registry';
import { navigate } from '../../ui/router';

import {
  BUDGET_NONE,
  CORE_MODULES,
  RESTART_NOTE,
  buildCards,
  extraSlots,
  goalPreview,
  pointsLeft,
  powerDials,
  previewFor,
  previewSummary,
  upcomingWarnings,
  type ModuleKind,
} from './model';
import { createSetupPopup, siteGoals, type SetupPopup } from './setupPopup';

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
  /**
   * The mounted popup. It lives on `document.body`, not inside the screen, so
   * a background redraw (the live forecast arriving) cannot reset the page the
   * child is reading or replay its entrance.
   */
  let guideEl: HTMLElement | null = null;
  /** The toast node in the current tree, so it can be taken away without a redraw. */
  let toastNode: HTMLElement | null = null;
  /**
   * The setup popup: the landing window where the modules are bought.
   *
   * It is mounted on `document.body` for the same reason the guide is, and it
   * is drawn from the same `extras` the panel draws from, so the two can never
   * disagree about the build.
   */
  let setup: SetupPopup | null = null;
  /** The setup popup has opened itself once, so it never ambushes twice. */
  let setupShown = false;

  /** The six numbers the outpost is about: the screen's HUD, and the popup's row. */
  function outpostStats(current: readonly ModuleKind[]): readonly HudStat[] {
    const summary = previewSummary(current, regionId);
    const daysLabel = (days: number, steady: string): string => (Number.isFinite(days) ? `${days} sols` : steady);

    /* Day power is on the screen because it is the number that moves when the
       player adds a solar array. Nothing else on this screen did. */
    return [
      { icon: 'sun', label: 'Day power', value: `${summary.dayKwh} kWh` },
      { icon: 'moon', label: 'Night power', value: `${summary.nightHours} / 12 h`, tone: summary.nightHours < 12 ? ('warn' as const) : ('ok' as const) },
      { icon: 'oxygen', label: 'Air', value: 'Ready' },
      { icon: 'droplet', label: 'Water', value: daysLabel(summary.waterDays, 'Recycled'), tone: summary.waterDays < 12 ? ('warn' as const) : ('ok' as const) },
      { icon: 'leaf', label: 'Food', value: daysLabel(summary.foodDays, 'Grown'), tone: summary.foodDays < 12 ? ('warn' as const) : ('ok' as const) },
      { icon: 'shield', label: 'Shield', value: `${summary.shielding} / 100`, tone: summary.shielding < 40 ? ('warn' as const) : ('ok' as const) },
    ];
  }

  /** Say what the player just did, and let it go after a few seconds. */
  function announce(message: string): void {
    toast = message;

    if (toastTimer !== null) window.clearTimeout(toastTimer);

    toastTimer = window.setTimeout(() => {
      toastTimer = null;
      toast = '';
      /* Take the node away rather than drawing the screen again. A redraw four
         seconds after the press threw the player back to the top of the panel,
         for no reason they could see (ISS-080). */
      toastNode?.remove();
      toastNode = null;
      live.textContent = '';
    }, TOAST_MS);
  }

  /** Close the guide, and take the popup off the document. */
  function closeGuide(): void {
    guideOpen = false;
    guideEl?.remove();
    guideEl = null;
    render();
  }

  /**
   * Land the outpost and start the twelve sols.
   *
   * One function, called from the panel's button and from the setup popup's
   * button, so there is a single way the run starts and it behaves the same
   * wherever it was pressed.
   */
  function land(): void {
    const forecastNow = forecast();
    const prepared = withState(start, {
      forecast: forecastNow.length > 0 ? forecastNow : createForecast([], Date.now(), siteScore(regionId).dust),
    });
    const next = startOutpost(prepared, [...CORE_MODULES, ...extras]);

    setRun(next);
    navigate(nextStop('base') ?? 'act');
  }

  /** The label on the button that lands the outpost. */
  function launchLabel(): string {
    return start.modules.length > 0 ? 'Land again from sol 1' : 'Land & start sol 1';
  }

  /** Open the setup popup over the build screen. */
  function openSetup(): void {
    if (setup !== null) return;

    setupShown = true;

    setup = createSetupPopup({
      regionId,
      extras,
      stats: () => outpostStats(extras),
      launchLabel: launchLabel(),
      onChange: (next, message) => {
        extras = next;
        announce(message);
        render();
      },
      onLaunch: () => {
        land();
      },
      onClose: () => {
        closeSetup();
      },
    });

    document.body.append(setup.element);
  }

  /** Take the setup popup off the document, and give the focus back. */
  function closeSetup(): void {
    setup?.element.remove();
    setup = null;

    window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>('[data-focus="open-setup"]')?.focus();
    });
  }

  function render(focusKey?: string): void {
    /*
     * Where the player was, before the tree is replaced.
     *
     * `.gl__scroll` is the panel's only scroll container and it is destroyed by
     * the redraw, so both the offset and the focused control have to be put
     * back afterwards. Without this every press, every toast and every
     * late-arriving forecast jumped the panel to the top (ISS-080).
     */
    const restoreScroll = keepScroll(mount);
    const active = document.activeElement;
    const activeKey = active instanceof HTMLElement ? active.dataset.focus : undefined;

    const focusable = new Map<string, HTMLElement>();

    /** Register a control so its focus can survive a redraw. */
    const keep = (key: string, el: HTMLElement): void => {
      el.dataset.focus = key;
      focusable.set(key, el);
    };

    const lines = previewFor(extras, regionId);
    const warning = lines.find((line) => line.tone !== 'ok') ?? null;

    const hud = outpostStats(extras);

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

    /* The supply list lives in the setup popup, so this button is the way
       into it. The player must never be left without the modules. */
    const openSetupButton = h(
      'button',
      { class: 'gl__btn gl__btn--navy', type: 'button' },
      'Choose your extras',
      h('span', { class: 'gl__btn-arrow', 'aria-hidden': 'true', text: '→' }),
    );

    keep('open-setup', openSetupButton);

    openSetupButton.addEventListener('click', () => {
      openSetup();
    });


    // ---- Make, Store and Use: the three dials of the power economy.
    const dials = h('div', { class: 'gl__dials' });

    for (const dial of powerDials(extras, regionId)) {
      dials.append(
        h(
          'div',
          { class: 'gl__dial', 'data-tone': dial.tone },
          h('span', { class: 'gl__dial-title', text: dial.label }),
          h('span', { class: 'gl__dial-text', text: dial.text }),
        ),
      );
    }

    // ---- What this build can do for the five goals.
    const goals = siteGoals(goalPreview(extras, regionId));

    /* The build screen is reachable again after the landing, and the button
       under the cards starts the outpost over. Say so on the button and under
       it, rather than wiping a run without a word (ISS-081). */
    const landed = start.modules.length > 0;
    const launch = h(
      'button',
      { class: 'gl__btn gl__btn--primary gl__btn--start', type: 'button' },
      landed ? 'Land again from sol 1' : 'Land & start sol 1',
      h('span', { class: 'gl__btn-arrow', 'aria-hidden': 'true', text: '→' }),
    );

    launch.addEventListener('click', () => {
      land();
    });

    /* The whole build, read out. The cards are the decision, and a player
       who cannot read yet still gets to make it. */
    const read = readButton(
      () =>
        [
          `You have ${pointsLeft(extras)} build points left and ${extras.length} modules on the ground.`,
          ...buildCards(extras, regionId).map(
            (card) =>
              `${card.name}. ${card.gives}. ${card.needs}. You have ${card.total} of ${card.maxCount}${
                card.fromLander > 0 ? `, ${card.fromLander} of them from the lander` : ''
              }.${card.blocked === '' ? '' : ` ${card.blocked}`}`,
          ),
        ].join(' '),
      { ariaLabel: 'Read the build screen aloud' },
    );

    const toastElement = toast === '' ? null : h('p', { class: 'gl__toast', text: toast });

    toastNode = toastElement;

    const panel = gamePanel({
      kicker: 'Build your outpost',
      title: 'What will you bring?',
      sub: 'Choose extras to keep your crew safe.',
      body: [
        budget,
        toastElement,
        openSetupButton,
        gameSection('Your power', dials),

        gameSection('Your goals with this build', goals),
        h('p', { class: 'gl__note', text: `NASA fact · ${factFor(start.sol + regionId.length).text} (${factFor(start.sol + regionId.length).credit})` }),
      ],
      footer: [launch, h('p', { class: 'gl__note', text: landed ? RESTART_NOTE : BUDGET_NONE }), read ?? false],
    });

    const screen = gameScreen({
      hud,
      world,
      panel,
      variant: 'gl--base',
      headerSub: 'BUILD YOUR OUTPOST',
      onLeave: () => navigate('naming'),
      day: dayModel(start),
      /* The book is earned by reaching the outpost, not by having the bar: this
         screen falls back to a run with no region when it is handed none, and
         that run has not landed anywhere (D-080). */
      showEncyclopedia: hasReachedOutpost(run),
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

    if (guideOpen && guideEl === null) {
      guideEl = guidePanel(closeGuide);
      document.body.append(guideEl);
    }

    if (!guideOpen && guideEl !== null) {
      guideEl.remove();
      guideEl = null;
    }

    /* The setup popup is the landing window: it opens by itself while the
       outpost is still being prepared, and the panel's button opens it again
       afterwards. It waits for the guide, so the two are never on screen at
       once, and it never opens itself twice. */
    if (!guideOpen && !setupShown && !landed) {
      openSetup();
    }

    /* The window reads the same build as the panel, so it is redrawn whenever
       the panel is. It lives outside the screen, so this cannot disturb the
       page the player is reading. */
    setup?.update(extras);

    live.textContent = toast;
    screen.append(live);
    mount.replaceChildren(screen);

    /* Put the player back where they were: the panel's offset first, then the
       control they were on. `preventScroll` so focusing it cannot undo the
       offset we just restored (ISS-080). */
    restoreScroll();

    const wanted = focusKey ?? activeKey;

    if (wanted !== undefined) focusable.get(wanted)?.focus({ preventScroll: true });
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
    guideEl?.remove();
    guideEl = null;
    /* The window is on the document, not in the screen, so the teardown has
       to take it off itself. */
    setup?.element.remove();
    setup = null;
    mount.replaceChildren();
  };
}
