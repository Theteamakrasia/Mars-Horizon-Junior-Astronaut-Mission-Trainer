/**
 * What is coming, and when.
 *
 * The forecast is fixed per run and known from the start: the README's first
 * lesson is "forecast before you act". Only the size of the solar flares comes
 * from outside — real NASA flare classes, passed in by the screen that fetched
 * them, so this file never touches the network.
 *
 * Pure and deterministic.
 */

export type ForecastKind = 'flare' | 'supply-pod' | 'storm';

export interface ForecastEvent {
  /** Also the id of the crisis the player decides on, e.g. `storm-7`. */
  readonly id: string;
  /** The sol the event begins on. */
  readonly sol: number;
  readonly kind: ForecastKind;
  /** How many sols it lasts. 1 for everything but a dust storm. */
  readonly durationSols: number;
  /** 1 (small) to 3 (huge) for a flare; 0 for the others. */
  readonly intensity: number;
  /** One line a child can read. */
  readonly summary: string;
  /** True when the size came from fallback data rather than a live NASA reading. */
  readonly approximate: boolean;
}

/** A real flare, as the screen hands it over. */
export interface FlareInput {
  /** NASA's flare class, e.g. `M4.2` or `X5.8`. */
  readonly classType: string;
  readonly approximate: boolean;
  /** How the summary refers to it, e.g. `on 11 May 2024`. */
  readonly when: string;
}

export const FIRST_FLARE_SOL = 3;
export const SUPPLY_POD_SOL = 5;
export const STORM_SOL = 7;
export const STORM_DURATION_SOLS = 2;
export const SECOND_FLARE_SOL = 10;

/** What the run uses when no flare data is available at all. */
export const DEFAULT_FLARE: FlareInput = {
  classType: 'M5.0',
  approximate: true,
  when: 'during a typical strong solar cycle',
};

/**
 * Flare class to game intensity. NASA classes run A, B, C, M, X — each letter ten
 * times stronger than the one before. C and below are minor, M can disturb radio
 * and add radiation, X is the biggest.
 */
export function flareIntensity(classType: string): 1 | 2 | 3 {
  const letter = classType.trim().charAt(0).toUpperCase();

  if (letter === 'X') return 3;
  if (letter === 'M') return 2;

  return 1;
}

/** Build the run's forecast. The first flare lands on sol 3, the second on sol 10. */
export function createForecast(flares: readonly FlareInput[]): readonly ForecastEvent[] {
  const first = flares[0] ?? DEFAULT_FLARE;
  const second = flares[1] ?? first;

  const flare = (input: FlareInput, sol: number): ForecastEvent => ({
    id: `flare-${sol}`,
    sol,
    kind: 'flare',
    durationSols: 1,
    intensity: flareIntensity(input.classType),
    summary: `A ${input.classType} solar flare is on its way, about the strength of one seen ${input.when}.`,
    approximate: input.approximate,
  });

  return [
    flare(first, FIRST_FLARE_SOL),
    {
      id: `supply-${SUPPLY_POD_SOL}`,
      sol: SUPPLY_POD_SOL,
      kind: 'supply-pod',
      durationSols: 1,
      intensity: 0,
      summary: 'A supply pod from Earth lands near the outpost. You can only unpack one kind of cargo.',
      approximate: false,
    },
    {
      id: `storm-${STORM_SOL}`,
      sol: STORM_SOL,
      kind: 'storm',
      durationSols: STORM_DURATION_SOLS,
      intensity: 0,
      summary: 'A dust storm is rolling in. It will cover the solar panels in dust for two sols.',
      approximate: false,
    },
    flare(second, SECOND_FLARE_SOL),
  ];
}

/** Events that begin on this sol. */
export function eventsStartingOn(
  forecast: readonly ForecastEvent[],
  sol: number,
): readonly ForecastEvent[] {
  return forecast.filter((event) => event.sol === sol);
}

/** The storm raging on this sol, if one is. */
export function stormOn(forecast: readonly ForecastEvent[], sol: number): ForecastEvent | null {
  return (
    forecast.find(
      (event) => event.kind === 'storm' && sol >= event.sol && sol < event.sol + event.durationSols,
    ) ?? null
  );
}

/**
 * How much of the Sun a dust storm blocks, 0-1. A calmer site (higher dust score)
 * blocks less.
 */
export function stormOpacity(dustScore: number): number {
  return Math.min(0.95, Math.max(0.2, 0.95 - 0.12 * dustScore));
}
