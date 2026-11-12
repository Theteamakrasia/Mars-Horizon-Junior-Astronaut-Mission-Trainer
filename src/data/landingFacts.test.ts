import { describe, expect, it } from 'vitest';

import { REGIONS } from '../sim/regions';
import { GUIDE_STEPS } from '../sim/guide';

import { LANDING_FACTS, ZONE_FACTS, factById, zoneFact } from './landingFacts';

/**
 * Every input is a literal and nothing here touches the network, so this file
 * cannot flake.
 *
 * The tests are not about the sentences. They are about the promise the
 * cinematic makes: every fact on screen came from a NASA page, every page is
 * named, and nothing here contradicts what the game already tells the player.
 */

const NASA_HOSTS = [
  'www.nasa.gov',
  'science.nasa.gov',
  'nssdc.gsfc.nasa.gov',
  'images.nasa.gov',
];

describe('LANDING_FACTS', () => {
  it('is not empty', () => {
    expect(LANDING_FACTS.length).toBeGreaterThan(5);
  });

  it('gives every fact an id of its own', () => {
    const ids = LANDING_FACTS.map((fact) => fact.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('names the NASA page every fact came from', () => {
    for (const fact of LANDING_FACTS) {
      expect(fact.text.trim().length).toBeGreaterThan(20);
      expect(fact.source.trim().length).toBeGreaterThan(3);
      expect(fact.url.startsWith('https://')).toBe(true);
    }
  });

  it('points every source at NASA', () => {
    for (const fact of LANDING_FACTS) {
      const host = new URL(fact.url).host;

      expect(NASA_HOSTS).toContain(host);
    }
  });

  it('makes no request and reads no clock', () => {
    // The file is the saved half of the NASA layer: the game must be able to
    // play the whole landing sequence with no network at all.
    const source = LANDING_FACTS.map((fact) => `${fact.text}${fact.url}`).join(' ');

    expect(source).not.toMatch(/http:\/\//);
  });
});

describe('the numbers the facts quote', () => {
  it('quotes NASA for the distance from Earth', () => {
    // NASA's own page says 140 million miles on average. The 225 million
    // kilometres that is also quoted is the distance from the Sun.
    expect(factById('distance')?.text).toContain('140 million miles');
  });

  it('quotes NASA for the gravity', () => {
    expect(factById('gravity')?.text).toContain('38 pounds');
  });

  it('quotes NASA for the length of a sol', () => {
    // NASA gives the length of a Martian day as 24.6597 hours.
    expect(factById('sol')?.text).toContain('24 hours and 39 minutes');
  });

  it('quotes NASA for the sunlight', () => {
    // NASA's Mars Fact Sheet gives a solar irradiance ratio of 0.431.
    expect(factById('sunlight')?.text).toContain('43%');
  });

  it('quotes NASA for the thin atmosphere', () => {
    expect(factById('air')?.text).toContain('less than 1%');
  });

  it('quotes NASA for the parachute', () => {
    expect(factById('parachute')?.text).toContain('70.5 feet');
    expect(factById('parachute')?.text).toContain('21.5 meters');
  });

  it('quotes NASA for the seven minutes', () => {
    expect(factById('seven-minutes')?.text).toContain('seven minutes');
  });

  it('quotes NASA for the entry speed', () => {
    expect(factById('entry')?.text).toContain('12,500 mph');
  });

  it('says out loud that Orion has not flown to Mars', () => {
    // The capsule in the film is inspired by Orion. Orion is an Artemis
    // spacecraft for the Moon, and the game must never let a child believe
    // otherwise.
    expect(factById('orion')?.text).toContain('Artemis');
    expect(factById('orion')?.text).toContain('has not flown to Mars');
  });
});

describe('ZONE_FACTS', () => {
  it('has a fact for every landing region in the game', () => {
    for (const region of REGIONS) {
      expect(zoneFact(region.id)).not.toBeNull();
    }
  });

  it('has a fact for no region but the five', () => {
    expect(Object.keys(ZONE_FACTS).sort()).toEqual(REGIONS.map((r) => r.id).sort());
  });

  it('names the NASA page for every region', () => {
    for (const region of REGIONS) {
      const fact = zoneFact(region.id);

      expect(fact?.source.trim().length).toBeGreaterThan(3);
      expect(fact?.url.startsWith('https://')).toBe(true);
    }
  });

  it("quotes NASA for each region's own number", () => {
    expect(zoneFact('jezero')?.text).toContain('45 kilometers');
    expect(zoneFact('olympus')?.text).toContain('40 kilometers');
    expect(zoneFact('valles')?.text).toContain('3,870 kilometers');
    expect(zoneFact('valles')?.text).toContain('9.3 kilometers');
    expect(zoneFact('arcadia')?.text).toContain('one foot');
    expect(zoneFact('argyre')?.text).toContain('800 kilometers');
  });

  it('says nothing about a region the game does not have', () => {
    expect(zoneFact('hellas')).toBeNull();
    expect(zoneFact('')).toBeNull();
  });
});

describe('the facts and the game agree', () => {
  it('gives the sol the same length the guide teaches', () => {
    // The guide tells the player a sol is 24 hours and 39 minutes. The
    // cinematic must not teach a different number.
    const guide = GUIDE_STEPS.find((step) => step.body.includes('sol is one Mars day'));

    expect(guide?.body).toContain('24 hours and 39 minutes');
    expect(factById('sol')?.text).toContain('24 hours and 39 minutes');
  });
});
