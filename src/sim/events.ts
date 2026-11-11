/**
 * Baked-in space-weather and mission events, all labelled `approximate: true`.
 *
 * Pure: no DOM, no network, no randomness. Imports only `sim/`.
 *
 * Because DONKI CORS is unverified (ISS-008) and the README promises honesty
 * about estimates, every event here is baked-in data and every event carries
 * `approximate: true`. The UI must show that label wherever an event is
 * described (D-033).
 */

/** A single baked event on a given sol. */
export interface SolEvent {
  readonly sol: number;
  readonly kind:
    | 'storm-warning'
    | 'storm'
    | 'supply-pod'
    | 'solar-flare'
    | 'win-check';
  readonly summary: string;
  /** Always true: these numbers are estimates, not measurements. */
  readonly approximate: true;
}

/**
 * The baked schedule, sorted by sol ascending.
 *
 * The storm warning on sol 2 teaches the player to read ahead; the storm on
 * sol 5 is the first real test; supply pod and flare are relief / hazard
 * beats; sol 20 is the win check.
 */
export const EVENT_SCHEDULE: readonly SolEvent[] = [
  {
    sol: 2,
    kind: 'storm-warning',
    summary: 'Solar storm approaching in sol 5',
    approximate: true,
  },
  {
    sol: 5,
    kind: 'storm',
    summary: 'Dust storm — solar output reduced for two sols',
    approximate: true,
  },
  {
    sol: 10,
    kind: 'supply-pod',
    summary: 'Supply pod arrives — water, food and power',
    approximate: true,
  },
  {
    sol: 14,
    kind: 'solar-flare',
    summary: 'Solar flare — radiation hit, shielding absorbs it',
    approximate: true,
  },
  {
    sol: 20,
    kind: 'win-check',
    summary: 'Win check — reach sol 20 with no store at zero',
    approximate: true,
  },
] as const;

/**
 * The events scheduled for a given sol, in schedule order.
 */
export function eventsForSol(sol: number): readonly SolEvent[] {
  return EVENT_SCHEDULE.filter((e) => e.sol === sol);
}

/**
 * The events in the window `(sol, sol + horizon]`, used for forecasting.
 *
 * A storm warning on sol N means the storm itself lands within the horizon;
 * the warning event is on sol N, the storm on sol N+3.
 */
export function forecastFrom(sol: number, horizon: number): readonly SolEvent[] {
  const end = sol + horizon;
  return EVENT_SCHEDULE.filter((e) => e.sol > sol && e.sol <= end);
}

/** The sol at which the storm hits, given the warning sol. */
export function stormSol(warningSol: number): number {
  return warningSol + 3;
}

/** Whether a sol carries a storm event. */
export function isStormSol(sol: number): boolean {
  return eventsForSol(sol).some((e) => e.kind === 'storm');
}

/** Whether a sol carries a supply pod. */
export function isSupplyPodSol(sol: number): boolean {
  return eventsForSol(sol).some((e) => e.kind === 'supply-pod');
}

/** Whether a sol carries a solar flare. */
export function isFlareSol(sol: number): boolean {
  return eventsForSol(sol).some((e) => e.kind === 'solar-flare');
}
