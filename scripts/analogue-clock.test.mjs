import assert from "node:assert/strict";
import test from "node:test";
import {
  clockDigitPatterns,
  getAlignedTimerDelay,
  getClockDigits,
  nearestEquivalentAngle,
  normalizeClockAngle,
  resolveClockHandAngles,
} from "../src/components/analogueClockModel.ts";

// Published SparkFun ClockClock motor order. The UI's six faces use the
// documented physical-to-row-major permutation below.
// https://learn.sparkfun.com/tutorials/the-clockclock-project/software-setup-and-programming
const sparkFunMotorAngles = [
  [270, 180, 0, 180, 270, 0, 90, 180, 0, 180, 90, 0],
  [180, 180, 0, 180, 0, 0, 225, 225, 225, 225, 225, 225],
  [270, 180, 270, 0, 270, 270, 90, 90, 90, 180, 90, 0],
  [270, 180, 0, 180, 270, 0, 90, 90, 90, 90, 90, 90],
  [180, 180, 0, 180, 0, 0, 180, 180, 90, 0, 225, 225],
  [270, 270, 270, 180, 270, 0, 90, 180, 90, 0, 90, 90],
  [270, 270, 270, 180, 270, 0, 90, 180, 0, 180, 90, 0],
  [270, 180, 0, 180, 0, 0, 90, 90, 225, 225, 225, 225],
  [270, 180, 270, 0, 0, 270, 90, 180, 90, 0, 0, 90],
  [270, 180, 0, 180, 0, 0, 90, 180, 90, 0, 225, 225],
];

const rowMajorFaceOrder = [3, 0, 4, 1, 5, 2];

function toRowMajorPattern(motorAngles) {
  const physicalPairs = Array.from(
    { length: 6 },
    (_, index) => motorAngles.slice(index * 2, index * 2 + 2),
  );
  return rowMajorFaceOrder.map((index) => physicalPairs[index]);
}

function normalizeUnorderedHandPairs(pattern) {
  return pattern.map((pair) => [...pair].sort((first, second) => first - second));
}

test("all ten glyphs preserve the reviewed 2-by-3 ClockClock mapping", () => {
  for (let digit = 0; digit <= 9; digit += 1) {
    assert.deepEqual(
      normalizeUnorderedHandPairs(clockDigitPatterns[digit]),
      normalizeUnorderedHandPairs(toRowMajorPattern(sparkFunMotorAngles[digit])),
    );
  }
});

test("every minute in a 24-hour day produces the exact HHMM digits", () => {
  for (let hours = 0; hours < 24; hours += 1) {
    for (let minutes = 0; minutes < 60; minutes += 1) {
      const expected = `${hours.toString().padStart(2, "0")}${minutes.toString().padStart(2, "0")}`;
      assert.equal(getClockDigits(hours, minutes).join(""), expected);
    }
  }

  assert.deepEqual(getClockDigits(23, 59), [2, 3, 5, 9]);
  assert.deepEqual(getClockDigits(0, 0), [0, 0, 0, 0]);
  assert.throws(() => getClockDigits(24, 0), RangeError);
  assert.throws(() => getClockDigits(0, 60), RangeError);
});

test("aligned watchdog delays never drift and land just after a second boundary", () => {
  assert.equal(getAlignedTimerDelay(0, 1_000, 16), 1_016);
  assert.equal(getAlignedTimerDelay(999, 1_000, 16), 17);
  assert.equal(getAlignedTimerDelay(60_001, 1_000, 16), 1_015);

  for (let timestamp = 0; timestamp < 120_000; timestamp += 137) {
    const delay = getAlignedTimerDelay(timestamp, 1_000, 16);
    assert.ok(delay >= 16 && delay <= 1_016);
    assert.equal((timestamp + delay - 16) % 1_000, 0);
  }
});

test("all hand targets take a mathematically shortest equivalent route", () => {
  const targets = [0, 90, 180, 225, 270];

  for (let current = -10_800; current <= 10_800; current += 15) {
    for (const target of targets) {
      const resolved = nearestEquivalentAngle(current, target);
      assert.equal(normalizeClockAngle(resolved), target);
      assert.ok(Math.abs(resolved - current) <= 180);
    }
  }

  assert.equal(nearestEquivalentAngle(630, 0), 720);
  assert.equal(nearestEquivalentAngle(-630, 0), -720);
});

test("two-hand assignment minimizes total travel without swapping on a tie", () => {
  const targets = Object.values(clockDigitPatterns).flat();

  for (let first = -720; first <= 720; first += 45) {
    for (let second = -720; second <= 720; second += 45) {
      for (const target of targets) {
        const resolved = resolveClockHandAngles([first, second], target);
        const directCost = Math.abs(nearestEquivalentAngle(first, target[0]) - first)
          + Math.abs(nearestEquivalentAngle(second, target[1]) - second);
        const swappedCost = Math.abs(nearestEquivalentAngle(first, target[1]) - first)
          + Math.abs(nearestEquivalentAngle(second, target[0]) - second);

        assert.equal(
          Math.abs(resolved[0] - first) + Math.abs(resolved[1] - second),
          Math.min(directCost, swappedCost),
        );
      }
    }
  }

  assert.deepEqual(resolveClockHandAngles([0, 180], [90, 270]), [90, 270]);
});
