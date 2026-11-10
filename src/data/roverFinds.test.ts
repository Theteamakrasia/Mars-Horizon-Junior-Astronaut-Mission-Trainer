import { describe, expect, it } from 'vitest';

import { ROVER_FINDS } from './roverFinds';

/**
 * The rover's finds are the one place in the game that loads pictures from
 * the open web, so the addresses are checked here rather than discovered in
 * a browser.
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

  it('asks for a picture that fits the screen, not the full-size one', () => {
    for (const find of ROVER_FINDS) {
      expect(find.imageUrl).toContain('?w=');
      expect(find.imageUrl).toContain('h=');
    }
  });

  it('never crops a picture, because a picture is of the whole thing', () => {
    for (const find of ROVER_FINDS) {
      expect(find.imageUrl).toContain('fit=clip');
      expect(find.imageUrl).not.toContain('crop=');
    }
  });

  it('links every picture back to its Photojournal page', () => {
    for (const find of ROVER_FINDS) {
      expect(find.sourceUrl).toMatch(/^https:\/\/photojournal\.jpl\.nasa\.gov\/catalog\/PIA\d{5}$/);
    }
  });

  it('keeps NASA\'s credit line on every picture', () => {
    for (const find of ROVER_FINDS) {
      expect(find.credit.length).toBeGreaterThan(0);
      expect(find.credit).toContain('NASA');
    }
  });

  it('has something to read, somewhere and when, and a way to say it', () => {
    for (const find of ROVER_FINDS) {
      expect(find.title.length).toBeGreaterThan(0);
      expect(find.where.length).toBeGreaterThan(0);
      expect(find.when.length).toBeGreaterThan(0);
      expect(find.alt.length).toBeGreaterThan(0);
      expect(find.story.length).toBeGreaterThan(20);
      expect(find.fact.length).toBeGreaterThan(20);
    }
  });

  it('offers both kinds of find', () => {
    const kinds = new Set(ROVER_FINDS.map((find) => find.kind));

    expect(kinds).toEqual(new Set(['site', 'material']));
  });
});
