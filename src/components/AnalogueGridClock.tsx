import {
  memo,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import "./AnalogueGridClock.css";

type ClockDigit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
type HandAngle = 0 | 90 | 180 | 225 | 270;
type HandPair = readonly [HandAngle, HandAngle];
type DigitPattern = readonly [
  HandPair,
  HandPair,
  HandPair,
  HandPair,
  HandPair,
  HandPair,
];

interface DigitStyle extends CSSProperties {
  "--clock-accent": string;
  "--clock-hand-color": string;
}

const hands = {
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

const digitPatterns = {
  0: [hands.eastSouth, hands.westSouth, hands.northSouth, hands.northSouth, hands.eastNorth, hands.westNorth],
  1: [hands.idle, hands.south, hands.idle, hands.northSouth, hands.idle, hands.north],
  2: [hands.east, hands.westSouth, hands.eastSouth, hands.westNorth, hands.eastNorth, hands.west],
  3: [hands.east, hands.westSouth, hands.east, hands.northSouth, hands.east, hands.westNorth],
  4: [hands.south, hands.south, hands.eastNorth, hands.northSouth, hands.idle, hands.north],
  5: [hands.eastSouth, hands.west, hands.eastNorth, hands.westSouth, hands.east, hands.westNorth],
  6: [hands.eastSouth, hands.west, hands.northSouth, hands.westSouth, hands.eastNorth, hands.westNorth],
  7: [hands.east, hands.westSouth, hands.idle, hands.northSouth, hands.idle, hands.north],
  8: [hands.eastSouth, hands.westSouth, hands.eastNorth, hands.westNorth, hands.eastNorth, hands.westNorth],
  9: [hands.eastSouth, hands.westSouth, hands.eastNorth, hands.northSouth, hands.idle, hands.north],
} as const satisfies Record<ClockDigit, DigitPattern>;

const placeholderPattern: DigitPattern = [
  hands.idle,
  hands.idle,
  hands.idle,
  hands.idle,
  hands.idle,
  hands.idle,
];

const digitPalettes = [
  { fill: "var(--google-blue)", hands: "#174EA6" },
  { fill: "var(--google-red)", hands: "#A50E0E" },
  { fill: "var(--google-yellow)", hands: "#7A5600" },
  { fill: "var(--google-green)", hands: "#0D652D" },
] as const;

const MINUTE_MS = 60_000;

type VisitorClockState = {
  readonly now: Date;
  readonly timeZone: string | null;
};

function useVisitorTime() {
  const [clock, setClock] = useState<VisitorClockState | null>(null);

  useEffect(() => {
    let timeoutId: number | undefined;
    let disposed = false;

    const clearTimer = () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
        timeoutId = undefined;
      }
    };

    const sync = () => {
      clearTimer();
      if (disposed || document.hidden) return;

      const timestamp = Date.now();
      setClock({
        now: new Date(timestamp),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
      });
      timeoutId = window.setTimeout(
        sync,
        Math.max(16, MINUTE_MS - (timestamp % MINUTE_MS) + 16),
      );
    };

    const handleVisibilityChange = () => {
      if (document.hidden) clearTimer();
      else sync();
    };

    sync();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pageshow", sync);

    return () => {
      disposed = true;
      clearTimer();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pageshow", sync);
    };
  }, []);

  return clock;
}

function nearestAngle(current: number, target: HandAngle) {
  const delta = ((target - current + 540) % 360) - 180;
  return current + delta;
}

function resolveHandAngles(
  current: readonly [number, number],
  target: HandPair,
): readonly [number, number] {
  const direct = [
    nearestAngle(current[0], target[0]),
    nearestAngle(current[1], target[1]),
  ] as const;
  const swapped = [
    nearestAngle(current[0], target[1]),
    nearestAngle(current[1], target[0]),
  ] as const;
  const directTravel = Math.abs(direct[0] - current[0]) + Math.abs(direct[1] - current[1]);
  const swappedTravel = Math.abs(swapped[0] - current[0]) + Math.abs(swapped[1] - current[1]);

  return swappedTravel < directTravel ? swapped : direct;
}

type AnalogueFaceProps = {
  readonly target: HandPair;
};

const AnalogueFace = memo(function AnalogueFace({ target }: AnalogueFaceProps) {
  const [angles, setAngles] = useState<readonly [number, number]>(target);

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(() => {
      setAngles((current) => {
        const next = resolveHandAngles(current, target);
        return next[0] === current[0] && next[1] === current[1] ? current : next;
      });
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [target]);

  const isIdle = target === hands.idle;

  return (
    <span className={`analogue-clock-face${isIdle ? " is-idle" : ""}`}>
      <span
        className="analogue-clock-hand analogue-clock-hand-a"
        style={{ transform: `translateX(-50%) rotate(${angles[0]}deg)` }}
      />
      {target[0] !== target[1] ? (
        <span
          className="analogue-clock-hand analogue-clock-hand-b"
          style={{ transform: `translateX(-50%) rotate(${angles[1]}deg)` }}
        />
      ) : null}
      <span className="analogue-clock-pin" />
    </span>
  );
});

type AnalogueDigitProps = {
  readonly accent: string;
  readonly digit: ClockDigit | null;
  readonly handColor: string;
};

const AnalogueDigit = memo(function AnalogueDigit({ accent, digit, handColor }: AnalogueDigitProps) {
  const pattern = digit === null ? placeholderPattern : digitPatterns[digit];

  return (
    <span
      className="analogue-clock-digit"
      style={{
        "--clock-accent": accent,
        "--clock-hand-color": handColor,
      } as DigitStyle}
    >
      {pattern.map((target, index) => (
        <AnalogueFace key={index} target={target} />
      ))}
    </span>
  );
});

function toClockDigit(value: number): ClockDigit {
  return value as ClockDigit;
}

export const AnalogueGridClock = memo(function AnalogueGridClock() {
  const clock = useVisitorTime();
  const now = clock?.now ?? null;
  const timeZone = clock?.timeZone ?? null;
  const accessibleFormatter = useMemo(
    () => new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      hourCycle: "h23",
      minute: "2-digit",
      timeZoneName: "short",
      ...(timeZone ? { timeZone } : {}),
    }),
    [timeZone],
  );

  const digits = useMemo<readonly (ClockDigit | null)[]>(() => {
    if (!now) return [null, null, null, null];

    const hours = now.getHours();
    const minutes = now.getMinutes();
    return [
      toClockDigit(Math.floor(hours / 10)),
      toClockDigit(hours % 10),
      toClockDigit(Math.floor(minutes / 10)),
      toClockDigit(minutes % 10),
    ];
  }, [now]);

  const accessibleTime = now
    ? `Your local time is ${accessibleFormatter.format(now)}`
    : "Loading your local time";

  return (
    <section className="home-clock-section" aria-labelledby="home-clock-title">
      <div className="analogue-grid-clock">
        <div className="analogue-grid-clock-header">
          <div>
            <span className="analogue-grid-clock-kicker">Live / Local</span>
            <h2 id="home-clock-title">There&rsquo;s still time to explore one more article.</h2>
          </div>
        </div>

        <time
          className="analogue-grid-clock-time"
          dateTime={now?.toISOString()}
          aria-label={accessibleTime}
        >
          <span className="analogue-grid-clock-display" aria-hidden="true">
            <span className="analogue-clock-pair">
              <AnalogueDigit
                accent={digitPalettes[0].fill}
                digit={digits[0]}
                handColor={digitPalettes[0].hands}
              />
              <AnalogueDigit
                accent={digitPalettes[1].fill}
                digit={digits[1]}
                handColor={digitPalettes[1].hands}
              />
            </span>

            <span className="analogue-clock-separator">
              <span />
              <span />
            </span>

            <span className="analogue-clock-pair">
              <AnalogueDigit
                accent={digitPalettes[2].fill}
                digit={digits[2]}
                handColor={digitPalettes[2].hands}
              />
              <AnalogueDigit
                accent={digitPalettes[3].fill}
                digit={digits[3]}
                handColor={digitPalettes[3].hands}
              />
            </span>
          </span>
        </time>
      </div>
    </section>
  );
});
