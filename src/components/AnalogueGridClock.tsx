import {
  memo,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import {
  clockDigitPatterns,
  clockHands,
  clockPlaceholderPattern,
  getAlignedTimerDelay,
  getClockDigits,
  normalizeClockAngle,
  resolveClockHandAngles,
  type ClockDigit,
  type HandPair,
} from "./analogueClockModel";
import "./AnalogueGridClock.css";

interface DigitStyle extends CSSProperties {
  "--clock-accent": string;
  "--clock-hand-color": string;
}

interface ClockFaceStyle extends CSSProperties {
  "--clock-hand-duration": string;
}

const digitPalettes = [
  { fill: "var(--google-blue)", hands: "#174EA6" },
  { fill: "var(--google-red)", hands: "#A50E0E" },
  { fill: "var(--google-yellow)", hands: "#7A5600" },
  { fill: "var(--google-green)", hands: "#0D652D" },
] as const;

const SECOND_MS = 1_000;
const MINUTE_MS = 60_000;
const TIMER_SLOP_MS = 16;
const HAND_TRANSITION_MS = 760;
const HAND_REBASE_BUFFER_MS = 40;
const clockFaceMotionStyle: ClockFaceStyle = {
  "--clock-hand-duration": `${HAND_TRANSITION_MS}ms`,
};

type VisitorClockState = {
  readonly hours: number;
  readonly minutes: number;
  readonly motionEpoch: number;
  readonly timestamp: number;
  readonly timeZone: string | null;
};

function resolveVisitorTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

function useVisitorTime() {
  const [clock, setClock] = useState<VisitorClockState | null>(null);

  useEffect(() => {
    let timeoutId: number | undefined;
    let disposed = false;
    let lastLocalMinuteKey: string | null = null;
    let lastEpochMinute: number | null = null;
    let lastHours: number | null = null;
    let lastMinutes: number | null = null;
    let lastMotionStartedAt: number | null = null;
    let lastOffsetMinutes: number | null = null;
    let lastTimeZone: string | null = null;
    let motionEpoch = 0;

    const clearTimer = () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
        timeoutId = undefined;
      }
    };

    // A one-second, boundary-aligned watchdog catches wall-clock and time-zone
    // changes promptly. React is only updated when the displayed minute changes.
    const sync = (forceTimeZoneCheck = false, snapMotion = false) => {
      clearTimer();
      if (disposed || document.hidden) return;

      const timestamp = Date.now();
      const localDate = new Date(timestamp);
      const hours = localDate.getHours();
      const minutes = localDate.getMinutes();
      const epochMinute = Math.floor(timestamp / MINUTE_MS);
      const offsetMinutes = localDate.getTimezoneOffset();
      const localMinuteKey = `${epochMinute}:${hours}:${minutes}:${offsetMinutes}`;
      const timeZone = forceTimeZoneCheck || localMinuteKey !== lastLocalMinuteKey
        ? resolveVisitorTimeZone()
        : lastTimeZone;
      const monotonicTimestamp = performance.now();
      const digitsChanged = hours !== lastHours || minutes !== lastMinutes;
      const clockDiscontinuity = lastEpochMinute !== null && Math.abs(epochMinute - lastEpochMinute) > 1;
      const timeZoneDiscontinuity = lastOffsetMinutes !== null && offsetMinutes !== lastOffsetMinutes;
      const rapidRetarget = digitsChanged
        && lastMotionStartedAt !== null
        && monotonicTimestamp - lastMotionStartedAt < HAND_TRANSITION_MS + HAND_REBASE_BUFFER_MS;

      if (localMinuteKey !== lastLocalMinuteKey || timeZone !== lastTimeZone || snapMotion) {
        const shouldSnapMotion = snapMotion
          || clockDiscontinuity
          || timeZoneDiscontinuity
          || rapidRetarget;
        if (shouldSnapMotion) motionEpoch += 1;
        lastLocalMinuteKey = localMinuteKey;
        lastEpochMinute = epochMinute;
        lastHours = hours;
        lastMinutes = minutes;
        if (shouldSnapMotion) lastMotionStartedAt = null;
        else if (digitsChanged) lastMotionStartedAt = monotonicTimestamp;
        lastOffsetMinutes = offsetMinutes;
        lastTimeZone = timeZone;
        setClock({ hours, minutes, motionEpoch, timestamp, timeZone });
      }

      timeoutId = window.setTimeout(
        sync,
        getAlignedTimerDelay(timestamp, SECOND_MS, TIMER_SLOP_MS),
      );
    };

    const handleVisibilityChange = () => {
      if (document.hidden) clearTimer();
      else sync(true, true);
    };

    const handlePageShow = (event: PageTransitionEvent) => sync(true, event.persisted);
    const handleFocus = () => sync(true);

    sync(true);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      disposed = true;
      clearTimer();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  return clock;
}

type AnalogueFaceProps = {
  readonly target: HandPair;
};

const AnalogueFace = memo(function AnalogueFace({ target }: AnalogueFaceProps) {
  const [angles, setAngles] = useState<readonly [number, number]>(target);
  const [isRebasing, setIsRebasing] = useState(false);

  useEffect(() => {
    let settleTimer: number | undefined;
    let releaseFrame: number | undefined;

    const animationFrame = window.requestAnimationFrame(() => {
      setIsRebasing(false);
      setAngles((current) => {
        const next = resolveClockHandAngles(current, target);
        return next[0] === current[0] && next[1] === current[1] ? current : next;
      });

      settleTimer = window.setTimeout(() => {
        // Shortest-path animation needs unwrapped angles. Rebase only after it
        // settles, with transitions disabled, so long-running tabs stay bounded.
        setIsRebasing(true);
        setAngles((current) => {
          const normalized = [
            normalizeClockAngle(current[0]),
            normalizeClockAngle(current[1]),
          ] as const;
          return normalized[0] === current[0] && normalized[1] === current[1]
            ? current
            : normalized;
        });
        releaseFrame = window.requestAnimationFrame(() => setIsRebasing(false));
      }, HAND_TRANSITION_MS + HAND_REBASE_BUFFER_MS);
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
      if (settleTimer !== undefined) window.clearTimeout(settleTimer);
      if (releaseFrame !== undefined) window.cancelAnimationFrame(releaseFrame);
    };
  }, [target]);

  const isIdle = target === clockHands.idle;

  return (
    <span
      className={`analogue-clock-face${isIdle ? " is-idle" : ""}${isRebasing ? " is-rebasing" : ""}`}
      style={clockFaceMotionStyle}
    >
      <span
        className="analogue-clock-hand analogue-clock-hand-a"
        style={{ transform: `translateX(-50%) rotate(${angles[0]}deg)` }}
      />
      <span
        className="analogue-clock-hand analogue-clock-hand-b"
        style={{ transform: `translateX(-50%) rotate(${angles[1]}deg)` }}
      />
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
  const pattern = digit === null ? clockPlaceholderPattern : clockDigitPatterns[digit];

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

export const AnalogueGridClock = memo(function AnalogueGridClock() {
  const clock = useVisitorTime();
  const timeZone = clock?.timeZone ?? null;
  const accessibleFormatter = useMemo(
    () => new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      hourCycle: "h23",
      minute: "2-digit",
      timeZoneName: "short",
      ...(timeZone ? { timeZone } : {}),
    }),
    [timeZone],
  );

  const digits = useMemo<readonly (ClockDigit | null)[]>(() => {
    if (!clock) return [null, null, null, null];
    return getClockDigits(clock.hours, clock.minutes);
  }, [clock]);

  const accessibleTime = clock
    ? `Your local time is ${accessibleFormatter.format(clock.timestamp)}`
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
          dateTime={clock ? new Date(clock.timestamp).toISOString() : undefined}
          aria-label={accessibleTime}
        >
          <span
            key={`motion-${clock?.motionEpoch ?? 0}`}
            className="analogue-grid-clock-display"
            aria-hidden="true"
          >
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
