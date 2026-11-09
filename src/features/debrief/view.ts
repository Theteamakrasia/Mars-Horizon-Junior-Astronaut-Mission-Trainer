/**
 * The debrief: why the run ended, what was solved early, what caught the player
 * out, and a timeline to check the game's reasoning against.
 *
 * Owns the DOM only. The reasoning is in ./model and refuses to sound sure when it
 * is not. A run never ends on a bare failure message: it ends here, with a reason.
 */

import { lastDetail, lastSource } from '../../data/spaceweather';
import { clear, h } from '../../dom/h';
import { newRun, type RunState } from '../../sim/run';
import { navigate } from '../../ui/router';

import '../../styles/game.css';
import './debrief.css';

import bgDayUrl from '../../../Assets/images/game-loop/bg-day.png';
import greenhouseUrl from '../../../Assets/images/game-loop/green-house.png';
import solarUrl from '../../../Assets/images/game-loop/solar.png';
import lifeSupportUrl from '../../../Assets/images/game-loop/life-support.png';
import iceMinerUrl from '../../../Assets/images/game-loop/ice-miner.png';
import batteryUrl from '../../../Assets/images/game-loop/battery-bank.png';

import { consumptionSummary, explainOutcome, lowestPoints, reviewDecisions, timeline, usedApproximateData } from './model';

const VERDICT_TEXT = { solved: 'Solved early', caught: 'Caught you out', mixed: 'A trade-off' } as const;
const VERDICT_TONE = { solved: 'gx__tone-ok', caught: 'gx__tone-bad', mixed: 'gx__tone-warn' } as const;

export function mountDebrief(
  mount: HTMLElement,
  run: RunState | null,
  setRun: (next: RunState | null) => void,
): () => void {
  mount.classList.add('gx', 'debrief');
  mount.style.background = `linear-gradient(rgba(7, 14, 18, 0.86), rgba(7, 14, 18, 0.94)), url(${bgDayUrl}) center / cover no-repeat`;

  function again(): void {
    setRun(newRun('', run?.astronautName ?? 'Astronaut'));
    navigate('landing-site');
  }

  if (run === null || run.log.length === 0) {
    const button = h('button', { class: 'gx__btn gx__btn--primary', type: 'button' }, 'Start a mission');

    button.addEventListener('click', again);
    mount.replaceChildren(h('header', { class: 'gx__top' }, h('h1', { class: 'gx__title', text: 'Nothing to debrief yet' })), h('p', { text: 'Play at least one sol first.' }), h('div', null, button));

    return () => {
      mount.classList.remove('gx', 'debrief');
      mount.replaceChildren();
    };
  }

  const explanation = explainOutcome(run);
  const totals = consumptionSummary(run);
  const lows = lowestPoints(run);
  const reviews = reviewDecisions(run);

  const banner = h(
    'section',
    { class: 'gx__panel debrief__banner', 'data-status': run.status, 'aria-live': 'polite' },
    h('img', { class: 'debrief__banner-img', src: run.status === 'won' ? greenhouseUrl : solarUrl, alt: '' }),
    h('p', { class: 'gx__kicker', text: run.status === 'won' ? 'Mission complete' : 'Mission ended: debrief' }),
    h('h1', { class: 'gx__title', text: explanation.headline }),
    h('p', { text: explanation.detail }),
    explanation.confident ? null : h('p', { class: 'gx__note', text: 'The game is not sure about this one. The timeline below shows every sol so you can work out the cause yourself.' }),
  );

  const stats = h('section', { class: 'gx__panel' }, h('h2', { class: 'gx__h', text: 'What you used, what you wasted' }));
  const list = h('dl', { class: 'debrief__stats' });
  const rows: readonly (readonly [string | null, string, string])[] = [
    [null, 'Sols played', String(totals.sols)],
    [lifeSupportUrl, 'Crew breathed', `${totals.crewOxygen} oxygen`],
    [iceMinerUrl, 'Crew drank', `${totals.crewWater} water`],
    [greenhouseUrl, 'Crew ate', `${totals.crewFood} food`],
    [solarUrl, 'Power made', `${totals.powerGenerated} kWh`],
    [batteryUrl, 'Power wasted', `${totals.powerWasted} kWh (batteries were full)`],
    [batteryUrl, 'Sols with a blackout', String(totals.blackoutSols)],
    [null, 'Thinnest margins', `air ${lows.oxygen}, water ${lows.water}, food ${lows.food}, shield ${lows.shielding}`],
  ];

  for (const [icon, label, value] of rows) {
    list.append(
      h('dt', null, icon === null ? null : h('img', { class: 'debrief__stat-icon', src: icon, alt: '' }), label),
      h('dd', { text: value }),
    );
  }
  stats.append(list);

  const review = h('section', { class: 'gx__panel' }, h('h2', { class: 'gx__h', text: 'Your decisions' }));

  if (reviews.length === 0) review.append(h('p', { text: 'No crisis came up before the run ended.' }));

  for (const entry of reviews) {
    review.append(
      h(
        'div',
        { class: 'debrief__review' },
        h('span', { class: `debrief__verdict ${VERDICT_TONE[entry.verdict]}`, text: VERDICT_TEXT[entry.verdict] }),
        h('p', null, h('strong', { text: `Sol ${entry.sol}: ${entry.title}. ` }), `You chose: ${entry.chose}${entry.timedOut ? ' (the clock ran out)' : ''}.`),
        h('p', { text: entry.why }),
        h('p', { class: 'gx__note', text: `The real science: ${entry.science}` }),
      ),
    );
  }

  const table = h('table', { class: 'debrief__table' });

  table.append(h('thead', null, h('tr', null, ...['Sol', 'Power', 'Air', 'Water', 'Food', 'Shield', 'What happened'].map((title) => h('th', { scope: 'col', text: title })))));

  const body = h('tbody');

  for (const row of timeline(run)) {
    body.append(
      h(
        'tr',
        null,
        h('td', { text: String(row.sol) }),
        h('td', { text: String(Math.round(row.stores.power)) }),
        h('td', { text: String(Math.round(row.stores.oxygen)) }),
        h('td', { text: String(Math.round(row.stores.water)) }),
        h('td', { text: String(Math.round(row.stores.food)) }),
        h('td', { text: String(Math.round(row.stores.shielding)) }),
        h('td', { text: [row.headline, ...row.notes].join(' ') }),
      ),
    );
  }

  table.append(body);

  const timelinePanel = h('section', { class: 'gx__panel' }, h('h2', { class: 'gx__h', text: 'Timeline' }), h('div', { class: 'debrief__table-wrap' }, table));

  const honesty = h(
    'section',
    { class: 'gx__panel' },
    h('h2', { class: 'gx__h', text: 'How real is this?' }),
    h('p', { text: `Flare sizes: ${lastDetail()}${lastSource() === 'fallback' || usedApproximateData(run) ? ' They are marked approximate.' : ''}` }),
    h('p', { class: 'gx__note', text: 'Everything else is a simplified model. The numbers are made up to teach the idea, not copied from a real mission. The real Earth-Mars radio delay is 3 to 22 minutes; the game uses a simple stand-in.' }),
  );

  const replay = h('button', { class: 'gx__btn gx__btn--primary', type: 'button' }, 'Try a different outpost');
  const menu = h('button', { class: 'gx__btn', type: 'button' }, 'Main menu');

  replay.addEventListener('click', again);
  menu.addEventListener('click', () => navigate('naming'));

  clear(mount);
  mount.append(banner, h('div', { class: 'debrief__cols' }, stats, review), timelinePanel, honesty, h('div', { class: 'debrief__actions' }, replay, menu));

  return () => {
    mount.classList.remove('gx', 'debrief');
    mount.replaceChildren();
  };
}
