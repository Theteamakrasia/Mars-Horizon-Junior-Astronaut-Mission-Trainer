/**
 * How to play: the guide.
 *
 * The game is a strategy game about keeping five systems running, and a
 * child who has never seen it has no idea what a "work order" is, what the
 * two readings under one are for, or what happens when they press the button
 * at the bottom.
 *
 * So the steps live here as data, where they can be read and tested, and the
 * screens draw them. The guide is also the answer to "how do I follow this",
 * which does not stop mattering after the first sol: the desk fills up with
 * orders, a board of rules, a letter from home and a document from the
 * rover, and a child who has lost the thread needs a way back in.
 *
 * Pure. No DOM, no randomness.
 */

/** Where a step happens on the screen, so the guide can say it plainly. */
export type GuideWhere = 'desk' | 'board' | 'recap' | 'build' | 'tool';

/** One step of the guide. */
export interface GuideStep {
  readonly id: string;
  /** The name of the thing on the screen. */
  readonly title: string;
  /** What to do about it, in one or two sentences a child can read. */
  readonly body: string;
  /** Where it is. */
  readonly where: GuideWhere;
}

/**
 * The steps, in the order they meet the player.
 *
 * The first three are the job, and they are worth reading: a child who
 * knows they are keeping five things alive and that a sol is one Mars day
 * can work out the rest for themselves.
 */
export const GUIDE_STEPS: readonly GuideStep[] = [
  {
    id: 'job',
    title: 'Your job',
    body: 'Keep the crew alive for twelve sols. A sol is one Mars day, and it is 24 hours and 39 minutes long.',
    where: 'recap',
  },
  {
    id: 'systems',
    title: 'Five things to keep working',
    body: 'The panels, the air and water, the shield, the power and the food. That is the whole mission.',
    where: 'board',
  },
  {
    id: 'orders',
    title: "Today's work orders",
    body: 'Three of them, on the desk. Each one says what it costs and what it gives. You approve one.',
    where: 'desk',
  },
  {
    id: 'checks',
    title: 'The two readings',
    body: 'Under each order are two numbers to compare. Look at them before you stamp it, or the day can go wrong.',
    where: 'desk',
  },
  {
    id: 'power',
    title: 'The power budget',
    body: 'Each sol the panels make power and the outpost needs it. What is left is what a job may cost. A red number means you are running down.',
    where: 'desk',
  },
  {
    id: 'night',
    title: 'The night',
    body: 'Half of every sol is dark, and the night takes its power from the batteries. Every price on the screen tells you what the night will need.',
    where: 'desk',
  },
  {
    id: 'tool',
    title: 'Working an order',
    body: 'Some orders have a tool. Work it and you win stars, and stars make the order worth more science.',
    where: 'tool',
  },
  {
    id: 'board',
    title: 'The standing orders',
    body: 'The rules you work to. Two more arrive every sol, and by the end there are twenty-four of them.',
    where: 'board',
  },
  {
    id: 'training',
    title: 'Training',
    body: 'Two games a sol open the day orders. The same game twice counts as both and pays both times, so practise the one you need.',
    where: 'board',
  },
  {
    id: 'build',
    title: 'Before you land',
    body: 'You choose the outpost. The screen says which of the five things each module helps with.',
    where: 'build',
  },
  {
    id: 'recap',
    title: 'What the sol did',
    body: 'The review at the top of the panel is what changed, and why. It is the first thing to read.',
    where: 'recap',
  },
  {
    id: 'rover',
    title: 'The rover',
    body: 'Send it out and it comes back with something real from Mars: a place from the past, or a rare rock.',
    where: 'desk',
  },
  {
    id: 'score',
    title: 'Science points',
    body: 'Every order you approve earns science points, and stars make them worth more. The points make your rank.',
    where: 'recap',
  },
];

/** The step with this id, or null. */
export function guideStep(id: string): GuideStep | null {
  return GUIDE_STEPS.find((step) => step.id === id) ?? null;
}
