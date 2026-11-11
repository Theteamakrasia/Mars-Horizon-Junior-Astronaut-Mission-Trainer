/**
 * The shared chrome of the game loop: the navy header, the five-card resource
 * HUD, the illustrated Mars world with its speech bubbles, and
 * the cream interaction panel.
 *
 * It lives in `ui/` because `base`, `act` and `debrief` all draw it and a
 * feature may never import another feature (R-5). Nothing in here knows about a
 * screen: every word and number arrives as an argument, and the only module it
 * understands is the catalogue's `ModuleKind`, for placing artwork.
 *
 * Presentation only. No `sim/` rule is applied here — the screens pass in what
 * the sim said, so this file can never disagree with the model.
 */

import { h } from '../dom/h';
import type { ModuleKind } from '../sim/modules';

/* The artwork is bundled by Vite, never fetched: the Figma asset URLs expire. */
import astronautUrl from '../../Assets/images/interior/sprite/interact-alt.webp';
import backgroundUrl from '../../Assets/images/game-loop/bg-day.png';
import batteryUrl from '../../Assets/images/game-loop/battery-bank.png';
import greenhouseUrl from '../../Assets/images/game-loop/green-house.png';
import habitatUrl from '../../Assets/images/game-loop/habitat.png';
import iceMinerUrl from '../../Assets/images/game-loop/ice-miner.png';
import lifeSupportUrl from '../../Assets/images/game-loop/life-support.png';
import nuclearUrl from '../../Assets/images/game-loop/nuclear-power.png';
import regolithUrl from '../../Assets/images/game-loop/regolith-sheild.png';
import solarUrl from '../../Assets/images/game-loop/solar.png';

/** The Mars landscape behind every world panel. */
export const WORLD_BACKGROUND: string = backgroundUrl;

/** The crewmate sprite. The sheet holds two frames side by side. */
export const ASTRONAUT_SPRITE: string = astronautUrl;

/** One picture per module kind. The asset filename keeps the repo's spelling. */
export const MODULE_ART: Readonly<Record<ModuleKind, string>> = {
  habitat: habitatUrl,
  'life-support': lifeSupportUrl,
  'solar-array': solarUrl,
  batteries: batteryUrl,
  greenhouse: greenhouseUrl,
  'ice-miner': iceMinerUrl,
  'regolith-shield': regolithUrl,
  'nuclear-unit': nuclearUrl,
};

/** The artwork for one module kind. */
export function moduleArt(kind: ModuleKind): string {
  return MODULE_ART[kind];
}

/** Where each module stands in the world, in percent of the panel. */
const MODULE_SPOT: Readonly<Record<ModuleKind, { readonly left: number; readonly bottom: number; readonly width: number; readonly z: number }>> = {
  'solar-array': { left: 16, bottom: 20, width: 20, z: 3 },
  habitat: { left: 33, bottom: 23, width: 21, z: 4 },
  'life-support': { left: 27, bottom: 6, width: 11, z: 5 },
  batteries: { left: 46, bottom: 5, width: 9, z: 5 },
  greenhouse: { left: 56, bottom: 22, width: 19, z: 4 },
  'ice-miner': { left: 76, bottom: 7, width: 11, z: 5 },
  'regolith-shield': { left: 80, bottom: 25, width: 13, z: 3 },
  'nuclear-unit': { left: 89, bottom: 8, width: 10, z: 5 },
};

/** A figure standing in the world. */
export interface WorldFigure {
  readonly src: string;
  /** Percent from the left edge. */
  readonly left: number;
  /** Percent from the bottom edge. */
  readonly bottom: number;
  /** Percent of the panel's width. */
  readonly width: number;
  readonly z?: number;
}

/**
 * Lay out the modules the outpost actually has.
 *
 * A second and third copy of the same module step to the right and shrink a
 * little, so four solar arrays read as a row of panels rather than one picture
 * drawn four times on top of itself.
 */
export function moduleFigures(kinds: readonly ModuleKind[]): readonly WorldFigure[] {
  const placed = new Map<ModuleKind, number>();
  const figures: WorldFigure[] = [];

  for (const kind of kinds) {
    const spot = MODULE_SPOT[kind];
    const copy = placed.get(kind) ?? 0;

    placed.set(kind, copy + 1);

    const width = Math.max(6, spot.width - copy * 1.5);

    figures.push({
      src: moduleArt(kind),
      left: Math.min(92 - width, spot.left + copy * (spot.width * 0.36)),
      bottom: Math.min(34, spot.bottom + copy * 3),
      width,
      z: spot.z + copy,
    });
  }

  return figures;
}


/** One HUD card: an icon, a name, a value, and optionally a 0-100 bar. */
export interface HudStat {
  readonly icon: string;
  readonly label: string;
  readonly value: string;
  /** Renders the thin bar under the value when present. */
  readonly percent?: number;
  readonly tone?: 'ok' | 'warn' | 'bad';
}

/** A card in the world's top-right stack: a fact the crew should notice. */
export interface SignalCard {
  readonly icon: string;
  readonly kicker?: string;
  readonly text: string;
  readonly detail?: string;
  readonly tone?: 'plain' | 'warn' | 'good' | 'peach';
  /** Draws larger: the one thing the frame wants read first. */
  readonly hero?: boolean;
}

/** Everything the world panel needs. */
export interface WorldOptions {
  /** The pill at the top left: where we are, or what is happening. */
  readonly label: string;
  /** The weather pill under it. */
  readonly weather: string;
  /** The glyph before the weather text. A sun unless the screen says otherwise. */
  readonly weatherIcon?: string;
  /** What the crewmate says. */
  readonly crew: string;
  readonly crewLabel?: string;
  readonly signals?: readonly SignalCard[];
  readonly figures?: readonly WorldFigure[];
  readonly hint?: string;
}

/** Everything the right-hand panel needs. */
export interface PanelOptions {
  readonly kicker: string;
  readonly title: string;
  readonly sub?: string;
  readonly body?: readonly (Node | null | false)[];
  readonly footer?: readonly (Node | null | false)[];
}

/** The one line that says what the player is playing. */
export interface MissionBarOptions {
  /** The job, in one line. */
  readonly job: string;
  /** The progress, in one line. */
  readonly progress: string;
  /** The button that opens the guide, when the screen has one. */
  readonly help?: HTMLElement | null;
}

/**
 * The mission bar: one line, always on screen.
 *
 * The game is a strategy game about keeping five systems running, and nothing
 * on the screen ever said so. A child could play twelve sols and never have
 * been told what the job was.
 */
export function missionBar(options: MissionBarOptions): HTMLElement {
  return h(
    'div',
    { class: 'gl__mission' },
    h('span', { class: 'gl__mission-job', text: options.job }),
    h(
      'span',
      { class: 'gl__mission-right' },
      h('span', { class: 'gl__mission-progress', text: options.progress }),
      options.help ?? null,
    ),
  );
}

/** The whole screen: header, HUD, world, panel. */
export interface ScreenOptions {
  readonly hud: readonly HudStat[];
  readonly world: HTMLElement;
  readonly panel: HTMLElement;
  /** Text under the MARS HORIZON brand, naming this screen. */
  readonly headerSub?: string;
  /** A screen-specific modifier on the root, for that feature's own CSS. */
  readonly variant?: string;
  /**
   * When present, the header gets a real Menu button that can leave the run.
   * Screens without a run omit it, and the header keeps the plain label.
   */
  readonly onLeave?: () => void;
  /** The line that says what the player is playing. */
  readonly mission?: MissionBarOptions;
}

/**
 * The header.
 *
 * Drawn as the standard page header: a rocket mark, the MARS HORIZON brand,
 * the screen name, and a control on the right. With `onLeave` that control is a
 * real Menu button that asks before abandoning an unsaved run. Without it, the
 * header keeps the old non-interactive label, because a screen with nothing to
 * leave should not offer a control that does nothing.
 */
export function gameHeader(sub?: string, onLeave?: () => void): HTMLElement {
  const subtitle = sub ?? 'GAME LOOP';

  const header = h(
    'header',
    { class: 'gl__header' },
    h(
      'div',
      { class: 'gl__brand' },
      h('span', { class: 'gl__brand-mark', 'aria-hidden': 'true', text: '🚀' }),
      h(
        'span',
        { class: 'gl__brand-text' },
        h('span', { class: 'gl__brand-name', text: 'MARS HORIZON' }),
        h('span', { class: 'gl__brand-sub', text: subtitle }),
      ),
    ),
  );

  if (onLeave === undefined) {
    header.append(h('nav', { class: 'gl__nav', 'aria-label': 'Primary', text: 'Mission Control / Main Menu' }));

    return header;
  }

  const keep = h('button', { class: 'gl__btn gl__btn--primary', type: 'button' }, 'Keep playing');
  const leave = h('button', { class: 'gl__btn gl__btn--navy', type: 'button' }, 'Leave mission');
  const button = h(
    'button',
    { class: 'gl__menu-button', type: 'button', 'aria-haspopup': 'dialog', 'aria-expanded': 'false' },
    '☰ Menu',
  );

  const card = h(
    'div',
    { class: 'gl__menu-card', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'gl-menu-title' },
    h('p', { class: 'gl__kicker', text: 'Mission Control' }),
    h('h2', { class: 'gl__menu-title', id: 'gl-menu-title', text: 'Leave the mission?' }),
    h('p', {
      class: 'gl__menu-text',
      text: 'Your run is not saved. Leaving now returns to the main menu, and the next mission starts again from sol 1.',
    }),
    h('div', { class: 'gl__menu-actions' }, keep, leave),
  );

  const backdrop = h('div', { class: 'gl__menu-backdrop', hidden: true }, card);

  const close = (): void => {
    backdrop.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    button.focus();
  };

  const open = (): void => {
    backdrop.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    keep.focus();
  };

  button.addEventListener('click', open);
  keep.addEventListener('click', close);
  leave.addEventListener('click', () => {
    close();
    onLeave();
  });
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) close();
  });
  backdrop.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();

      return;
    }

    if (event.key !== 'Tab') return;

    /* Two controls, so the trap is one wrap in each direction. */
    if (event.shiftKey && document.activeElement === keep) {
      event.preventDefault();
      leave.focus();
    } else if (!event.shiftKey && document.activeElement === leave) {
      event.preventDefault();
      keep.focus();
    }
  });

  header.append(button, backdrop);

  return header;
}

/** The five resource cards across the top. */
export function gameHud(stats: readonly HudStat[]): HTMLElement {
  const hud = h('section', { class: 'gl__hud', 'aria-label': 'Resources' });

  for (const stat of stats) {
    hud.append(
      h(
        'div',
        { class: 'gl__stat', 'data-tone': stat.tone ?? 'ok' },
        h('span', { class: 'gl__stat-icon', 'aria-hidden': 'true', text: stat.icon }),
        h(
          'div',
          { class: 'gl__stat-body' },
          h('span', { class: 'gl__stat-label', text: stat.label }),
          h('span', { class: 'gl__stat-value', text: stat.value }),
          stat.percent === undefined
            ? null
            : h(
                'span',
                {
                  class: 'gl__stat-bar',
                  role: 'meter',
                  'aria-label': stat.label,
                  'aria-valuemin': '0',
                  'aria-valuemax': '100',
                  'aria-valuenow': String(Math.round(stat.percent)),
                },
                h('span', { style: `width:${Math.max(0, Math.min(100, stat.percent))}%` }),
              ),
        ),
      ),
    );
  }

  return hud;
}

/** The illustrated world panel, with its bubbles and figures. */
export function gameWorld(options: WorldOptions): HTMLElement {
  const left = h(
    'div',
    { class: 'gl__world-col' },
    h('span', { class: 'gl__location', text: options.label }),
    h('span', { class: 'gl__weather' }, h('span', { 'aria-hidden': 'true', text: options.weatherIcon ?? '☀' }), options.weather),
    h(
      'div',
      { class: 'gl__crew' },
      h('span', { class: 'gl__crew-label', text: options.crewLabel ?? 'Your crewmate' }),
      h('p', { class: 'gl__crew-text', text: options.crew }),
    ),
  );

  const right = h('div', { class: 'gl__signals' });

  for (const signal of options.signals ?? []) {
    const classes = signal.hero === true ? 'gl__signal gl__signal--hero' : 'gl__signal';

    right.append(
      h(
        'div',
        { class: classes, 'data-tone': signal.tone ?? 'plain' },
        h('span', { class: 'gl__signal-icon', 'aria-hidden': 'true', text: signal.icon }),
        h(
          'div',
          { class: 'gl__signal-body' },
          signal.kicker === undefined ? null : h('span', { class: 'gl__signal-kicker', text: signal.kicker }),
          h('p', { class: 'gl__signal-text', text: signal.text }),
          signal.detail === undefined ? null : h('p', { class: 'gl__signal-detail', text: signal.detail }),
        ),
      ),
    );
  }

  const world = h(
    'section',
    { class: 'gl__world', 'aria-label': 'Your outpost on Mars', style: `background-image:url(${WORLD_BACKGROUND})` },
    h('div', { class: 'gl__world-top' }, left, right),
  );

  for (const figure of options.figures ?? []) {
    world.append(
      h('img', {
        class: 'gl__figure',
        src: figure.src,
        alt: '',
        style: `--gl-x:${figure.left}%;--gl-y:${figure.bottom}%;--gl-w:${figure.width}%;--gl-z:${figure.z ?? 2}`,
      }),
    );
  }

  if (options.hint !== undefined) world.append(h('p', { class: 'gl__hint', text: options.hint }));
  world.append(h('span', { class: 'gl__astronaut', 'aria-hidden': 'true', style: `background-image:url(${ASTRONAUT_SPRITE})` }));

  return world;
}

/** The right-hand panel: kicker, title, a scrolling body and a fixed footer. */
export function gamePanel(options: PanelOptions): HTMLElement {
  const head = h(
    'header',
    { class: 'gl__panel-head' },
    h('p', { class: 'gl__kicker', text: options.kicker }),
    h('h1', { class: 'gl__title', text: options.title }),
    options.sub === undefined ? null : h('p', { class: 'gl__sub', text: options.sub }),
  );

  const body = h('div', { class: 'gl__scroll' }, ...(options.body ?? []));
  const footer = h('footer', { class: 'gl__panel-foot' }, ...(options.footer ?? []));

  return h('section', { class: 'gl__panel' }, head, body, footer);
}

/** Assemble a screen. Always one `.gl` root, so the fixed layout is one rule. */
export function gameScreen(options: ScreenOptions): HTMLElement {
  return h(
    'div',
    { class: options.variant === undefined ? 'gl' : `gl ${options.variant}` },
    gameHeader(options.headerSub, options.onLeave),
    options.mission === undefined ? null : missionBar(options.mission),
    gameHud(options.hud),
    h('div', { class: 'gl__main' }, options.world, options.panel),
  );
}

/** A labelled block: an uppercase heading and its content. */
export function gameSection(label: string, ...content: (Node | null | false)[]): HTMLElement {
  return h('section', null, h('p', { class: 'gl__label', text: label }), ...content);
}
