export type NarrationLang = 'en' | 'ar';

export type NarrationWordTiming = {
  wordIndex: number;
  start: number;
};

export type NarrationTranscriptSegment = {
  text: string;
  timestamp: [number, number | null];
};

type RawNarrationTranscriptSegment = {
  text: string;
  timestamp: [unknown, unknown];
};

type WeightedNarrationToken =
  | { kind: 'word'; value: string }
  | { kind: 'pause'; weight: number };

const textTokenPattern = /[\p{L}\p{M}\p{N}]+(?:[''-][\p{L}\p{M}\p{N}]+)*|\s+|[^\s]/gu;
const timingTokenPattern = /[\p{L}\p{M}\p{N}]+(?:[''-][\p{L}\p{M}\p{N}]+)*|[.!?\u061F]+|[,;:\u060C\u061B]+|\n{2,}/gu;
const wordPattern = /[\p{L}\p{N}]/u;

export function splitNarrationTextTokens(text: string) {
  return text.match(textTokenPattern) ?? [text];
}

export function isNarrationWordToken(token: string) {
  return wordPattern.test(token);
}

function stripMarkdownForNarration(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, '\n')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/[*_~`]/g, '')
    .replace(/[()[\]{}]/g, ' ');
}

function getPauseWeight(token: string) {
  if (/\n{2,}/.test(token)) {
    return 0.8;
  }

  if (/[.!?\u061F]/.test(token)) {
    return 0.6;
  }

  if (/[,;:\u060C\u061B]/.test(token)) {
    return 0.32;
  }

  return 0;
}

function getWordWeight(word: string, lang: NarrationLang) {
  const baseWeight = lang === 'ar' ? 0.46 : 0.5;
  const characterWeight = lang === 'ar' ? 0.048 : 0.052;

  return baseWeight + Math.min(word.length, 16) * characterWeight;
}

function getWeightedNarrationTokens(markdown: string): WeightedNarrationToken[] {
  const visibleText = stripMarkdownForNarration(markdown);
  const rawTokens = visibleText.match(timingTokenPattern) ?? [];

  return rawTokens
    .map((token): WeightedNarrationToken | null => {
      if (isNarrationWordToken(token)) {
        return { kind: 'word', value: token };
      }

      const weight = getPauseWeight(token);
      return weight > 0 ? { kind: 'pause', weight } : null;
    })
    .filter((token): token is WeightedNarrationToken => token !== null);
}

export function getNarrationWords(markdown: string) {
  return getWeightedNarrationTokens(markdown)
    .filter((token): token is Extract<WeightedNarrationToken, { kind: 'word' }> => token.kind === 'word')
    .map((token) => token.value);
}

export function countNarrationWords(markdown: string) {
  return getNarrationWords(markdown).length;
}

export function createNarrationWordTimings(markdown: string, duration: number, lang: NarrationLang) {
  if (!Number.isFinite(duration) || duration <= 0) {
    return [];
  }

  const tokens = getWeightedNarrationTokens(markdown);
  const weightedStarts: NarrationWordTiming[] = [];
  let totalWeight = 0;
  let wordIndex = 0;

  tokens.forEach((token) => {
    if (token.kind === 'word') {
      weightedStarts.push({ wordIndex, start: totalWeight });
      totalWeight += getWordWeight(token.value, lang);
      wordIndex += 1;
      return;
    }

    totalWeight += token.weight;
  });

  if (totalWeight <= 0 || weightedStarts.length === 0) {
    return [];
  }

  return weightedStarts.map((timing) => ({
    wordIndex: timing.wordIndex,
    start: (timing.start / totalWeight) * duration,
  }));
}

function isTranscriptSegment(value: unknown): value is RawNarrationTranscriptSegment {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const segment = value as { text?: unknown; timestamp?: unknown };

  if (typeof segment.text !== 'string' || !Array.isArray(segment.timestamp) || segment.timestamp.length < 2) {
    return false;
  }

  const [start, end] = segment.timestamp;
  return Number.isFinite(Number(start)) && (end === null || Number.isFinite(Number(end)));
}

export function parseNarrationTranscript(value: unknown): NarrationTranscriptSegment[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isTranscriptSegment)
    .map((segment) => ({
      text: segment.text,
      timestamp: [
        Number(segment.timestamp[0]),
        segment.timestamp[1] === null ? null : Number(segment.timestamp[1]),
      ],
    }));
}

export function getNarrationTranscriptDuration(transcript: NarrationTranscriptSegment[]) {
  return transcript.reduce((duration, segment) => {
    const end = segment.timestamp[1];
    return typeof end === 'number' && Number.isFinite(end) && end > duration ? end : duration;
  }, 0);
}

export function hasOpenEndedNarrationSegment(transcript: NarrationTranscriptSegment[]) {
  return transcript.some((segment) => segment.timestamp[1] === null);
}

function normalizeNarrationWord(word: string) {
  return word
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
}

function createArticleWordMapper(articleText?: string) {
  const articleWords = articleText ? getNarrationWords(articleText) : [];
  let articleCursor = 0;
  let fallbackCursor = 0;

  return (word: string) => {
    if (articleWords.length === 0) {
      const wordIndex = fallbackCursor;
      fallbackCursor += 1;
      return wordIndex;
    }

    const normalizedWord = normalizeNarrationWord(word);

    for (let index = articleCursor; index < articleWords.length; index += 1) {
      if (normalizeNarrationWord(articleWords[index]) === normalizedWord) {
        articleCursor = index + 1;
        return index;
      }
    }

    if (articleCursor >= articleWords.length) {
      return null;
    }

    const wordIndex = articleCursor;
    articleCursor += 1;
    return wordIndex;
  };
}

export function createNarrationWordTimingsFromTranscript(
  transcript: NarrationTranscriptSegment[],
  lang: NarrationLang,
  articleText?: string,
  fallbackDuration = 0,
) {
  const timings: NarrationWordTiming[] = [];
  const getArticleWordIndex = createArticleWordMapper(articleText);

  transcript.forEach((segment) => {
    const [start, rawEnd] = segment.timestamp;
    const end = rawEnd ?? fallbackDuration;

    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      return;
    }

    const words = splitNarrationTextTokens(segment.text).filter(isNarrationWordToken);

    if (words.length === 0) {
      return;
    }

    const wordWeights = words.map((word) => getWordWeight(word, lang));
    const totalWeight = wordWeights.reduce((total, weight) => total + weight, 0);
    let elapsedWeight = 0;

    words.forEach((word, index) => {
      const wordIndex = getArticleWordIndex(word);

      if (wordIndex !== null) {
        timings.push({
          wordIndex,
          start: start + (elapsedWeight / totalWeight) * (end - start),
        });
      }

      elapsedWeight += wordWeights[index];
    });
  });

  return timings.sort((a, b) => a.start - b.start);
}

export function findActiveNarrationWord(timings: NarrationWordTiming[], currentTime: number) {
  if (timings.length === 0 || !Number.isFinite(currentTime) || currentTime < 0) {
    return null;
  }

  let low = 0;
  let high = timings.length - 1;
  let match = -1;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);

    if (timings[middle].start <= currentTime) {
      match = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return match >= 0 ? timings[match].wordIndex : null;
}
