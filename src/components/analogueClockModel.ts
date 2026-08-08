export type ClockDigit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type HandAngle = 0 | 90 | 180 | 225 | 270;
export type HandPair = readonly [HandAngle, HandAngle];
export type DigitPattern = readonly [
  HandPair,
  HandPair,
  HandPair,
  HandPair,
  HandPair,
  HandPair,
];

export const clockHands = {
  east: [90, 90],
  eastNorth: [90, 0],
  eastSouth: [90, 180],
  idle: [225, 225],
  north: [0, 0],
  northSouth: [0, 180],
  south: [180, 180],
  west: [270, 270],
  westNorth: [270, 0],
  westSouth: [270, 180],
} as const satisfies Record<string, HandPair>;

// Row-major adaptation of SparkFun's published ClockClock glyphs:
// top-left, top-right, middle-left, middle-right, bottom-left, bottom-right.
export const clockDigitPatterns = {
  0: [clockHands.eastSouth, clockHands.westSouth, clockHands.northSouth, clockHands.northSouth, clockHands.eastNorth, clockHands.westNorth],
  1: [clockHands.idle, clockHands.south, clockHands.idle, clockHands.northSouth, clockHands.idle, clockHands.north],
  2: [clockHands.east, clockHands.westSouth, clockHands.eastSouth, clockHands.westNorth, clockHands.eastNorth, clockHands.west],
  3: [clockHands.east, clockHands.westSouth, clockHands.east, clockHands.northSouth, clockHands.east, clockHands.westNorth],
  4: [clockHands.south, clockHands.south, clockHands.eastNorth, clockHands.northSouth, clockHands.idle, clockHands.north],
  5: [clockHands.eastSouth, clockHands.west, clockHands.eastNorth, clockHands.westSouth, clockHands.east, clockHands.westNorth],
  6: [clockHands.eastSouth, clockHands.west, clockHands.northSouth, clockHands.westSouth, clockHands.eastNorth, clockHands.westNorth],
  7: [clockHands.east, clockHands.westSouth, clockHands.idle, clockHands.northSouth, clockHands.idle, clockHands.north],
  8: [clockHands.eastSouth, clockHands.westSouth, clockHands.eastNorth, clockHands.westNorth, clockHands.eastNorth, clockHands.westNorth],
  9: [clockHands.eastSouth, clockHands.westSouth, clockHands.eastNorth, clockHands.northSouth, clockHands.idle, clockHands.north],
} as const satisfies Record<ClockDigit, DigitPattern>;

export const clockPlaceholderPattern: DigitPattern = [
  clockHands.idle,
  clockHands.idle,
  clockHands.idle,
  clockHands.idle,
  clockHands.idle,
  clockHands.idle,
];

const FULL_TURN = 360;
const HALF_TURN = FULL_TURN / 2;

export function getAlignedTimerDelay(
  timestamp: number,
  intervalMs: number,
  slopMs: number,
) {
  if (!Number.isFinite(timestamp) || !Number.isFinite(intervalMs) || intervalMs <= 0) {
    throw new RangeError("Clock timer values must be finite and the interval must be positive.");
  }

  const elapsedInInterval = ((timestamp % intervalMs) + intervalMs) % intervalMs;
  return Math.max(slopMs, intervalMs - elapsedInInterval + slopMs);
}

export function normalizeClockAngle(angle: number) {
  return ((angle % FULL_TURN) + FULL_TURN) % FULL_TURN;
}

export function getClockDigits(hours: number, minutes: number): readonly [
  ClockDigit,
  ClockDigit,
  ClockDigit,
  ClockDigit,
] {
  if (!Number.isInteger(hours) || hours < 0 || hours > 23) {
    throw new RangeError(`Clock hours must be an integer from 0 to 23; received ${hours}.`);
  }

  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 59) {
    throw new RangeError(`Clock minutes must be an integer from 0 to 59; received ${minutes}.`);
  }

  return [
    Math.floor(hours / 10) as ClockDigit,
    (hours % 10) as ClockDigit,
    Math.floor(minutes / 10) as ClockDigit,
    (minutes % 10) as ClockDigit,
  ];
}

export function nearestEquivalentAngle(current: number, target: HandAngle) {
  const rawDelta = target - current;
  const clockwiseDelta = normalizeClockAngle(rawDelta);
  let shortestDelta = clockwiseDelta;

  if (clockwiseDelta > HALF_TURN) {
    shortestDelta -= FULL_TURN;
  } else if (clockwiseDelta === HALF_TURN && rawDelta < 0) {
    shortestDelta = -HALF_TURN;
  }

  return current + shortestDelta;
}

export function resolveClockHandAngles(
  current: readonly [number, number],
  target: HandPair,
): readonly [number, number] {
  const direct = [
    nearestEquivalentAngle(current[0], target[0]),
    nearestEquivalentAngle(current[1], target[1]),
  ] as const;
  const swapped = [
    nearestEquivalentAngle(current[0], target[1]),
    nearestEquivalentAngle(current[1], target[0]),
  ] as const;
  const directTravel = Math.abs(direct[0] - current[0]) + Math.abs(direct[1] - current[1]);
  const swappedTravel = Math.abs(swapped[0] - current[0]) + Math.abs(swapped[1] - current[1]);

  // A tie keeps each physical hand's identity stable instead of swapping it.
  return swappedTravel < directTravel ? swapped : direct;
}
