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
const SEEK_RESUME_DELAY_MS = 80;

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
  const committedSeekTimeRef = useRef(0);
  const progressControlRef = useRef<HTMLDivElement | null>(null);
  const seekInputRef = useRef<HTMLInputElement | null>(null);
  const isSeekPendingRef = useRef(false);
  const isScrubbingRef = useRef(false);
  const lastPreviewSeekTimeRef = useRef(0);
  const pendingResumeAfterSeekRef = useRef(false);
  const resumeAfterScrubRef = useRef(false);
  const seekResumeTimerRef = useRef<number | null>(null);
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

  useEffect(() => () => {
    if (seekResumeTimerRef.current !== null) {
      window.clearTimeout(seekResumeTimerRef.current);
    }
  }, []);

  const updateWordFromTime = useCallback((time: number) => {
    const nextWordIndex = findActiveNarrationWord(timings, time);

    if (nextWordIndex !== activeWordRef.current) {
      activeWordRef.current = nextWordIndex;
      onActiveWordChange(nextWordIndex);
    }
  }, [onActiveWordChange, timings]);

  const clearActiveWord = useCallback(() => {
    if (activeWordRef.current !== null) {
      activeWordRef.current = null;
      onActiveWordChange(null);
    }
  }, [onActiveWordChange]);

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

  const getPointerSeekTime = useCallback((clientX: number) => {
    const control = progressControlRef.current;

    if (!control || effectiveDuration <= 0) {
      return 0;
    }

    const rect = control.getBoundingClientRect();
    const ratio = rect.width > 0 ? (clientX - rect.left) / rect.width : 0;

    return getBoundedTime(ratio * effectiveDuration);
  }, [effectiveDuration, getBoundedTime]);

  const previewSeekTime = useCallback((time: number) => {
    const nextTime = getBoundedTime(time);

    lastPreviewSeekTimeRef.current = nextTime;
    setCurrentTime(nextTime);

    return nextTime;
  }, [getBoundedTime]);

  const syncToTime = useCallback((time: number) => {
    readAudioDuration();
    activeWordRef.current = null;
    setCurrentTime(time);
    updateWordFromTime(time);
  }, [readAudioDuration, updateWordFromTime]);

  const syncFromAudioTime = useCallback((force = false) => {
    const audio = audioRef.current;

    if (!audio || ((isScrubbingRef.current || isSeekPendingRef.current) && !force)) {
      return;
    }

    syncToTime(audio.currentTime);
  }, [syncToTime]);

  const playAudio = useCallback(async () => {
    const audio = audioRef.current;

    if (!audio || !activeSrc) {
      return;
    }

    if (audio.seeking || isSeekPendingRef.current) {
      pendingResumeAfterSeekRef.current = true;
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

  const resumeAfterSeekSettles = useCallback(() => {
    const audio = audioRef.current;

    if (!audio || audio.seeking) {
      return;
    }

    if (isSeekPendingRef.current) {
      isSeekPendingRef.current = false;
      syncToTime(committedSeekTimeRef.current);
    }

    if (!pendingResumeAfterSeekRef.current) {
      return;
    }

    pendingResumeAfterSeekRef.current = false;
    seekResumeTimerRef.current = window.setTimeout(() => {
      seekResumeTimerRef.current = null;
      void playAudio();
    }, SEEK_RESUME_DELAY_MS);
  }, [playAudio, syncToTime]);

  const handleTimeUpdate = useCallback(() => {
    syncFromAudioTime();
  }, [syncFromAudioTime]);

  const commitSeekTime = useCallback((time: number) => {
    const audio = audioRef.current;
    const nextTime = getBoundedTime(time);

    if (!audio) {
      return;
    }

    clearActiveWord();
    setCurrentTime(nextTime);
    lastPreviewSeekTimeRef.current = nextTime;
    isSeekPendingRef.current = true;
    committedSeekTimeRef.current = nextTime;
    audio.currentTime = nextTime;
  }, [clearActiveWord, getBoundedTime]);

  const finishScrubbing = useCallback((time: number) => {
    const shouldResume = resumeAfterScrubRef.current;

    isScrubbingRef.current = false;
    resumeAfterScrubRef.current = false;
    pendingResumeAfterSeekRef.current = shouldResume;
    commitSeekTime(time);

    if (seekResumeTimerRef.current !== null) {
      window.clearTimeout(seekResumeTimerRef.current);
    }

    seekResumeTimerRef.current = window.setTimeout(resumeAfterSeekSettles, 120);
  }, [commitSeekTime, resumeAfterSeekSettles]);

  const handleSeekStart = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const nextTime = getPointerSeekTime(event.clientX);

    event.preventDefault();
    isScrubbingRef.current = true;
    isSeekPendingRef.current = false;
    pendingResumeAfterSeekRef.current = false;
    resumeAfterScrubRef.current = Boolean(audio && !audio.paused);
    event.currentTarget.setPointerCapture(event.pointerId);
    seekInputRef.current?.focus({ preventScroll: true });

    if (audio && !audio.paused) {
      audio.pause();
    }

    previewSeekTime(nextTime);
    clearActiveWord();
  }, [clearActiveWord, getPointerSeekTime, previewSeekTime]);

  const handleSeekMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (!isScrubbingRef.current) {
      return;
    }

    event.preventDefault();
    previewSeekTime(getPointerSeekTime(event.clientX));
  }, [getPointerSeekTime, previewSeekTime]);

  const handleSeekInput = useCallback((event: FormEvent<HTMLInputElement> | ChangeEvent<HTMLInputElement>) => {
    const nextTime = Number(event.currentTarget.value);

    if (!Number.isFinite(nextTime)) {
      return;
    }

    if (event.type === 'change') {
      if (isScrubbingRef.current) {
        finishScrubbing(nextTime);
      } else {
        commitSeekTime(nextTime);
      }
      return;
    }

    if (isScrubbingRef.current) {
      previewSeekTime(nextTime);
      return;
    }

    commitSeekTime(nextTime);
  }, [commitSeekTime, finishScrubbing, previewSeekTime]);

  const handleSeekEnd = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (!isScrubbingRef.current) {
      return;
    }

    event.preventDefault();
    finishScrubbing(event.type === 'pointerup'
      ? getPointerSeekTime(event.clientX)
      : lastPreviewSeekTimeRef.current);
  }, [finishScrubbing, getPointerSeekTime]);

  const handlePlay = useCallback(() => {
    syncFromAudioTime();
    setIsPlaying(true);
  }, [syncFromAudioTime]);

  const handlePause = useCallback(() => {
    syncFromAudioTime();
    setIsPlaying(false);
  }, [syncFromAudioTime]);

  const handleSeeked = useCallback(() => {
    const audio = audioRef.current;
    const syncTime = audio && Math.abs(audio.currentTime - committedSeekTimeRef.current) < 0.25
      ? committedSeekTimeRef.current
      : audio?.currentTime ?? committedSeekTimeRef.current;

    isSeekPendingRef.current = false;
    syncToTime(syncTime);

    if (seekResumeTimerRef.current !== null) {
      window.clearTimeout(seekResumeTimerRef.current);
      seekResumeTimerRef.current = null;
    }

    if (pendingResumeAfterSeekRef.current) {
      pendingResumeAfterSeekRef.current = false;
      seekResumeTimerRef.current = window.setTimeout(() => {
        seekResumeTimerRef.current = null;
        void playAudio();
      }, SEEK_RESUME_DELAY_MS);
    }
  }, [playAudio, syncToTime]);

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

      if (audio && !isScrubbingRef.current && !isSeekPendingRef.current) {
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
          <div
            className="audio-progress-control"
            onLostPointerCapture={handleSeekEnd}
            onPointerCancel={handleSeekEnd}
            onPointerDown={handleSeekStart}
            onPointerMove={handleSeekMove}
            onPointerUp={handleSeekEnd}
            ref={progressControlRef}
            style={progressStyle}
          >
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
              onPointerCancel={handleSeekEnd}
              onPointerDown={handleSeekStart}
              onPointerUp={handleSeekEnd}
              ref={seekInputRef}
              step="0.01"
              type="range"
              value={effectiveDuration ? Math.min(currentTime, effectiveDuration) : 0}
            />
          </div>
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
