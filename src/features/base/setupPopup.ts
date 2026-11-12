/**
 * The setup popup: the landing window that opens over the build screen.
 *
 * The player has just put down on Mars. This window is where the outpost is
 * prepared: the site, the five goals the site has to meet, and the supply
 * depot where the build points are spent. The supply list used to live in the
 * panel on the right of the build screen; it lives here now, so the whole
 * decision is in one place and nothing is ever on screen twice.
 *
 * It is a popup and not a screen of its own because the outpost is still
 * behind it: the player closes the window and finds the outpost they were
 * building, exactly where they left it.
 *
 * DOM only. The build itself is the caller's `extras` — the same list the
 * build panel and the simulation use — and every rule comes from ./model, so
 * this window can never promise a build the simulation will not deliver.
 *
 * The caller mounts the backdrop on `document.body`, for the same reason the
 * how-to-play guide is mounted there: the build screen redraws itself on every
 * press, toast and live-forecast arrival, and a popup inside the screen was
 * rebuilt from scratch each time, throwing a child reading it back to the top
 * (ISS-090).
 */

import { h } from '../../dom/h';
import { regionById } from '../../sim/regions';
import { icon } from '../../ui/icons';
import { moduleArt, type HudStat } from '../../ui/gameLoop';
import { readButton } from '../../ui/readButton';

import {
  addModule,
  buildCards,
  extraSlots,
  goalPreview,
  pointsLeft,
  removeModule,
  type BuildCard,
  type GoalPreview,
  type ModuleKind,
} from './model';

import arcadiaUrl from '../../../Assets/images/landing-site/arcadia.webp';
import argyreUrl from '../../../Assets/images/landing-site/argyre.webp';
import jezeroUrl from '../../../Assets/images/landing-site/jezero.webp';
import olympusUrl from '../../../Assets/images/landing-site/olympus.webp';
import vallesUrl from '../../../Assets/images/landing-site/valles.webp';

import './setupPopup.css';

/**
 * The picture of each landing site.
 *
 * The same thumbnails the landing-site map pins on the Mars map, so the place
 * the player chose on the map is the place they land. They are local assets,
 * so the window draws the same picture with no network and no waiting.
 */
const REGION_ART: Readonly<Record<string, string>> = {
  arcadia: arcadiaUrl,
  argyre: argyreUrl,
  jezero: jezeroUrl,
  olympus: olympusUrl,
  valles: vallesUrl,
};

/** The picture for a site, or the outpost itself when the id is unknown. */
function regionArt(regionId: string): string {
  return REGION_ART[regionId] ?? moduleArt('habitat');
}

/** A unique id per mounted popup, so two dialogs cannot share a label. */
let NEXT_ID = 0;

/** Everything the setup window needs. */
export interface SetupPopupOptions {
  /** The landing site the outpost is on. */
  readonly regionId: string;
  /** The modules the player has bought, beyond the four the lander brought. */
  readonly extras: readonly ModuleKind[];
  /**
   * The six numbers the outpost shows, as the caller already draws them for
   * the screen's own HUD. A getter, because the numbers move with the build.
   */
  readonly stats: () => readonly HudStat[];
  /** The label on the button that lands the outpost. */
  readonly launchLabel: string;
  /**
   * Called with the new build when the player buys or removes something, and
   * with the line the screen says about it.
   */
  readonly onChange: (extras: readonly ModuleKind[], message: string) => void;
  /** Called when the player presses the button that lands the outpost. */
  readonly onLaunch: () => void;
  /** Called when the window closes without landing. */
  readonly onClose: () => void;
}

/** The mounted setup window. */
export interface SetupPopup {
  /** The backdrop. The caller mounts it on `document.body`. */
  readonly element: HTMLElement;
  /** Redraw the window for a new build. */
  update(extras: readonly ModuleKind[]): void;
}

/**
 * The five site goals, as the game's own rows.
 *
 * The build panel shows them so the state of the build is visible at a
 * glance, and the setup window shows them because the goals are what the setup
 * is for. Both draw these rows, so they are built here once.
 *
 * `state` adds the word beside each goal — Ready or Required — which the
 * window needs and the panel does not.
 */
export function siteGoals(goals: readonly GoalPreview[], options: { readonly state?: boolean } = {}): HTMLElement {
  const list = h('div', { class: 'gl__goals' });

  for (const goal of goals) {
    const row = h(
      'div',
      { class: 'gl__goal', 'data-ok': String(goal.ok) },
      h('span', { class: 'gl__goal-mark', 'aria-hidden': 'true', text: goal.ok ? '✓' : '✗' }),
      h('span', { class: 'gl__goal-title', text: goal.title }),
      h('span', { class: 'gl__goal-why', text: goal.ok ? '' : goal.why }),
    );

    if (options.state === true) {
      row.append(h('span', { class: 'gl__goal-state', text: goal.ok ? 'Ready' : 'Required' }));
    }

    list.append(row);
  }

  return list;
}

/** The focusable controls in the window, in document order. */
function focusable(card: HTMLElement): readonly HTMLElement[] {
  return [
    ...card.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ].filter((node) => !node.hasAttribute('disabled') && !node.hidden);
}

/**
 * Build the setup window.
 *
 * Returns the backdrop, which is what the caller mounts. The caller owns the
 * build and the launch, so this window asks for a change and hands the new
 * build back rather than keeping one of its own.
 */
export function createSetupPopup(options: SetupPopupOptions): SetupPopup {
  const titleId = `setup-title-${(NEXT_ID += 1)}`;
  const region = regionById(options.regionId);
  const siteName = region?.name ?? 'Mars';
  const siteBlurb = region?.blurb ?? 'A flat stretch of Mars, waiting for an outpost.';

  let extras = options.extras;
  /** The card that was just bought or removed, so it can flash. */
  let flash: ModuleKind | null = null;
  /** The control the focus goes back to after the window redraws. */
  let focusKey: string | null = null;
  /** The control to try if the one above is gone. */
  let fallbackKey: string | null = null;

  // ---- The header: where the crew is, and what happens now.
  const close = h(
    'button',
    { class: 'setup__close', type: 'button', 'aria-label': 'Close the setup window' },
    icon('close'),
  );

  const header = h(
    'header',
    { class: 'setup__head' },
    h(
      'div',
      { class: 'setup__headings' },
      h('p', { class: 'setup__kicker', text: `Landing complete / ${siteName}` }),
      h('h2', { class: 'setup__title', id: titleId, text: 'Prepare your outpost' }),
      h('p', {
        class: 'setup__sub',
        text: 'Your landing is complete. Meet the site requirements before Sol 1 begins.',
      }),
      h('p', { class: 'setup__blurb', text: siteBlurb }),
    ),
    h(
      'div',
      { class: 'setup__art-wrap' },
      h('img', {
        class: 'setup__art',
        src: regionArt(options.regionId),
        alt: `${siteName} on Mars`,
      }),
    ),
    close,
  );
  // ---- How far the setup has got, and what is left to spend.
  const progressValue = h('p', { class: 'setup__progress-value' });
  const pips = h('div', { class: 'setup__pips', 'aria-hidden': 'true' });
  const pointsValue = h('p', { class: 'setup__points-value' });
  const extrasValue = h('p', { class: 'setup__extras' });

  const progress = h(
    'div',
    { class: 'setup__progress' },
    h(
      'div',
      { class: 'setup__block' },
      h('p', { class: 'setup__label', text: 'Setup progress' }),
      progressValue,
      pips,
    ),
    h(
      'div',
      { class: 'setup__block setup__block--points' },
      h('p', { class: 'setup__label', text: 'Available points' }),
      h('div', { class: 'setup__points-row' }, pointsValue, extrasValue),
    ),
  );

  // ---- The six numbers the outpost is about.
  const stats = h('div', { class: 'setup__stats' });

  // ---- The goals, and the depot.
  const goalsHost = h('div', { class: 'setup__goals' });
  const cards = h('div', { class: 'gl__grid' });
  const stillRequired = h('p', { class: 'setup__still' });

  const body = h(
    'div',
    { class: 'setup__body' },
    h(
      'section',
      { class: 'setup__col' },
      h('p', { class: 'setup__label', text: 'Site goals' }),
      h('p', {
        class: 'setup__hint',
        text: 'Complete the remaining requirements to hold this site.',
      }),
      goalsHost,
    ),
    h(
      'section',
      { class: 'setup__col setup__col--depot' },
      h('p', { class: 'setup__label', text: 'Supply depot' }),
      h('p', { class: 'setup__hint', text: 'Spend points on the structures you need.' }),
      cards,
      stillRequired,
    ),
  );

  // ---- The footer: where the run stands, and the button that starts it.
  const statusIcon = h('span', { class: 'setup__status-icon', 'aria-hidden': 'true' }, icon('check'));
  const statusTitle = h('p', { class: 'setup__status-title' });
  const statusDetail = h('p', { class: 'setup__status-detail' });

  const launch = h(
    'button',
    { class: 'gl__btn gl__btn--primary setup__launch', type: 'button' },
    options.launchLabel,
    h('span', { class: 'gl__btn-arrow', 'aria-hidden': 'true', text: '→' }),
  );

  const footer = h(
    'footer',
    { class: 'setup__foot' },
    h(
      'div',
      { class: 'setup__status-block' },
      h(
        'div',
        { class: 'setup__status' },
        statusIcon,
        h(
          'div',
          { class: 'setup__status-body' },
          statusTitle,
          statusDetail,
        ),
      ),
    ),
    launch,
  );

  const card = h(
    'div',
    { class: 'setup__card', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId, tabindex: '-1' },
    header,
    progress,
    stats,
    body,
    footer,
  );

  /* The build screen's own variant class, so the cards in this window are
     drawn by the same rules as the cards on the screen behind it. */
  const backdrop = h('div', { class: 'setup__backdrop gl--base' }, card);

  /**
   * One supply card, exactly as the build panel drew it.
   *
   * The same markup, the same classes and the same rules, so a card in this
   * window is the same card the player has seen everywhere else in the game.
   */
  function supplyCard(entry: BuildCard): HTMLElement {
    const add = h(
      'button',
      {
        class: 'gl__step gl__step--add',
        type: 'button',
        'aria-label': `Add ${entry.name}`,
        disabled: entry.blocked !== '',
      },
      '+',
    );

    const remove = h(
      'button',
      {
        class: 'gl__step',
        type: 'button',
        'aria-label': `Remove ${entry.name}`,
        disabled: entry.have === 0,
      },
      '−',
    );

    add.dataset.focus = `add-${entry.kind}`;
    remove.dataset.focus = `remove-${entry.kind}`;

    add.addEventListener('click', () => {
      const next = addModule(extras, entry.kind, options.regionId);

      if (next === extras) return;

      flash = entry.kind;
      focusKey = `add-${entry.kind}`;
      fallbackKey = `remove-${entry.kind}`;
      options.onChange(next, `${entry.name} added · ${entry.cost} points spent`);
    });

    remove.addEventListener('click', () => {
      const next = removeModule(extras, entry.kind);

      if (next === extras) return;

      flash = entry.kind;
      focusKey = `remove-${entry.kind}`;
      fallbackKey = `add-${entry.kind}`;
      options.onChange(next, `${entry.name} removed · ${entry.cost} points back`);
    });

    return h(
      'article',
      { class: entry.kind === flash ? 'gl__card gl__card--changed' : 'gl__card' },
      h(
        'div',
        { class: 'gl__card-head' },
        h('img', { class: 'gl__card-img', src: moduleArt(entry.kind), alt: '' }),
        h('p', { class: 'gl__card-name', text: entry.name }),
        h('span', { class: 'gl__cost', text: `✦ ${entry.cost}` }),
        entry.atLimit ? h('span', { class: 'gl__card-max', text: 'MAX' }) : null,
      ),
      h('p', { class: 'gl__card-line', text: entry.gives }),
      h('p', { class: 'gl__card-tag', text: entry.needs }),
      /* A note about this purchase, when there is one worth saying: what a
         second solar array would do with the sunlight it makes. */
      entry.note === '' ? null : h('p', { class: 'gl__card-note', text: entry.note }),
      h(
        'div',
        { class: 'gl__stepper' },
        remove,
        h(
          'span',
          { class: 'gl__count' },
          h('strong', { text: String(entry.total) }),
          h('small', { text: `/${entry.maxCount}` }),
        ),
        add,
      ),
      /* The lander's free copy is counted on the card, not just in the maths:
         the outpost really has one solar array and one battery before the
         player spends anything (ISS-077). */
      entry.fromLander > 0
        ? h('p', { class: 'gl__card-lander', text: `Includes ${entry.fromLander} from the lander.` })
        : null,
      /* The reason is shown whenever the "+" is dead, not only the first time.
         The old code hid it the moment the player owned one, which is exactly
         when the limit started to matter. */
      entry.blocked !== '' ? h('p', { class: 'gl__card-why', text: entry.blocked }) : null,
    );
  }

  /** Draw the window for the build it has now. */
  function paint(): void {
    /* Where the player was reading, before the tree is replaced. */
    const scrollTop = body.scrollTop;
    const active = document.activeElement;
    const activeKey =
      active instanceof HTMLElement && backdrop.contains(active) ? (active.dataset.focus ?? null) : null;

    const goalList = goalPreview(extras, options.regionId);
    const ready = goalList.filter((goal) => goal.ok).length;

    progressValue.textContent = `${ready} / ${goalList.length} goals marked ready`;
    pips.replaceChildren(
      ...goalList.map((goal) =>
        h('span', { class: goal.ok ? 'setup__pip setup__pip--ready' : 'setup__pip' }),
      ),
    );

    pointsValue.textContent = `${pointsLeft(extras)} points left`;
    extrasValue.textContent = `${extras.length} / ${extraSlots(options.regionId)} extras selected`;

    stats.replaceChildren(
      ...options.stats().map((stat) =>
        h(
          'div',
          { class: 'setup__stat', 'data-tone': stat.tone ?? 'ok' },
          h('span', { class: 'setup__stat-icon', 'aria-hidden': 'true' }, icon(stat.icon)),
          h(
            'div',
            { class: 'setup__stat-body' },
            h('span', { class: 'setup__stat-label', text: stat.label }),
            h('span', { class: 'setup__stat-value', text: stat.value }),
          ),
        ),
      ),
    );

    goalsHost.replaceChildren(siteGoals(goalList, { state: true }));

    cards.replaceChildren(...buildCards(extras, options.regionId).map((entry) => supplyCard(entry)));

    const missing = goalList.filter((goal) => !goal.ok);

    stillRequired.textContent =
      missing.length === 0
        ? 'Nothing more is required. This build holds every goal.'
        : `Still required: ${missing.map((goal) => `${goal.title} — ${goal.why}`).join(' · ')}`;

    /* The footer never says the run is locked: the game lets a crew land with
       a goal unmet, and says so on the build screen (BUDGET_NONE). It reports
       how many goals are ready and lets the player decide. */
    statusTitle.textContent =
      missing.length === 0
        ? 'All five site goals are ready.'
        : `${ready} of ${goalList.length} site goals are ready.`;

    statusDetail.textContent =
      missing.length === 0
        ? 'Your outpost can hold twelve sols.'
        : 'You can still land. It is allowed, and you will see why it is hard.';

    statusIcon.replaceChildren(icon(missing.length === 0 ? 'check' : 'alert'));

    /* The flash is for the card that was just pressed, once. */
    flash = null;

    body.scrollTop = scrollTop;

    /* Put the player back on the control they were using. A button that has
       just gone dead cannot hold the focus, so the other step of the same card
       takes it, and the launch button takes it if neither can. */
    const wanted = focusKey ?? activeKey;
    const fallback = fallbackKey;

    focusKey = null;
    fallbackKey = null;

    if (wanted !== null) {
      const target = backdrop.querySelector<HTMLElement>(`[data-focus="${wanted}"]`);

      if (target !== null && !target.hasAttribute('disabled')) {
        target.focus({ preventScroll: true });

        return;
      }

      const other =
        fallback === null ? null : backdrop.querySelector<HTMLElement>(`[data-focus="${fallback}"]`);

      if (other !== null && !other.hasAttribute('disabled')) {
        other.focus({ preventScroll: true });

        return;
      }

      launch.focus({ preventScroll: true });
    }
  }

  /** Close the window without landing. */
  function shut(): void {
    options.onClose();
  }

  close.addEventListener('click', shut);

  launch.addEventListener('click', () => {
    options.onLaunch();
  });

  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) shut();
  });

  backdrop.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      shut();

      return;
    }

    if (event.key !== 'Tab') return;

    /* The window is modal, so Tab wraps inside it rather than reaching the
       build controls behind the dimmed backdrop. */
    const stops = focusable(card);

    if (stops.length === 0) return;

    const first = stops[0] as HTMLElement;
    const last = stops[stops.length - 1] as HTMLElement;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  /* The whole build, read out. The cards are the decision, and a player who
     cannot read yet still gets to make it. */
  const read = readButton(
    () =>
      [
        `You are at ${siteName}. ${siteBlurb}`,
        `You have ${pointsLeft(extras)} build points left and ${extras.length} modules on the ground.`,
        ...buildCards(extras, options.regionId).map(
          (entry) =>
            `${entry.name}. ${entry.gives}. ${entry.needs}. You have ${entry.total} of ${entry.maxCount}${
              entry.fromLander > 0 ? `, ${entry.fromLander} of them from the lander` : ''
            }.${entry.blocked === '' ? '' : ` ${entry.blocked}`}`,
        ),
      ].join(' '),
    { ariaLabel: 'Read the setup window aloud' },
  );

  if (read !== null) footer.querySelector('.setup__status-block')?.append(read);

  paint();

  /* The window is appended after this returns, so the dialog itself takes the
     focus on the next frame. That puts the child inside the window without
     putting them on a button that starts the run. */
  window.requestAnimationFrame(() => {
    if (backdrop.isConnected) card.focus({ preventScroll: true });
  });

  return {
    element: backdrop,
    update(next: readonly ModuleKind[]): void {
      extras = next;
      paint();
    },
  };
}
