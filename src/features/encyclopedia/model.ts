/**
 * Pure reference data for the encyclopedia: what each piece of equipment does.
 *
 * The equipment specs come from `sim/modules.ts`. This file stays pure — no
 * DOM, no network — so it can be unit tested and never disagrees with the sim.
 * The real NASA fact for each entry is looked up at render time from
 * `data/nasaGallery.ts` by the view, because a feature model may not import
 * `data/` (see scripts/check-imports.mjs).
 */

import { MODULE_CATALOGUE, specOf, type ModuleKind } from '../../sim/modules';

/** One piece of equipment, as shown in the encyclopedia. */
export interface EncyclopediaEntry {
  readonly kind: ModuleKind;
  readonly name: string;
  readonly emoji: string;
  /** Build points; zero means it comes with the lander. */
  readonly cost: number;
  /** One line shown in the list: what it does. */
  readonly oneLine: string;
  /** Full detail: what it gives. */
  readonly gives: string;
  /** Full detail: what it asks of everything else. */
  readonly needs: string;
  /** Index into `data/nasaGallery.ts` FACTS for the system this equipment serves. */
  readonly nasaFactIndex: number;
}

/** NASA fact index per module kind, matched to the system it serves. */
const NASA_FACT_INDEX: Readonly<Record<ModuleKind, number>> = {
  'solar-array': 4, // dust fine enough to turn sunsets blue — dust buries panels
  habitat: 13, // no global magnetic field, so crews need shielding
  'life-support': 11, // the air is 95% carbon dioxide, so crews bring oxygen
  batteries: 0, // a sol is 24h 39m — energy must last the night
  greenhouse: 6, // Curiosity found evidence Mars once had rivers and lakes
  'ice-miner': 7, // almost all Martian water is frozen, underground
  'regolith-shield': 13, // crews need shielding from space radiation
  'nuclear-unit': 0, // power day and night, whatever the weather
};

/** Every equipment entry, in catalogue order. */
export function entries(): readonly EncyclopediaEntry[] {
  return MODULE_CATALOGUE.map((spec) => ({
    kind: spec.kind,
    name: spec.name,
    emoji: spec.emoji,
    cost: spec.cost,
    oneLine: spec.gives,
    gives: spec.gives,
    needs: spec.needs,
    nasaFactIndex: NASA_FACT_INDEX[spec.kind],
  }));
}

/** One entry, or undefined for an unknown kind. */
export function entryFor(kind: ModuleKind): EncyclopediaEntry | undefined {
  return entries().find((entry) => entry.kind === kind);
}

export { specOf };
export type { ModuleKind };

/** Sanity: every module kind has an encyclopedia entry. */
export function everyKindHasEntry(): boolean {
  return MODULE_CATALOGUE.every((spec) => entryFor(spec.kind) !== undefined);
}

/** Sanity: every entry points at a fact index. */
export function everyEntryHasFactIndex(): boolean {
  return entries().every((entry) => Number.isFinite(entry.nasaFactIndex) && entry.nasaFactIndex >= 0);
}
