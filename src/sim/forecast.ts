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

/**
 * How many quiet sols there must be between any two events.
 *
 * One. A crisis on the sol after a crisis gives the player no room to breathe:
 * the dust from sol 7 is still sitting on the panels on sol 8, and another alarm
 * on sol 8 would be a pile-up rather than a story. One clear sol is enough to
 * make the player feel they had time to put things right.
 */
export const MIN_CLEAR_SOLS = 1;

/** The first sol an event may start on. */
const FIRST_EVENT_SOL = 3;

/** The events of a run, in order, and how long each one lasts. */
const SCHEDULE: readonly { readonly kind: ForecastKind; readonly durationSols: number }[] = [
  { kind: 'flare', durationSols: 1 },
  { kind: 'supply-pod', durationSols: 1 },
  { kind: 'storm', durationSols: 2 },
  { kind: 'flare', durationSols: 1 },
];

/** One event, with the sol it lands on. */
interface PlacedEvent {
  readonly kind: ForecastKind;
  readonly sol: number;
  readonly durationSols: number;
}

/**
 * Put the events on the calendar so that no two of them ever touch.
 *
 * The sols are *worked out* here rather than typed in, and each event starts
 * `MIN_CLEAR_SOLS` sols after the previous one has ended. That makes the
 * spacing a property of the construction rather than a promise in a comment:
 * adding a fifth event to `SCHEDULE` cannot land it on top of another, and
 * changing the storm's length moves everything after it.
 *
 * The result is the schedule this game has always had — a flare on sol 3, a
 * supply pod on sol 5, a dust storm on sols 7 and 8, and a second flare on sol
 * 10 — with a quiet sol between every one of them.
 */
function placeEvents(): readonly PlacedEvent[] {
  const placed: PlacedEvent[] = [];
  let next = FIRST_EVENT_SOL;

  for (const event of SCHEDULE) {
    placed.push({ kind: event.kind, sol: next, durationSols: event.durationSols });
    next = next + event.durationSols + MIN_CLEAR_SOLS;
  }

  return placed;
}

/** The placed schedule. */
const PLACED: readonly PlacedEvent[] = placeEvents();

/**
 * The sols the events land on, worked out from the schedule.
 *
 * These were typed in before. Now they fall out of `PLACED`, so they cannot
 * disagree with it — the old numbers were a second copy of the truth, and a
 * second copy is exactly what drifts.
 */
export const FIRST_FLARE_SOL = PLACED[0]?.sol ?? FIRST_EVENT_SOL;
export const SUPPLY_POD_SOL = PLACED[1]?.sol ?? FIRST_EVENT_SOL;
export const STORM_SOL = PLACED[2]?.sol ?? FIRST_EVENT_SOL;
export const STORM_DURATION_SOLS = PLACED[2]?.durationSols ?? 2;
export const SECOND_FLARE_SOL = PLACED[3]?.sol ?? FIRST_EVENT_SOL;

/**
 * True when no two events touch.
 *
 * An event occupies its own sol and every sol it lasts. Two events touch when
 * one starts while the other is still running, or on the sol right after it
 * ends. The schedule is built so this is always true; the function exists so a
 * test can say so, and so anyone adding an event can check they have not
 * broken it.
 */
export function forecastIsSpaced(forecast: readonly ForecastEvent[]): boolean {
  const ordered = [...forecast].sort((a, b) => a.sol - b.sol);

  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1];
    const current = ordered[index];

    if (previous === undefined || current === undefined) continue;

    const previousEnd = previous.sol + previous.durationSols - 1;

    if (current.sol <= previousEnd + MIN_CLEAR_SOLS) return false;
  }

  return true;
}

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

/**
 * Build the run's forecast.
 *
 * The sols come from the placed schedule, so the spacing between events is
 * guaranteed rather than remembered. Only the flare *size* comes from outside:
 * the first live flare is the first flare on the calendar, and the second is
 * the second.
 */
export function createForecast(flares: readonly FlareInput[]): readonly ForecastEvent[] {
  const first = flares[0] ?? DEFAULT_FLARE;
  const second = flares[1] ?? first;
  const flareInputs = [first, second];
  let flareCount = 0;

  return PLACED.map((placed) => {
    if (placed.kind === 'flare') {
      const input = flareInputs[flareCount] ?? first;

      flareCount += 1;

      return {
        id: `flare-${placed.sol}`,
        sol: placed.sol,
        kind: 'flare',
        durationSols: placed.durationSols,
        intensity: flareIntensity(input.classType),
        summary: `A ${input.classType} solar flare is on its way, about the strength of one seen ${input.when}.`,
        approximate: input.approximate,
      };
    }

    if (placed.kind === 'supply-pod') {
      return {
        id: `supply-${placed.sol}`,
        sol: placed.sol,
        kind: 'supply-pod',
        durationSols: placed.durationSols,
        intensity: 0,
        summary: 'A supply pod from Earth lands near the outpost. You can only unpack one kind of cargo.',
        approximate: false,
      };
    }

    return {
      id: `storm-${placed.sol}`,
      sol: placed.sol,
      kind: 'storm',
      durationSols: placed.durationSols,
      intensity: 0,
      summary: `A dust storm is rolling in. It will cover the solar panels in dust for ${placed.durationSols} sols.`,
      approximate: false,
    };
  });
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
