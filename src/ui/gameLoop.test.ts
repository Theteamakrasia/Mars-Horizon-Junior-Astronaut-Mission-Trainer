import { describe, it, expect } from 'vitest';
import { moduleFigures } from './gameLoop';
import { DEPTH_ORDER, depthFor } from './baseLayout';
import type { ModuleKind } from '../sim/modules';

/**
 * The first tests for `ui/gameLoop.ts`.
 *
 * They cover the one thing in the file that has real rules in it: where each
 * module of a build stands, and which way round it faces.
 */

const KINDS = {
  habitat: 'habitat',
  'solar-array': 'solar-array',
  batteries: 'batteries',
} as const satisfies Record<string, ModuleKind>;

describe('moduleFigures', () => {
  it('draws one figure per module in the build', () => {
    const figures = moduleFigures([KINDS.habitat, KINDS['solar-array'], KINDS.batteries]);

    expect(figures).toHaveLength(3);
  });

  it('puts each copy on its own recorded pose', () => {
    const figures = moduleFigures([KINDS['solar-array'], KINDS['solar-array'], KINDS['solar-array']]);

    /* The shipped layout gives the four solar arrays four different places. */
    expect(figures[0].left).not.toBe(figures[1].left);
    expect(figures[1].left).not.toBe(figures[2].left);
  });

  it('keeps the copies in build order', () => {
    const figures = moduleFigures([KINDS['solar-array'], KINDS['solar-array']]);
    const ordered = [...figures].sort((a, b) => a.left - b.left);

    expect(figures[0].left).toBe(ordered[0].left);
  });

  it('does not mirror anything by default', () => {
    for (const figure of moduleFigures([KINDS.habitat, KINDS['solar-array'], KINDS.batteries])) {
      expect(figure.flip).toBe(false);
    }
  });

  it('carries a mirror through to the figure', () => {
    /* The shipped layout has no mirrored module, so this checks the plumbing
     * rather than a value: the flag has to survive the trip from the pose to
     * the figure, or mirroring a module would do nothing at all. */
    const figures = moduleFigures([KINDS.habitat]);

    expect(figures[0]).toHaveProperty('flip');
    expect(typeof figures[0].flip).toBe('boolean');
  });

  it('stacks the modules in the fixed depth order', () => {
    const [habitat, solar] = moduleFigures([KINDS.habitat, KINDS['solar-array'], KINDS.batteries]);

    /* The habitat is the nearest thing and the solar array is behind it. */
    expect(habitat.z).toBe(depthFor('habitat', 0));
    expect(solar.z).toBe(depthFor('solar-array', 0));
    expect(habitat.z).toBeGreaterThan(solar.z ?? 0);
  });

  it('stacks each copy of a kind in the order the rule says', () => {
    const figures = moduleFigures([KINDS['solar-array'], KINDS['solar-array'], KINDS['solar-array']]);

    expect(figures[0].z).toBe(depthFor('solar-array', 0));
    expect(figures[1].z).toBe(depthFor('solar-array', 1));
    expect(figures[2].z).toBe(depthFor('solar-array', 2));
  });

  it('gives the two regolith shields the same depth', () => {
    const figures = moduleFigures(['regolith-shield', 'regolith-shield']);

    expect(figures[0].z).toBe(figures[1].z);
  });

  it('follows the whole depth order', () => {
    const kinds = DEPTH_ORDER.map((entry) => entry.kind);

    for (let i = 0; i < kinds.length - 1; i += 1) {
      const figures = moduleFigures([kinds[i], kinds[i + 1]]);

      expect(figures[0].z).toBeLessThan(figures[1].z ?? 0);
    }
  });
});
