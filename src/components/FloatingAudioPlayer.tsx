import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type FormEvent,
  type PointerEvent,
} from 'react';

import {
  createNarrationWordTimingsFromTranscript,
  createNarrationWordTimings,
  findActiveNarrationWord,
  getNarrationTranscriptDuration,
  hasOpenEndedNarrationSegment,
  parseNarrationTranscript,
  resolveNarrationSeekTime,
  type NarrationTranscriptSegment,
  type NarrationWordTiming,
  type NarrationLang,
} from '../utils/narration';

export type NarrationTrack = {
  content: string;
  label: string;
  src?: string;
  transcriptSrc?: string;
};

export type NarrationTrackMap = Partial<Record<NarrationLang, NarrationTrack>>;

type FloatingAudioPlayerProps = {
  lang: NarrationLang;
  onActiveWordChange: (wordIndex: number | null) => void;
  tracks: NarrationTrackMap;
};

const emptyNarrationTimings: NarrationWordTiming[] = [];
const emptyNarrationTranscript: NarrationTranscriptSegment[] = [];

function readAscii(view: DataView, offset: number, length: number) {
  let value = '';

  for (let index = 0; index < length; index += 1) {
    value += String.fromCharCode(view.getUint8(offset + index));
  }

  return value;
}

function getWavDuration(buffer: ArrayBuffer) {
  const view = new DataView(buffer);

  if (view.byteLength < 44 || readAscii(view, 0, 4) !== 'RIFF' || readAscii(view, 8, 4) !== 'WAVE') {
    return 0;
  }

  let blockAlign = 0;
  let dataSize = 0;
  let sampleRate = 0;
  let offset = 12;

  while (offset + 8 <= view.byteLength) {
    const chunkId = readAscii(view, offset, 4);
    const chunkSize = view.getUint32(offset + 4, true);

    if (chunkId === 'fmt ' && offset + 24 <= view.byteLength) {
      sampleRate = view.getUint32(offset + 12, true);
      blockAlign = view.getUint16(offset + 20, true);
    }

    if (chunkId === 'data') {
      dataSize = chunkSize;
      break;
    }

    offset += 8 + chunkSize + (chunkSize % 2);
  }

  return sampleRate > 0 && blockAlign > 0 && dataSize > 0
    ? dataSize / (sampleRate * blockAlign)
    : 0;
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '0:00';
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, '0');

  return `${minutes}:${remainingSeconds}`;
}

function FloatingAudioPlayer({ lang, onActiveWordChange, tracks }: FloatingAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeWordRef = useRef<number | null>(null);
  const isScrubbingRef = useRef(false);
  const resumeAfterScrubRef = useRef(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [transcriptData, setTranscriptData] = useState<{
    src: string;
    transcript: NarrationTranscriptSegment[];
  } | null>(null);
  const [error, setError] = useState('');
  const activeTrack = tracks[lang];
  const activeSrc = activeTrack?.src ?? '';
  const activeTranscriptSrc = activeTrack?.transcriptSrc ?? '';
  const activeContent = activeTrack?.content ?? '';
  const activeTranscript = transcriptData?.src === activeTranscriptSrc
    ? transcriptData.transcript
    : emptyNarrationTranscript;
  const transcriptDuration = useMemo(
    () => getNarrationTranscriptDuration(activeTranscript),
    [activeTranscript],
  );
  const transcriptHasOpenEnd = useMemo(
    () => hasOpenEndedNarrationSegment(activeTranscript),
    [activeTranscript],
  );
  const effectiveDuration = transcriptHasOpenEnd
    ? (duration > 0 ? duration : transcriptDuration)
    : (transcriptDuration > 0 ? transcriptDuration : duration);
  const activeTranscriptTimings = useMemo(
    () => (
      activeTranscript.length > 0
        ? createNarrationWordTimingsFromTranscript(activeTranscript, lang, activeContent, effectiveDuration)
        : emptyNarrationTimings
    ),
    [activeContent, activeTranscript, effectiveDuration, lang],
  );
  const timings = useMemo(
    () => (
      activeTranscriptTimings.length > 0
        ? activeTranscriptTimings
        : createNarrationWordTimings(activeContent, effectiveDuration, lang)
    ),
    [activeContent, activeTranscriptTimings, effectiveDuration, lang],
  );
  const progress = effectiveDuration > 0 ? Math.min((currentTime / effectiveDuration) * 100, 100) : 0;
  const progressStyle = { '--audio-progress': `${progress}%` } as CSSProperties;
  const expandPlayer = useCallback(() => setIsExpanded(true), []);
  const collapsePlayer = useCallback(() => setIsExpanded(false), []);

  const readAudioDuration = useCallback(() => {
    const audio = audioRef.current;

    if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) {
      return;
    }

    setDuration((currentDuration) => (
      Math.abs(currentDuration - audio.duration) > 0.05 ? audio.duration : currentDuration
    ));
  }, []);

  useEffect(() => {
    if (!activeTranscriptSrc) {
      return undefined;
    }

    let isCancelled = false;

    void fetch(activeTranscriptSrc)
      .then((response) => (response.ok ? response.json() : null))
      .then((transcriptJson: unknown) => {
        if (isCancelled || !transcriptJson) {
          return;
        }

        const transcript = parseNarrationTranscript(transcriptJson);

        setTranscriptData({
          src: activeTranscriptSrc,
          transcript,
        });
      })
      .catch(() => {
        if (!isCancelled) {
          setTranscriptData(null);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [activeTranscriptSrc]);

  useEffect(() => {
    audioRef.current?.load();
  }, [activeSrc]);

  useEffect(() => {
    if (!activeSrc) {
      return undefined;
    }

    let isCancelled = false;

    void fetch(activeSrc)
      .then((response) => (response.ok ? response.arrayBuffer() : null))
      .then((buffer) => {
        if (isCancelled || !buffer) {
          return;
        }

        const wavDuration = getWavDuration(buffer);

        if (wavDuration > 0) {
          setDuration((currentDuration) => (
            Math.abs(currentDuration - wavDuration) > 0.05 ? wavDuration : currentDuration
          ));
        }
      })
      .catch(() => undefined);

    return () => {
      isCancelled = true;
    };
  }, [activeSrc]);

  const updateWordFromTime = useCallback((time: number) => {
    const nextWordIndex = findActiveNarrationWord(timings, time);

    if (nextWordIndex !== activeWordRef.current) {
      activeWordRef.current = nextWordIndex;
      onActiveWordChange(nextWordIndex);
    }
  }, [onActiveWordChange, timings]);

  const getBoundedTime = useCallback((time: number) => {
    if (!Number.isFinite(time)) {
      return 0;
    }

    const audioDuration = audioRef.current?.duration ?? 0;
    const maxTime = effectiveDuration > 0
      ? effectiveDuration
      : (Number.isFinite(audioDuration) && audioDuration > 0 ? audioDuration : duration);

    if (!Number.isFinite(maxTime) || maxTime <= 0) {
      return Math.max(0, time);
    }

    return Math.min(Math.max(0, time), maxTime);
  }, [duration, effectiveDuration]);

  const getSeekTime = useCallback((time: number) => (
    resolveNarrationSeekTime(timings, getBoundedTime(time))
  ), [getBoundedTime, timings]);

  const previewSeekTime = useCallback((time: number, snapToWord = false) => {
    const nextTime = snapToWord ? getSeekTime(time) : getBoundedTime(time);

    activeWordRef.current = null;
    setCurrentTime(nextTime);
    updateWordFromTime(nextTime);

    return nextTime;
  }, [getBoundedTime, getSeekTime, updateWordFromTime]);

  const syncFromAudioTime = useCallback((force = false) => {
    const audio = audioRef.current;

    if (!audio || (isScrubbingRef.current && !force)) {
      return;
    }

    readAudioDuration();
    setCurrentTime(audio.currentTime);
    updateWordFromTime(audio.currentTime);
  }, [readAudioDuration, updateWordFromTime]);

  const playAudio = useCallback(async () => {
    const audio = audioRef.current;

    if (!audio || !activeSrc) {
      return;
    }

    try {
      setError('');
      await audio.play();
    } catch {
      setIsPlaying(false);
      setError('Tap play again.');
    }
  }, [activeSrc]);

  const togglePlayback = useCallback(() => {
    const audio = audioRef.current;

    if (!audio || !activeSrc) {
      return;
    }

    if (audio.paused) {
      void playAudio();
      return;
    }

    audio.pause();
  }, [activeSrc, playAudio]);

  const handleTimeUpdate = useCallback(() => {
    syncFromAudioTime();
  }, [syncFromAudioTime]);

  const commitSeekTime = useCallback((time: number) => {
    const audio = audioRef.current;
    const nextTime = previewSeekTime(time, true);

    if (!audio) {
      return;
    }

    audio.currentTime = nextTime;

    window.requestAnimationFrame(() => {
      const settledAudio = audioRef.current;

      if (!settledAudio) {
        return;
      }

      setCurrentTime(settledAudio.currentTime);
      updateWordFromTime(settledAudio.currentTime);
    });
  }, [previewSeekTime, updateWordFromTime]);

  const finishScrubbing = useCallback((time: number) => {
    const shouldResume = resumeAfterScrubRef.current;

    isScrubbingRef.current = false;
    resumeAfterScrubRef.current = false;
    commitSeekTime(time);

    if (shouldResume) {
      void playAudio();
    }
  }, [commitSeekTime, playAudio]);

  const handleSeekStart = useCallback((event: PointerEvent<HTMLInputElement>) => {
    const audio = audioRef.current;

    isScrubbingRef.current = true;
    resumeAfterScrubRef.current = Boolean(audio && !audio.paused);
    event.currentTarget.setPointerCapture(event.pointerId);

    if (audio && !audio.paused) {
      audio.pause();
    }

    previewSeekTime(Number(event.currentTarget.value));
  }, [previewSeekTime]);

  const handleSeekInput = useCallback((event: FormEvent<HTMLInputElement> | ChangeEvent<HTMLInputElement>) => {
    const nextTime = Number(event.currentTarget.value);

    if (!Number.isFinite(nextTime)) {
      return;
    }

    if (isScrubbingRef.current) {
      previewSeekTime(nextTime);
      return;
    }

    commitSeekTime(nextTime);
  }, [commitSeekTime, previewSeekTime]);

  const handleSeekEnd = useCallback((event: PointerEvent<HTMLInputElement>) => {
    if (!isScrubbingRef.current) {
      return;
    }

    finishScrubbing(Number(event.currentTarget.value));
  }, [finishScrubbing]);

  const handlePlay = useCallback(() => {
    syncFromAudioTime();
    setIsPlaying(true);
  }, [syncFromAudioTime]);

  const handlePause = useCallback(() => {
    syncFromAudioTime();
    setIsPlaying(false);
  }, [syncFromAudioTime]);

  const handleSeeked = useCallback(() => {
    activeWordRef.current = null;
    syncFromAudioTime(true);
  }, [syncFromAudioTime]);

  const handleEnded = useCallback(() => {
    const audio = audioRef.current;

    if (audio) {
      audio.currentTime = 0;
    }

    setIsPlaying(false);
    setCurrentTime(0);
    activeWordRef.current = null;
    onActiveWordChange(null);
  }, [onActiveWordChange]);

  useEffect(() => {
    if (!isPlaying) {
      return undefined;
    }

    let animationFrame = 0;
    let lastProgressUpdate = 0;

    const tick = () => {
      const audio = audioRef.current;

      if (audio && !isScrubbingRef.current) {
        const now = performance.now();

        updateWordFromTime(audio.currentTime);

        if (now - lastProgressUpdate > 140) {
          setCurrentTime(audio.currentTime);
          lastProgressUpdate = now;
        }
      }

      animationFrame = window.requestAnimationFrame(tick);
    };

    animationFrame = window.requestAnimationFrame(tick);

    return () => window.cancelAnimationFrame(animationFrame);
  }, [isPlaying, updateWordFromTime]);

  if (!activeSrc) {
    return null;
  }

  return (
    <>
      <section
        aria-hidden={!isExpanded}
        aria-label="Article narration"
        className={`floating-audio-player ${isExpanded ? 'is-expanded' : 'is-collapsed'}`}
        inert={isExpanded ? undefined : true}
      >
        <audio
          onCanPlay={readAudioDuration}
          onDurationChange={readAudioDuration}
          onEnded={handleEnded}
          onLoadedData={readAudioDuration}
          onLoadedMetadata={readAudioDuration}
          onPause={handlePause}
          onPlay={handlePlay}
          onSeeked={handleSeeked}
          onTimeUpdate={handleTimeUpdate}
          preload="auto"
          ref={audioRef}
          src={activeSrc}
        />

        <div className="floating-audio-main">
          <button
            aria-label={isPlaying ? 'Pause narration' : 'Play narration'}
            className="audio-play-button"
            onClick={togglePlayback}
            type="button"
          >
            <span className="material-symbols-rounded" aria-hidden="true">
              {isPlaying ? 'pause' : 'play_arrow'}
            </span>
          </button>

          <div className="audio-copy">
            <span className="audio-kicker">Listen along</span>
            <strong>{activeTrack?.label ?? 'Narration'}</strong>
          </div>

          <button
            aria-label="Collapse narration player"
            className="audio-close-button"
            onClick={collapsePlayer}
            type="button"
          >
            <span className="material-symbols-rounded" aria-hidden="true">close</span>
          </button>
        </div>

        <div className="audio-progress-row">
          <span>{formatTime(currentTime)}</span>
          <label className="audio-progress-control" style={progressStyle}>
            <span className="sr-only">Narration position</span>
            <m3e-linear-progress-indicator
              aria-hidden="true"
              className="audio-progress-indicator"
              max={effectiveDuration || 100}
              value={effectiveDuration ? Math.min(currentTime, effectiveDuration) : 0}
              variant="wavy"
            />
            <input
              aria-label="Narration position"
              max={effectiveDuration || 0}
              min="0"
              onChange={handleSeekInput}
              onInput={handleSeekInput}
              onLostPointerCapture={handleSeekEnd}
              onPointerCancel={handleSeekEnd}
              onPointerDown={handleSeekStart}
              onPointerUp={handleSeekEnd}
              step="0.01"
              type="range"
              value={effectiveDuration ? Math.min(currentTime, effectiveDuration) : 0}
            />
          </label>
          <span>{formatTime(effectiveDuration)}</span>
        </div>

        {error && <p className="audio-error" role="status">{error}</p>}
      </section>

      <button
        aria-label="Open narration player"
        className={`audio-fab ${isExpanded ? 'is-hidden' : 'is-visible'} ${isPlaying ? 'is-playing' : ''}`}
        onClick={expandPlayer}
        type="button"
      >
        <span className="material-symbols-rounded" aria-hidden="true">
          {isPlaying ? 'graphic_eq' : 'headphones'}
        </span>
      </button>
    </>
  );
}

export default memo(FloatingAudioPlayer);
