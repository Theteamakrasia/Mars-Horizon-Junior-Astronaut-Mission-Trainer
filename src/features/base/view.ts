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
 */

import { loadForecast, type LoadedForecast } from '../../dom/forecastLoader';
import { clear, h } from '../../dom/h';
import { createForecast } from '../../sim/forecast';
import { newRun, startOutpost, withState, type RunState } from '../../sim/run';
import { regionById } from '../../sim/regions';
import { nextStop } from '../../ui/registry';
import { navigate } from '../../ui/router';

import '../../styles/game.css';
import './base.css';

import {
  BUDGET_NONE,
  BUILDABLE,
  BUILD_BUDGET,
  CORE_MODULES,
  addModule,
  canPlace,
  extraSlots,
  pointsLeft,
  previewFor,
  removeModule,
  specOf,
  upcomingWarnings,
  upkeepFor,
  type ModuleKind,
} from './model';

import bgDayUrl from '../../../Assets/images/game-loop/bg-day.png';
import habitatUrl from '../../../Assets/images/game-loop/habitat.png';
import lifeSupportUrl from '../../../Assets/images/game-loop/life-support.png';
import solarUrl from '../../../Assets/images/game-loop/solar.png';
import batteryUrl from '../../../Assets/images/game-loop/battery-bank.png';
import greenhouseUrl from '../../../Assets/images/game-loop/green-house.png';
import iceMinerUrl from '../../../Assets/images/game-loop/ice-miner.png';
import regolithUrl from '../../../Assets/images/game-loop/regolith-sheild.png';
import nuclearUrl from '../../../Assets/images/game-loop/nuclear-power.png';

/** Each buildable module kind to its artwork. The asset filename for regolith
 *  shield keeps the repo's existing spelling ('sheild'). */
const MODULE_IMAGE: Readonly<Record<ModuleKind, string>> = {
  'habitat': habitatUrl,
  'life-support': lifeSupportUrl,
  'solar-array': solarUrl,
  batteries: batteryUrl,
  greenhouse: greenhouseUrl,
  'ice-miner': iceMinerUrl,
  'regolith-shield': regolithUrl,
  'nuclear-unit': nuclearUrl,
};

function moduleImage(kind: ModuleKind): string {
  return MODULE_IMAGE[kind];
}

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

  mount.classList.add('gx', 'base');
  mount.style.background = `linear-gradient(rgba(7, 14, 18, 0.86), rgba(7, 14, 18, 0.94)), url(${bgDayUrl}) center / cover no-repeat`;

  const root = h('div', { class: 'base__body' });

  function warnings(): HTMLElement {
    const events = upcomingWarnings(loaded?.forecast ?? start.forecast);
    const list = h('ul', { class: 'base__preview' });

    for (const event of events) {
      list.append(
        h(
          'li',
          null,
          `Sol ${event.sol}: `,
          event.summary,
          event.approximate ? ' ' : null,
          event.approximate ? h('span', { class: 'gx__tag', text: 'approximate' }) : null,
        ),
      );
    }

    return h(
      'section',
      { class: 'gx__panel' },
      h('h2', { class: 'gx__h', text: 'Forecast: read ahead' }),
      list,
      h('p', { class: 'gx__note', text: loaded === null ? 'Checking live space-weather data…' : loaded.detail }),
    );
  }

  function render(focusKey?: string): void {
    clear(root);
    const focusable = new Map<string, HTMLElement>();

    const left = h('div', { class: 'base__col' });
    const right = h('div', { class: 'base__col' });

    // ---- Left: the ground, and what the build will do.
    const ground = h('div', { class: 'base__ground', role: 'list', 'aria-label': 'Modules on the surface' });

    for (const kind of CORE_MODULES) {
      const spec = specOf(kind);

      ground.append(
        h('div', { class: 'base__tile base__tile--core', role: 'listitem' }, h('img', { class: 'base__tile-img', src: moduleImage(kind), alt: '' }), spec.name, h('small', { text: 'comes with the lander' })),
      );
    }

    for (const kind of extras) {
      const spec = specOf(kind);

      ground.append(h('div', { class: 'base__tile', role: 'listitem' }, h('img', { class: 'base__tile-img', src: moduleImage(kind), alt: '' }), spec.name));
    }

    const upkeep = upkeepFor(extras, regionId);
    const preview = h('ul', { class: 'base__preview' });

    for (const line of previewFor(extras, regionId)) {
      preview.append(h('li', null, h('strong', { class: `gx__tone-${line.tone}`, text: `${line.label}: ` }), line.text));
    }

    left.append(
      h('section', { class: 'gx__panel' }, h('h2', { class: 'gx__h', text: 'Your outpost' }), ground),
      h(
        'section',
        { class: 'gx__panel', 'aria-live': 'polite' },
        h('h2', { class: 'gx__h', text: 'What a normal sol will do' }),
        preview,
        h('p', { class: 'gx__note', text: `Panels make ${upkeep.dayGeneration} kWh a day. The outpost uses ${upkeep.dailyDemand} kWh. Batteries cover ${upkeep.nightHoursCovered} of 12 night hours.` }),
      ),
      warnings(),
    );

    // ---- Right: the catalogue.
    const left_points = pointsLeft(extras);
    const catalogue = h('section', { class: 'gx__panel' }, h('h2', { class: 'gx__h', text: 'Build new module' }));

    catalogue.append(
      h(
        'p',
        { class: 'base__budget' },
        h('span', { text: `Build points left: ${left_points} of ${BUILD_BUDGET}` }),
        h('span', { text: `Room: ${extras.length} of ${extraSlots(regionId)} extra modules` }),
      ),
    );

    for (const spec of BUILDABLE) {
      const have = extras.filter((kind) => kind === spec.kind).length;
      const placement = canPlace(spec.kind, extras, regionId);
      const add = h('button', { class: 'gx__btn', type: 'button', 'aria-label': `Add ${spec.name}`, disabled: !placement.ok }, '+');
      const remove = h('button', { class: 'gx__btn', type: 'button', 'aria-label': `Remove ${spec.name}`, disabled: have === 0 }, '−');

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

      catalogue.append(
        h(
          'div',
          { class: 'base__card' },
          h('img', { class: 'base__card-img', src: moduleImage(spec.kind), alt: '' }),
          h('div', null, h('p', { class: 'base__card-name', text: `${spec.name} · ${spec.cost} pts` }), h('p', { class: 'base__card-line', text: `Gives: ${spec.gives}` }), h('p', { class: 'base__card-line', text: `Costs: ${spec.needs}` })),
          h('div', { class: 'base__stepper' }, remove, h('span', { class: 'base__count', text: String(have) }), add),
          !placement.ok && have === 0 ? h('p', { class: 'base__card-why', text: placement.reason }) : null,
        ),
      );
    }

    const launch = h('button', { class: 'gx__btn gx__btn--primary', type: 'button' }, 'Land the outpost: start sol 1');

    launch.addEventListener('click', () => {
      const forecast = loaded?.forecast ?? start.forecast;
      const prepared = withState(start, { forecast: forecast.length > 0 ? forecast : createForecast([]) });
      const landed = startOutpost(prepared, [...CORE_MODULES, ...extras]);

      setRun(landed);
      navigate(nextStop('base') ?? 'act');
    });

    right.append(
      catalogue,
      h('div', { class: 'base__footer' }, launch, h('span', { class: 'gx__note', text: BUDGET_NONE })),
    );

    root.append(left, right);

    if (focusKey !== undefined) focusable.get(focusKey)?.focus();
  }

  mount.replaceChildren(
    h(
      'header',
      { class: 'gx__top' },
      h(
        'div',
        null,
        h('p', { class: 'gx__kicker', text: 'Step 2 of 3' }),
        h('h1', { class: 'gx__title', text: 'Build your outpost' }),
        h('p', { class: 'gx__sub', text: `${region ? region.name : 'Mars'}: everything you add uses power, and you cannot bring everything.` }),
      ),
    ),
    root,
  );

  render();

  void loadForecast(controller.signal).then((result) => {
    if (disposed) return;

    loaded = result;
    setRun(withState(start, { forecast: result.forecast }));
    render();
  });

  return () => {
    disposed = true;
    controller.abort();
    mount.classList.remove('gx', 'base');
    mount.replaceChildren();
  };
}
