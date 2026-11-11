import { describe, expect, it } from 'vitest';

import { createForecast } from './forecast';
import { CORE_MODULES, type ModuleKind } from './modules';
import { answerRoverFind, newRun, startOutpost, withState, type RunState } from './run';
import { advanceSol } from './sol';
import {
  canDiscover,
  collectMaterial,
  deployRover,
  discover,
  FIND_SCIENCE,
  leaveMaterial,
  logSite,
  newRover,
  pickForSol,
  recallRover,
  remainingFinds,
  ROVER_FINDS,
  type RoverFind,
} from './rover';

function find(id: string, kind: RoverFind['kind']): RoverFind {
  return {
    id,
    kind,
    title: id,
    where: 'Somewhere on Mars',
    when: '1976',
    alt: 'A picture',
    story: 'A story.',
    fact: 'A fact.',
    credit: 'NASA',
    imageUrl: 'https://example.test/a.jpg',
    sourceUrl: 'https://example.test/a',
  };
}

const CATALOGUE: readonly RoverFind[] = [find('site-a', 'site'), find('rock-b', 'material'), find('site-c', 'site')];

describe('deploy and recall', () => {
  it('starts at base with nothing found', () => {
    const rover = newRover();

    expect(rover.phase).toBe('stowed');
    expect(rover.pending).toBeNull();
    expect(rover.found).toEqual([]);
  });

  it('deploys, and deploying again changes nothing', () => {
    const out = deployRover(newRover(), 1);

    expect(out.phase).toBe('exploring');
    expect(deployRover(out, 1)).toBe(out);
  });

  it('recalls, and recalling at base changes nothing', () => {
    const home = recallRover(deployRover(newRover(), 1));

    expect(home.phase).toBe('stowed');
    expect(recallRover(home)).toBe(home);
  });

  it('will not come home while a find is waiting to be answered', () => {
    const waiting = discover(deployRover(newRover(), 1), CATALOGUE, 0);
    const home = recallRover(waiting);

    expect(home).toBe(waiting);
    expect(home.phase).toBe('exploring');
    expect(home.pending).not.toBeNull();
  });

  it('comes home once the find has been answered', () => {
    const answered = logSite(discover(deployRover(newRover(), 1), CATALOGUE, 0));
    const home = recallRover(answered);

    expect(home.phase).toBe('stowed');
    expect(home.pending).toBeNull();
  });
});

describe('discover', () => {
  it('finds nothing while the rover is at base', () => {
    const rover = newRover();

    expect(canDiscover(rover, CATALOGUE)).toBe(false);
    expect(discover(rover, CATALOGUE, 0)).toBe(rover);
  });

  it('picks from what is left using the pick number', () => {
    const out = deployRover(newRover(), 1);

    expect(discover(out, CATALOGUE, 0).pending?.id).toBe('site-a');
    expect(discover(out, CATALOGUE, 0.5).pending?.id).toBe('rock-b');
    expect(discover(out, CATALOGUE, 0.99).pending?.id).toBe('site-c');
  });

  it('survives a pick outside 0-1', () => {
    const out = deployRover(newRover(), 1);

    expect(discover(out, CATALOGUE, 5).pending?.id).toBe('site-c');
    expect(discover(out, CATALOGUE, -1).pending?.id).toBe('site-a');
  });

  it('holds one find at a time', () => {
    const first = discover(deployRover(newRover(), 1), CATALOGUE, 0);

    expect(canDiscover(first, CATALOGUE)).toBe(false);
    expect(discover(first, CATALOGUE, 0.5)).toBe(first);
  });

  it('never finds the same thing twice, and runs dry', () => {
    let rover = deployRover(newRover(), 1);
    const seen: string[] = [];

    for (let i = 0; i < CATALOGUE.length; i += 1) {
      rover = discover(rover, CATALOGUE, 0);
      const pending = rover.pending;

      expect(pending).not.toBeNull();
      seen.push(pending?.id ?? '');
      rover = pending?.kind === 'site' ? logSite(rover) : collectMaterial(rover);
    }

    expect(new Set(seen).size).toBe(CATALOGUE.length);
    expect(remainingFinds(rover, CATALOGUE)).toEqual([]);
    expect(canDiscover(rover, CATALOGUE)).toBe(false);
    expect(discover(rover, CATALOGUE, 0)).toBe(rover);
  });

  it('does not repeat a find after the rover is recalled and sent out again', () => {
    const first = discover(deployRover(newRover(), 1), CATALOGUE, 0);
    const again = deployRover(recallRover(logSite(first)), 2);

    expect(discover(again, CATALOGUE, 0).pending?.id).toBe('rock-b');
  });
});

describe('answering a find', () => {
  const siteFound = discover(deployRover(newRover(), 1), CATALOGUE, 0);
  const rockFound = discover(deployRover(newRover(), 1), CATALOGUE, 0.5);

  it('logs a site', () => {
    const next = logSite(siteFound);

    expect(next.pending).toBeNull();
    expect(next.visited).toEqual(['site-a']);
  });

  it('collects a material', () => {
    const next = collectMaterial(rockFound);

    expect(next.pending).toBeNull();
    expect(next.collected).toEqual(['rock-b']);
  });

  it('lets a material be, and it still counts as found', () => {
    const next = leaveMaterial(rockFound);

    expect(next.pending).toBeNull();
    expect(next.left).toEqual(['rock-b']);
    expect(next.collected).toEqual([]);
    expect(next.found).toContain('rock-b');
  });

  it('cannot collect a site or log a material', () => {
    expect(collectMaterial(siteFound)).toBe(siteFound);
    expect(leaveMaterial(siteFound)).toBe(siteFound);
    expect(logSite(rockFound)).toBe(rockFound);
  });

  it('does nothing when nothing is waiting', () => {
    const rover = deployRover(newRover(), 1);

    expect(logSite(rover)).toBe(rover);
    expect(collectMaterial(rover)).toBe(rover);
    expect(leaveMaterial(rover)).toBe(rover);
  });
});

describe('the sol the rover is on', () => {
  it('comes back the sol after it went out', () => {
    const out = deployRover(newRover(), 4);

    expect(out.returnsOn).toBe(5);
  });

  it('stops saying when it is back once it is recalled', () => {
    const home = recallRover(deployRover(newRover(), 4));

    expect(home.returnsOn).toBeNull();
  });

  it('picks the same find on the same sol', () => {
    const first = pickForSol(7, 5);
    const again = pickForSol(7, 5);

    expect(first).toBe(again);
    expect(first).toBeGreaterThanOrEqual(0);
    expect(first).toBeLessThan(1);
  });

  it('walks through the catalogue rather than picking the same one twice', () => {
    const picks = [1, 2, 3, 4, 5].map((sol) => pickForSol(sol, 5));

    expect(new Set(picks).size).toBeGreaterThan(1);
  });

  it('copes with nothing left to find', () => {
    expect(pickForSol(3, 0)).toBe(0);
  });
});

/*
 * The finds are the one place in the game that loads pictures from the open
 * web, so the addresses are checked here rather than discovered in a browser.
 *
 * Photojournal's old `photojournal.jpl.nasa.gov/jpeg/<PIA>.jpg` address now
 * redirects to a web page instead of serving an image, which silently cost
 * every rover picture. These tests cannot follow a redirect, but they do hold
 * the address in place: if NASA's picture host changes again, this fails and
 * points at the file to fix.
 */
const CDN = 'https://assets.science.nasa.gov/dynamicimage/assets/science/psd/photojournal/pia/';

describe('the rover finds', () => {
  it('has finds to find', () => {
    expect(ROVER_FINDS.length).toBeGreaterThan(0);
  });

  it('gives every find its own id, so nothing is found twice', () => {
    const ids = ROVER_FINDS.map((find) => find.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('serves every picture from NASA\'s picture host', () => {
    for (const find of ROVER_FINDS) {
      expect(find.imageUrl.startsWith(CDN)).toBe(true);
    }
  });

  it('has both kinds of find, so the player has a choice to make', () => {
    const kinds = new Set(ROVER_FINDS.map((find) => find.kind));

    expect(kinds.has('site')).toBe(true);
    expect(kinds.has('material')).toBe(true);
  });
});

/*
 * The rover is part of the run, not a window floating over it. It is sent out
 * by a work order like any other, it moves on sol time, and it comes back
 * with a document on the desk.
 */
describe('the rover in a run', () => {
  function outpost(extras: readonly ModuleKind[] = []): RunState {
    const forecast = createForecast([], 6);

    return startOutpost(withState(newRun('jezero', 'Tester'), { forecast }), [...CORE_MODULES, ...extras]);
  }

  it('starts at base', () => {
    const run = outpost();

    expect(run.rover.phase).toBe('stowed');
    expect(run.rover.pending).toBeNull();
  });

  it('goes out when the exploring order is approved, and is due back next sol', () => {
    let run = withState(outpost(), { chosenActivity: 'survey' });

    run = advanceSol(run);

    expect(run.rover.phase).toBe('exploring');
    expect(run.rover.returnsOn).toBe(2);
  });

  it('brings a find back, and the find waits on the desk', () => {
    let run = withState(outpost(), { chosenActivity: 'survey' });

    run = advanceSol(run);

    expect(run.rover.pending).not.toBeNull();
    expect(run.rover.pending?.id).not.toBe('');
  });

  it('finds nothing twice', () => {
    let run = outpost();
    const seen = new Set<string>();

    for (let sol = 0; sol < 4; sol += 1) {
      run = advanceSol(withState(run, { chosenActivity: 'survey' }));
      seen.add(run.rover.pending?.id ?? '');
      run = answerRoverFind(run, 'log');
    }

    expect(seen.size).toBeGreaterThan(1);
  });

  it('answers a find, and the science goes up', () => {
    let run = withState(outpost(), { chosenActivity: 'survey' });

    run = advanceSol(run);

    const before = run.science;
    const answered = answerRoverFind(run, 'log');

    expect(answered.rover.pending).toBeNull();
    expect(answered.science).toBe(before + FIND_SCIENCE);
  });

  it('will not answer a find with the wrong answer', () => {
    let run = withState(outpost(), { chosenActivity: 'survey' });

    run = advanceSol(run);

    /* A site cannot be collected and a rock cannot be logged, so one of the
       two answers has to do nothing. */
    const wrong = run.rover.pending?.kind === 'site' ? 'collect' : 'log';
    const answered = answerRoverFind(run, wrong);

    expect(answered).toBe(run);
  });
});
