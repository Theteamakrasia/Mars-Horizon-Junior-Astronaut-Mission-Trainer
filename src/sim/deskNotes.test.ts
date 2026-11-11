import { describe, expect, it } from 'vitest';

import { DESK_NOTES, noteForSol } from './deskNotes';
import { SCIENCE_TOPICS } from './topics';

/*
 * The notes are the warm part of the game, and the thing that keeps twelve
 * sols from being twelve of the same sol. They must be spread out, they must
 * be short, and nothing in them may be sad: losing costs resources in this
 * game and never a life, and a note that hinted at anything worse would break
 * that rule in the reader's head if not in the code.
 */
describe('the notes on the desk', () => {
  it('has notes to leave', () => {
    expect(DESK_NOTES.length).toBeGreaterThan(4);
  });

  it('gives every note its own id', () => {
    const ids = DESK_NOTES.map((note) => note.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps every note short enough to read at a glance', () => {
    for (const note of DESK_NOTES) {
      expect(note.text.length).toBeGreaterThan(30);
      expect(note.text.length).toBeLessThan(240);
    }
  });

  it('names who it is from', () => {
    for (const note of DESK_NOTES) {
      expect(note.who.length).toBeGreaterThan(2);
    }
  });

  it('spreads them out, so some sols are quiet and some are not', () => {
    const sols = new Set(DESK_NOTES.map((note) => note.sol));

    expect(sols.size).toBe(DESK_NOTES.length);
    expect(sols.size).toBeLessThan(12);
  });

  it('has a note from home and one from the crew', () => {
    const from = new Set(DESK_NOTES.map((note) => note.from));

    expect(from.has('home')).toBe(true);
    expect(from.has('crew')).toBe(true);
  });

  it('files every topic under one the game knows', () => {
    for (const note of DESK_NOTES) {
      if (note.topic === undefined) continue;

      expect(SCIENCE_TOPICS).toContain(note.topic);
    }
  });

  it('finds the note for a sol, and nothing for a quiet one', () => {
    expect(noteForSol(2)).not.toBeNull();
    expect(noteForSol(1)).toBeNull();
    expect(noteForSol(99)).toBeNull();
  });
});
