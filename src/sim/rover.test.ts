import { describe, expect, it } from 'vitest';

import {
  canDiscover,
  collectMaterial,
  deployRover,
  discover,
  FIRST_FIND_MIN_MS,
  FIRST_FIND_SPREAD_MS,
  leaveMaterial,
  logSite,
  newRover,
  nextFindDelayMs,
  NEXT_FIND_MIN_MS,
  NEXT_FIND_SPREAD_MS,
  recallRover,
  remainingFinds,
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
    const out = deployRover(newRover());

    expect(out.phase).toBe('exploring');
    expect(deployRover(out)).toBe(out);
  });

  it('recalls, and recalling at base changes nothing', () => {
    const home = recallRover(deployRover(newRover()));

    expect(home.phase).toBe('stowed');
    expect(recallRover(home)).toBe(home);
  });

  it('will not come home while a find is waiting to be answered', () => {
    const waiting = discover(deployRover(newRover()), CATALOGUE, 0);
    const home = recallRover(waiting);

    expect(home).toBe(waiting);
    expect(home.phase).toBe('exploring');
    expect(home.pending).not.toBeNull();
  });

  it('comes home once the find has been answered', () => {
    const answered = logSite(discover(deployRover(newRover()), CATALOGUE, 0));
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
    const out = deployRover(newRover());

    expect(discover(out, CATALOGUE, 0).pending?.id).toBe('site-a');
    expect(discover(out, CATALOGUE, 0.5).pending?.id).toBe('rock-b');
    expect(discover(out, CATALOGUE, 0.99).pending?.id).toBe('site-c');
  });

  it('survives a pick outside 0-1', () => {
    const out = deployRover(newRover());

    expect(discover(out, CATALOGUE, 5).pending?.id).toBe('site-c');
    expect(discover(out, CATALOGUE, -1).pending?.id).toBe('site-a');
  });

  it('holds one find at a time', () => {
    const first = discover(deployRover(newRover()), CATALOGUE, 0);

    expect(canDiscover(first, CATALOGUE)).toBe(false);
    expect(discover(first, CATALOGUE, 0.5)).toBe(first);
  });

  it('never finds the same thing twice, and runs dry', () => {
    let rover = deployRover(newRover());
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
    const first = discover(deployRover(newRover()), CATALOGUE, 0);
    const again = deployRover(recallRover(logSite(first)));

    expect(discover(again, CATALOGUE, 0).pending?.id).toBe('rock-b');
  });
});

describe('answering a find', () => {
  const siteFound = discover(deployRover(newRover()), CATALOGUE, 0);
  const rockFound = discover(deployRover(newRover()), CATALOGUE, 0.5);

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
    const rover = deployRover(newRover());

    expect(logSite(rover)).toBe(rover);
    expect(collectMaterial(rover)).toBe(rover);
    expect(leaveMaterial(rover)).toBe(rover);
  });
});

describe('nextFindDelayMs', () => {
  it('is quick for the first find', () => {
    expect(nextFindDelayMs(0, 0)).toBe(FIRST_FIND_MIN_MS);
    expect(nextFindDelayMs(0, 1)).toBe(FIRST_FIND_MIN_MS + FIRST_FIND_SPREAD_MS);
  });

  it('is slower after that', () => {
    expect(nextFindDelayMs(1, 0)).toBe(NEXT_FIND_MIN_MS);
    expect(nextFindDelayMs(3, 1)).toBe(NEXT_FIND_MIN_MS + NEXT_FIND_SPREAD_MS);
  });

  it('clamps a pick outside 0-1', () => {
    expect(nextFindDelayMs(0, -4)).toBe(FIRST_FIND_MIN_MS);
    expect(nextFindDelayMs(2, 9)).toBe(NEXT_FIND_MIN_MS + NEXT_FIND_SPREAD_MS);
  });
});
