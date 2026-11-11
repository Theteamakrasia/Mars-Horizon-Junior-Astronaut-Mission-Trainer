/**
 * The debrief: why the run ended, what was solved early, what caught the player
 * out, and a timeline to check the game's reasoning against.
 *
 * Owns the DOM only. The reasoning is in ./model and refuses to sound sure when it
 * is not. A run never ends on a bare failure message: it ends here, with a reason.
 *
 * Two screens in one, following the Figma frames `66:44` and `66:50`: the debrief
 * itself, and the journal it opens into. The journal is a mode of this screen
 * rather than a route, because it reads the same finished run and has no state of
 * its own.
 */

import { NEXT_HORIZON_CARD, factFor } from '../../data/nasaGallery';
import { lastDetail, lastSource } from '../../data/spaceweather';
import { h } from '../../dom/h';
import { newRun, type RunState } from '../../sim/run';
import { gamePanel, gameScreen, gameSection, gameWorld, moduleArt, moduleFigures, type HudStat, type SignalCard } from '../../ui/gameLoop';
import { nasaCard } from '../../ui/nasaCard';
import { stopReading } from '../../ui/readAloud';
import { navigate } from '../../ui/router';

import '../../styles/game-loop.css';
import './debrief.css';

import batteryUrl from '../../../Assets/images/game-loop/battery-bank.png';
import greenhouseUrl from '../../../Assets/images/game-loop/green-house.png';
import iceMinerUrl from '../../../Assets/images/game-loop/ice-miner.png';
import lifeSupportUrl from '../../../Assets/images/game-loop/life-support.png';
import solarUrl from '../../../Assets/images/game-loop/solar.png';

import { consumptionSummary, explainOutcome, goalOutcomes, lowestPoints, nextSteps, reviewDecisions, scienceDetail, scienceHeadline, scienceReport, timeline, usedApproximateData, wentEmpty, type NextStep } from './model';

const VERDICT_TEXT = { solved: 'Solved early', caught: 'Caught you out', mixed: 'A trade-off' } as const;
const VERDICT_ICON = { solved: '✅', caught: '⚠️', mixed: '🤔' } as const;

/** How each of the five science goals fared, in one word and one picture. */
const GOAL_VERDICT = {
  held: { label: 'Held', icon: '✅' },
  hurt: { label: 'Took damage', icon: '⚠️' },
  failed: { label: 'Failed', icon: '❌' },
} as const;

/** What a store is called when a sentence has to name it. */
const STORE_WORD = { power: 'power', oxygen: 'air', water: 'water', food: 'food', shielding: 'radiation shield' } as const;

/** What the crew asks for next, per store. */
const STORE_ASK = {
  power: 'make more power',
  oxygen: 'protect the air',
  water: 'make more water',
  food: 'grow more food',
  shielding: 'block more radiation',
} as const;

const STORE_ICON = { power: '⚡', oxygen: '🫧', water: '💧', food: '🍞', shielding: '🛡️' } as const;

/** The picture beside a "next time" tip. */
function tipArt(step: NextStep): HTMLElement {
  if (step.art === 'choice') return h('span', { class: 'debrief__tip-glyph', 'aria-hidden': 'true', text: '📦' });
  if (step.art === 'site') return h('span', { class: 'debrief__tip-glyph', 'aria-hidden': 'true', text: '🏔' });

  return h('img', { class: 'debrief__tip-img', src: moduleArt(step.art), alt: '' });
}

function tips(steps: readonly NextStep[]): HTMLElement {
  const list = h('div', { class: 'debrief__tips' });

  for (const step of steps) {
    list.append(
      h(
        'div',
        { class: 'debrief__tip' },
        tipArt(step),
        h('div', null, h('p', { class: 'debrief__tip-title', text: step.title }), h('p', { class: 'debrief__tip-detail', text: step.detail })),
      ),
    );
  }

  return list;
}

export function mountDebrief(
  mount: HTMLElement,
  run: RunState | null,
  setRun: (next: RunState | null) => void,
): () => void {
  let mode: 'debrief' | 'journal' = 'debrief';

  function again(): void {
    setRun(newRun('', run?.astronautName ?? 'Astronaut'));
    navigate('landing-site');
  }

  function showDebrief(): void {
    mode = 'debrief';
    render('journal-link');
  }

  function showJournal(): void {
    mode = 'journal';
    render('back-link');
  }

  function hudFor(state: RunState): readonly HudStat[] {
    const totals = consumptionSummary(state);
    const lows = lowestPoints(state);
    const toneFor = (value: number): HudStat['tone'] => (value < 15 ? 'bad' : value < 40 ? 'warn' : 'ok');
    const blackouts = totals.blackoutSols;

    return [
      {
        icon: '⚡',
        label: 'Power',
        value: blackouts === 0 ? 'No blackouts' : `${blackouts} blackout${blackouts === 1 ? '' : 's'}`,
        tone: blackouts === 0 ? 'ok' : 'bad',
      },
      { icon: STORE_ICON.oxygen, label: 'Air · lowest', value: String(lows.oxygen), tone: toneFor(lows.oxygen) },
      { icon: STORE_ICON.water, label: 'Water · lowest', value: String(lows.water), tone: toneFor(lows.water) },
      { icon: STORE_ICON.food, label: 'Food · lowest', value: String(lows.food), tone: toneFor(lows.food) },
      { icon: STORE_ICON.shielding, label: 'Shield · lowest', value: String(lows.shielding), tone: toneFor(lows.shielding) },
    ];
  }

  function renderEmpty(): void {
    const button = h('button', { class: 'gl__btn gl__btn--primary gl__btn--start', type: 'button' }, 'Start a mission', h('span', { class: 'gl__btn-arrow', 'aria-hidden': 'true', text: '→' }));

    button.addEventListener('click', again);

    const world = gameWorld({
      label: 'Mission paused',
      weather: 'No sols flown',
      crew: "We haven't flown yet. Shall we?",
      figures: [],
    });

    const panel = gamePanel({
      kicker: 'Mission debrief',
      title: 'Nothing to debrief yet',
      sub: 'Play at least one sol first.',
      body: [h('p', { class: 'gl__body', text: 'A debrief explains a run from what actually happened. There is no run to explain, so here is a fresh start instead.' })],
      footer: [button],
    });

    mount.replaceChildren(gameScreen({ hud: [], world, panel, variant: 'gl--debrief', headerSub: 'MISSION DEBRIEF', onLeave: () => navigate('naming') }));
  }

  /** The world's one hero card: how long the crew lasted, or the science behind it. */
  function heroCard(state: RunState): SignalCard {
    if (mode === 'debrief') {
      const sols = consumptionSummary(state).sols;

      return { icon: '✦', hero: true, kicker: 'You explored for', text: `${sols} Mars day${sols === 1 ? '' : 's'}`, detail: 'Every try teaches you something new.' };
    }

    const reviews = reviewDecisions(state);
    const lesson = reviews.find((review) => review.verdict === 'caught') ?? reviews[reviews.length - 1];

    return lesson === undefined
      ? { icon: '🛰', hero: true, kicker: 'A little real Mars science', text: 'Mars has no global magnetic shield.', detail: 'So the crew has to shelter from solar flares with soil and walls.' }
      : { icon: '🛰', hero: true, kicker: 'A little real Mars science', text: lesson.science };
  }

  /** The science score, beside the outcome rather than mixed into it. */
  function scienceSignal(state: RunState): SignalCard {
    const science = scienceReport(state);

    return {
      icon: science.rank.icon,
      kicker: 'Science',
      text: `${science.points} points · ${science.rank.title}`,
      detail: science.next === null ? 'Top rank reached.' : `${science.toNext} more to reach ${science.next.title}.`,
      tone: 'good',
    };
  }

  function worldFor(state: RunState): HTMLElement {
    const empty = wentEmpty(state);
    const won = state.status === 'won';

    if (mode === 'journal') {
      return gameWorld({
        label: 'Mission memories',
        weather: 'Adventure journal',
        weatherIcon: '📖',
        crew: "Every choice changed our adventure. Here's our story!",
        crewLabel: 'Your crewmate',
        signals: [heroCard(state)],
        figures: moduleFigures(state.modules),
        hint: 'Your full sol log and the space-weather notes are below.',
        });
    }

    return gameWorld({
      label: won ? 'Mission complete' : 'Mission paused',
      weather: empty === null ? 'All systems held' : `${STORE_WORD[empty]} needs a refill`,
      weatherIcon: empty === null ? '✅' : STORE_ICON[empty],
      crew: won ? "We made it! Let's try somewhere harder next time." : `We learned a lot! Next time, let's ${STORE_ASK[empty ?? 'water']}.`,
      signals: [heroCard(state), scienceSignal(state)],
      figures: moduleFigures(state.modules),
    });
  }

  function debriefPanel(state: RunState): HTMLElement {
    const explanation = explainOutcome(state);
    const steps = nextSteps(state);
    const science = scienceReport(state);
    const won = state.status === 'won';

    const outcome = h(
      'div',
      { class: 'gl__callout', 'data-tone': won ? 'plain' : 'peach' },
      h('span', { class: 'gl__callout-icon', 'aria-hidden': 'true', text: won ? '🏆' : STORE_ICON[wentEmpty(state) ?? 'water'] }),
      h(
        'div',
        null,
        h('p', { class: 'gl__callout-title', text: explanation.headline }),
        h('p', { class: 'gl__callout-detail', text: won ? 'The crew got through. Try a new site or a tighter budget.' : 'The adventure ends here — but you can try again.' }),
      ),
    );

    /* The science score: what the run earned, and what the crew did to earn
       it. It is a separate thing from winning, and it says so. */
    const scienceList = h('ul', { class: 'gl__list' });

    for (const row of science.activities) {
      scienceList.append(h('li', { text: `Sol ${row.sol}: ${row.title} (+${row.points})` }));
    }

    if (science.activities.length === 0) {
      scienceList.append(h('li', { text: 'No activities were chosen, so no science was done.' }));
    }

    if (science.crisisSols.length > 0) {
      scienceList.append(
        h('li', { text: `Sol ${science.crisisSols.join(', ')}: spent on a crisis instead of an activity.` }),
      );
    }

    if (science.quietSols.length > 0) {
      scienceList.append(
        h('li', { text: `Sol ${science.quietSols.join(', ')}: nothing was chosen, so no science was done.` }),
      );
    }

    const scienceCard = h(
      'div',
      { class: 'gl__callout', 'data-tone': 'plain' },
      h('span', { class: 'gl__callout-icon', 'aria-hidden': 'true', text: science.rank.icon }),
      h(
        'div',
        null,
        h('p', { class: 'gl__callout-title', text: `${science.points} science points` }),
        h('p', { class: 'gl__callout-detail', text: `${scienceHeadline(science)} ${scienceDetail(science)}` }),
      ),
    );

    const whatHappened = gameSection(
      'What happened?',
      h('p', { class: 'gl__body', text: explanation.detail }),
      explanation.confident ? null : h('p', { class: 'gl__note', text: 'The game is not sure about this one. The journal lists every sol so you can work out the cause yourself.' }),
    );

    /* The five science goals, read back as science: what the dust did, how far
       the shielding fell, whether the greenhouse kept up. */
    const goals = h('ul', { class: 'debrief__goals' });

    for (const outcome of goalOutcomes(state)) {
      const verdict = GOAL_VERDICT[outcome.verdict];

      goals.append(
        h(
          'li',
          { class: 'debrief__goal', 'data-verdict': outcome.verdict },
          h('span', { class: 'debrief__goal-icon', 'aria-hidden': 'true', text: verdict.icon }),
          h(
            'div',
            null,
            h(
              'span',
              { class: 'debrief__goal-title' },
              `${outcome.title} — ${verdict.label}`,
              h('small', { class: 'debrief__goal-count', text: ` ${outcome.held} of ${state.log.length} sols` }),
            ),
            h('p', { class: 'debrief__goal-detail', text: outcome.detail }),
          ),
        ),
      );
    }

    const goalSection = gameSection(
      'The five systems you kept running',
      goals,
      h('p', { class: 'gl__note', text: 'Dust, life support, radiation, power and food — the whole mission is these five things.' }),
    );

    const replay = h(
      'button',
      { class: 'gl__btn gl__btn--primary gl__btn--start', type: 'button' },
      'Try a new outpost',
      h('span', { class: 'gl__btn-arrow', 'aria-hidden': 'true', text: '→' }),
    );
    const journalLink = h('button', { class: 'gl__link', type: 'button', 'data-focus': 'journal-link' }, 'View my Mars story', h('span', { 'aria-hidden': 'true', text: '›' }));
    const menuLink = h('button', { class: 'gl__link', type: 'button' }, 'Main menu');

    replay.addEventListener('click', again);
    journalLink.addEventListener('click', showJournal);
    menuLink.addEventListener('click', () => navigate('naming'));

    const panel = gamePanel({
      kicker: 'Mission debrief',
      title: `${consumptionSummary(state).sols} sols. So much learned!`,
      body: [
        outcome,
        whatHappened,
        goalSection,
        gameSection('Mars Science Score', scienceCard, scienceList),
        gameSection('Next time, try…', tips(steps)),
        gameSection('NASA fact', h('p', { class: 'gl__note', text: `${factFor(consumptionSummary(state).sols).text} (${factFor(consumptionSummary(state).sols).credit})` })),
        nasaCard(NEXT_HORIZON_CARD, 'A real NASA idea · Where this could lead'),
      ],
      footer: [replay, h('div', { class: 'debrief__links' }, journalLink, menuLink)],
    });

    return panel;
  }

  function journalPanel(state: RunState): HTMLElement {
    const explanation = explainOutcome(state);
    const reviews = reviewDecisions(state);
    const totals = consumptionSummary(state);
    const lows = lowestPoints(state);
    const step = nextSteps(state, 1)[0];
    const won = state.status === 'won';

    const entries = h('div', { class: 'debrief__entries' });

    if (reviews.length === 0) {
      entries.append(h('p', { class: 'gl__note', text: 'No crisis came up before the run ended, so the crew never had to choose.' }));
    }

    for (const review of reviews) {
      entries.append(
        h(
          'div',
          { class: 'gl__entry', 'data-tone': review.verdict === 'caught' ? 'peach' : 'plain' },
          h('span', { class: 'gl__entry-icon', 'aria-hidden': 'true', text: VERDICT_ICON[review.verdict] }),
          h(
            'div',
            null,
            h('span', { class: 'gl__entry-sol', text: `Sol ${review.sol} · ${VERDICT_TEXT[review.verdict]}` }),
            h('p', { class: 'gl__entry-title', text: `${review.chose}${review.timedOut ? ' (the clock ran out)' : ''}` }),
            h('p', { class: 'gl__entry-detail', text: review.why }),
          ),
        ),
      );
    }

    entries.append(
      h(
        'div',
        { class: 'gl__entry', 'data-tone': won ? 'plain' : 'peach' },
        h('span', { class: 'gl__entry-icon', 'aria-hidden': 'true', text: won ? '🏆' : STORE_ICON[wentEmpty(state) ?? 'water'] }),
        h(
          'div',
          null,
          h('span', { class: 'gl__entry-sol', text: `Sol ${totals.sols} · ${won ? 'Mission complete' : 'Mission ended'}` }),
          h('p', { class: 'gl__entry-title', text: explanation.headline }),
          h('p', { class: 'gl__entry-detail', text: `Next adventure: ${step.title.toLowerCase()}.` }),
        ),
      ),
    );

    const stats = h('dl', { class: 'gl__stats' });
    const science = scienceReport(state);
    const rows: readonly (readonly [string | null, string, string])[] = [
      [null, 'Sols played', String(totals.sols)],
      [null, 'Science points', `${science.points} (${science.rank.title})`],
      [lifeSupportUrl, 'Crew breathed', `${totals.crewOxygen} oxygen`],
      [iceMinerUrl, 'Crew drank', `${totals.crewWater} water`],
      [greenhouseUrl, 'Crew ate', `${totals.crewFood} food`],
      [solarUrl, 'Power made', `${totals.powerGenerated} kWh`],
      [batteryUrl, 'Power wasted', `${totals.powerWasted} kWh (batteries were full)`],
      [batteryUrl, 'Sols with a blackout', String(totals.blackoutSols)],
      [null, 'Thinnest margins', `air ${lows.oxygen}, water ${lows.water}, food ${lows.food}, shield ${lows.shielding}`],
    ];

    for (const [icon, label, value] of rows) {
      stats.append(
        h('dt', null, icon === null ? null : h('img', { class: 'gl__stat-icon-img', src: icon, alt: '' }), label),
        h('dd', { text: value }),
      );
    }

    const table = h('table', { class: 'gl__table' });

    table.append(h('thead', null, h('tr', null, ...['Sol', 'Power', 'Air', 'Water', 'Food', 'Shield', 'What happened'].map((title) => h('th', { scope: 'col', text: title })))));

    const body = h('tbody');

    for (const row of timeline(state)) {
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

    const honesty = gameSection(
      'How real is this?',
      h('p', { class: 'gl__body', text: `Flare sizes: ${lastDetail()}${lastSource() === 'fallback' || usedApproximateData(state) ? ' They are marked approximate.' : ''}` }),
      h('p', { class: 'gl__note', text: 'Everything else is a simplified model. The numbers are made up to teach the idea, not copied from a real mission. The real Earth-Mars radio delay is 3 to 22 minutes; the game uses a simple stand-in.' }),
    );

    const replay = h(
      'button',
      { class: 'gl__btn gl__btn--primary gl__btn--start', type: 'button' },
      'Try a different outpost',
      h('span', { class: 'gl__btn-arrow', 'aria-hidden': 'true', text: '→' }),
    );
    const back = h('button', { class: 'gl__link', type: 'button', 'data-focus': 'back-link' }, h('span', { 'aria-hidden': 'true', text: '‹' }), 'Back to the debrief');

    replay.addEventListener('click', again);
    back.addEventListener('click', showDebrief);

    return gamePanel({
      kicker: 'Your adventure journal',
      title: 'Small choices. Big changes.',
      sub: 'The moments that shaped your outpost.',
      body: [entries, gameSection('What the outpost used', stats), gameSection('Every sol, as it happened', h('div', { class: 'gl__table-wrap' }, table)), honesty],
      footer: [replay, back],
    });
  }

  function render(focus?: string): void {
    stopReading();

    if (run === null || run.log.length === 0) {
      renderEmpty();

      return;
    }

    const panel = mode === 'debrief' ? debriefPanel(run) : journalPanel(run);

    mount.replaceChildren(gameScreen({ hud: hudFor(run), world: worldFor(run), panel, variant: 'gl--debrief', headerSub: 'MISSION DEBRIEF', onLeave: () => navigate('naming') }));

    if (focus !== undefined) mount.querySelector<HTMLElement>(`[data-focus="${focus}"]`)?.focus();
  }

  render();

  return () => {
    mount.replaceChildren();
  };
}
