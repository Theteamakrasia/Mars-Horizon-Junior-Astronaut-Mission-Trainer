/**
 * The systems a fact or an activity can be about.
 *
 * Shared vocabulary, so it lives in `sim/`: that is the only layer every other
 * layer may import (R-1, R-2), and both the activity catalogue
 * (`sim/activities.ts`) and the NASA fact library (`data/nasaGallery.ts`) need
 * the same list. A topic is not a rule, so there is nothing here that can go
 * wrong at runtime.
 *
 * Pure. No DOM, no network, no randomness.
 */

/**
 * What a lesson is about.
 *
 * `missions` is the catch-all for the science that is not about a system:
 * rovers, experiments, and looking at the sky. The other five are the five
 * science goals the game is about, one topic each, so a screen teaching about
 * dust never shows a fact about food.
 */
export type ScienceTopic = 'power' | 'dust' | 'water' | 'food' | 'radiation' | 'missions';

/** Every topic, in a fixed order so a screen can lay them out. */
export const SCIENCE_TOPICS: readonly ScienceTopic[] = ['power', 'dust', 'water', 'food', 'radiation', 'missions'];

/** The name a child reads on a card. */
export const TOPIC_LABEL: Readonly<Record<ScienceTopic, string>> = {
  power: 'Power',
  dust: 'Dust',
  water: 'Water',
  food: 'Food',
  radiation: 'Radiation',
  missions: 'Missions',
};

/** True when the value names a topic. Used by the parsers that read data. */
export function isScienceTopic(value: unknown): value is ScienceTopic {
  return typeof value === 'string' && (SCIENCE_TOPICS as readonly string[]).includes(value);
}
