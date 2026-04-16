/**
 * Smart Blog Search Engine v2
 *
 * Features:
 *  - Inverted index for O(1) candidate lookup per token
 *  - Per-field inverted index for fast field-specific lookups
 *  - TF-IDF scoring with BM25-inspired term frequency saturation
 *  - Heavily title-prioritized ranking (title ≫≫ tags > excerpt > content)
 *  - Title starts-with bonus (query at beginning of title = highest signal)
 *  - Full title coverage bonus (all query tokens present in title)
 *  - Multi-token AND intersection with per-token scoring
 *  - Bigram fuzzy matching for typo tolerance
 *  - Levenshtein distance for precise near-miss detection
 *  - Prefix matching (type-ahead: "phy" → "physics")
 *  - Exact phrase bonus with field-tiered multipliers
 *  - Substring matching fallback for partial word queries
 *  - Recency boost (newer articles rank higher on tie)
 *  - Pinned post boost
 */

import type { Post } from './markdown';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/** Weights per field — title is king */
const FIELD_WEIGHTS = {
  title: 50,
  tags: 14,
  excerpt: 6,
  author: 4,
  content: 1,
} as const;

/** BM25-like parameters */
const K1 = 1.4;  // term-frequency saturation
const B = 0.75;  // length normalization

/** Extra boosts */
const TITLE_EXACT_MATCH_BONUS = 100;   // query IS the title (or nearly)
const TITLE_STARTS_WITH_BONUS = 60;    // title starts with the query
const TITLE_CONTAINS_BONUS = 35;       // title contains the full query phrase
const TITLE_ALL_TOKENS_BONUS = 25;     // every query token appears in title
const EXACT_PHRASE_BONUS = 10;
const PINNED_BOOST = 1.5;
const RECENCY_HALF_LIFE_DAYS = 365;

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

/** Normalize & split into tokens. Strips markdown & punctuation. */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[#*_`~[\](){}|>!\\]/g, ' ')   // strip markdown chars
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')        // strip remaining punctuation, keep unicode letters & digits
    .split(/\s+/)
    .filter((t) => t.length > 1);              // drop single-char noise
}

/** Generate character bigrams for fuzzy matching */
function bigrams(word: string): Set<string> {
  const s = new Set<string>();
  for (let i = 0; i < word.length - 1; i++) {
    s.add(word.slice(i, i + 2));
  }
  return s;
}

/** Dice coefficient — similarity between two sets of bigrams [0..1] */
function diceCoefficient(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  for (const bg of a) {
    if (b.has(bg)) intersection++;
  }
  return (2 * intersection) / (a.size + b.size);
}

/**
 * Levenshtein edit distance — for precise single-char typo detection.
 * Bounded: returns Infinity early if distance exceeds maxDist.
 */
function levenshtein(a: string, b: string, maxDist: number = 2): number {
  if (Math.abs(a.length - b.length) > maxDist) return Infinity;
  const m = a.length;
  const n = b.length;
  // Single-row DP
  let prev = new Uint16Array(n + 1);
  let curr = new Uint16Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    let rowMin = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > maxDist) return Infinity;
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

// ---------------------------------------------------------------------------
// Search Document (pre-processed at build time)
// ---------------------------------------------------------------------------

interface FieldTerms {
  tokens: string[];
  /** token → count */
  freq: Map<string, number>;
  /** lowercased raw text for substring matching */
  raw: string;
}

interface SearchDoc {
  post: Post;
  originalIndex: number;
  fields: Record<keyof typeof FIELD_WEIGHTS, FieldTerms>;
  /** All unique tokens for inverted index */
  allTokens: Set<string>;
  /** Union of all bigrams for fuzzy matching */
  allBigrams: Map<string, Set<string>>;
  /** Total token count across all fields */
  totalLength: number;
  /** Recency factor [0..1] — 1 for today, decaying */
  recencyFactor: number;
}

function buildFieldTerms(text: string): FieldTerms {
  const tokens = tokenize(text);
  const freq = new Map<string, number>();
  for (const t of tokens) {
    freq.set(t, (freq.get(t) || 0) + 1);
  }
  return { tokens, freq, raw: text.toLowerCase() };
}

function buildSearchDoc(post: Post, index: number, now: number): SearchDoc {
  const fields = {
    title: buildFieldTerms(post.meta.title),
    tags: buildFieldTerms((post.meta.tags ?? []).join(' ')),
    excerpt: buildFieldTerms(post.meta.excerpt),
    author: buildFieldTerms(post.meta.author),
    content: buildFieldTerms(post.content),
  };

  const allTokens = new Set<string>();
  const allBigrams = new Map<string, Set<string>>();

  let totalLength = 0;
  for (const field of Object.values(fields)) {
    totalLength += field.tokens.length;
    for (const t of field.freq.keys()) {
      allTokens.add(t);
      if (!allBigrams.has(t)) {
        allBigrams.set(t, bigrams(t));
      }
    }
  }

  // Recency: exponential decay
  const postDate = new Date(post.meta.date).getTime();
  const ageDays = Math.max(0, (now - postDate) / (1000 * 60 * 60 * 24));
  const recencyFactor = Math.pow(0.5, ageDays / RECENCY_HALF_LIFE_DAYS);

  return { post, originalIndex: index, fields, allTokens, allBigrams, totalLength, recencyFactor };
}

// ---------------------------------------------------------------------------
// Inverted Index
// ---------------------------------------------------------------------------

type FieldName = keyof typeof FIELD_WEIGHTS;

interface SearchIndex {
  docs: SearchDoc[];
  /** token → set of doc indices that contain this token (any field) */
  invertedIndex: Map<string, Set<number>>;
  /** field → token → set of doc indices (for field-specific lookups) */
  fieldIndex: Record<FieldName, Map<string, Set<number>>>;
  /** average document length */
  avgDl: number;
  /** per-field average lengths */
  avgFieldLen: Record<FieldName, number>;
  /** total number of documents */
  N: number;
  /** All unique tokens in the corpus (for fuzzy expansion) */
  corpusTokenBigrams: Map<string, Set<string>>;
}

function buildIndex(posts: Post[]): SearchIndex {
  const now = Date.now();
  const docs = posts.map((p, i) => buildSearchDoc(p, i, now));
  const invertedIndex = new Map<string, Set<number>>();
  const corpusTokenBigrams = new Map<string, Set<string>>();

  const fieldNames: FieldName[] = ['title', 'tags', 'excerpt', 'author', 'content'];
  const fieldIndex = {} as Record<FieldName, Map<string, Set<number>>>;
  const fieldLenSums = {} as Record<FieldName, number>;
  for (const fn of fieldNames) {
    fieldIndex[fn] = new Map();
    fieldLenSums[fn] = 0;
  }

  let totalLen = 0;
  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    totalLen += doc.totalLength;

    for (const token of doc.allTokens) {
      let set = invertedIndex.get(token);
      if (!set) {
        set = new Set();
        invertedIndex.set(token, set);
      }
      set.add(i);

      if (!corpusTokenBigrams.has(token)) {
        corpusTokenBigrams.set(token, bigrams(token));
      }
    }

    // Build per-field inverted index
    for (const fn of fieldNames) {
      const field = doc.fields[fn];
      fieldLenSums[fn] += field.tokens.length;
      for (const token of field.freq.keys()) {
        let set = fieldIndex[fn].get(token);
        if (!set) {
          set = new Set();
          fieldIndex[fn].set(token, set);
        }
        set.add(i);
      }
    }
  }

  const avgFieldLen = {} as Record<FieldName, number>;
  for (const fn of fieldNames) {
    avgFieldLen[fn] = docs.length > 0 ? fieldLenSums[fn] / docs.length : 1;
  }

  return {
    docs,
    invertedIndex,
    fieldIndex,
    avgDl: docs.length > 0 ? totalLen / docs.length : 1,
    avgFieldLen,
    N: docs.length,
    corpusTokenBigrams,
  };
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/**
 * BM25-inspired score for a single term against a single field.
 * Uses per-field average length for more accurate normalization.
 */
function bm25FieldScore(
  termFreq: number,
  fieldLength: number,
  avgFieldLen: number,
  idf: number,
): number {
  if (termFreq === 0) return 0;
  const norm = 1 - B + B * (fieldLength / Math.max(avgFieldLen, 1));
  return idf * ((termFreq * (K1 + 1)) / (termFreq + K1 * norm));
}

function computeIdf(docFreq: number, N: number): number {
  return Math.max(0, Math.log((N - docFreq + 0.5) / (docFreq + 0.5) + 1));
}

/** Score one document against the full query */
function scoreDoc(
  doc: SearchDoc,
  queryTokens: string[],
  rawQuery: string,
  idx: SearchIndex,
): number {
  let score = 0;

  // ---- Per-token BM25 scoring with field weights ----
  for (const qt of queryTokens) {
    const docFreq = idx.invertedIndex.get(qt)?.size ?? 0;
    const idf = computeIdf(docFreq, idx.N);

    for (const [fieldName, weight] of Object.entries(FIELD_WEIGHTS)) {
      const fn = fieldName as FieldName;
      const field = doc.fields[fn];
      const tf = field.freq.get(qt) || 0;
      if (tf > 0) {
        score += weight * bm25FieldScore(tf, field.tokens.length, idx.avgFieldLen[fn], idf);
      }
    }
  }

  // ---- Title-first prioritization bonuses ----
  const lowerQuery = rawQuery.toLowerCase().trim();
  const titleLower = doc.fields.title.raw;

  if (lowerQuery.length > 0) {
    // Near-exact title match (query ≈ full title)
    if (titleLower === lowerQuery || titleLower.replace(/[^a-z0-9\s]/g, '').trim() === lowerQuery.replace(/[^a-z0-9\s]/g, '').trim()) {
      score += TITLE_EXACT_MATCH_BONUS;
    }
    // Title starts with the query
    else if (titleLower.startsWith(lowerQuery)) {
      score += TITLE_STARTS_WITH_BONUS;
    }
    // Title contains the full query phrase
    else if (titleLower.includes(lowerQuery)) {
      score += TITLE_CONTAINS_BONUS;
    }

    // All query tokens appear in the title
    if (queryTokens.length > 1) {
      const titleTokenSet = doc.fields.title.freq;
      const allInTitle = queryTokens.every((qt) => titleTokenSet.has(qt));
      if (allInTitle) {
        score += TITLE_ALL_TOKENS_BONUS;
      }
    }
  }

  // ---- Exact phrase bonus for other fields ----
  if (lowerQuery.length > 2) {
    if ((doc.post.meta.tags ?? []).some((t) => t.toLowerCase().includes(lowerQuery))) {
      score += EXACT_PHRASE_BONUS * 2;
    }
    if (doc.fields.excerpt.raw.includes(lowerQuery)) {
      score += EXACT_PHRASE_BONUS;
    }
    if (doc.fields.content.raw.includes(lowerQuery)) {
      score += EXACT_PHRASE_BONUS * 0.3;
    }
  }

  // ---- Pinned boost (multiplicative, but mild) ----
  if (doc.post.meta.pinned) {
    score *= PINNED_BOOST;
  }

  // ---- Recency boost — gentle multiplier so newer content wins ties ----
  score *= (1 + 0.2 * doc.recencyFactor);

  return score;
}

// ---------------------------------------------------------------------------
// Fuzzy & Prefix Token Expansion
// ---------------------------------------------------------------------------

const FUZZY_DICE_THRESHOLD = 0.5;
const MAX_FUZZY_EXPANSIONS = 4;

/**
 * For a query token that has no exact match in the inverted index,
 * find corpus tokens that are "close enough" via Levenshtein + bigram similarity.
 */
function fuzzyExpand(queryToken: string, idx: SearchIndex): { token: string; penalty: number }[] {
  const qBigrams = bigrams(queryToken);
  const candidates: { token: string; sim: number; editDist: number }[] = [];

  for (const [corpusToken, cBigrams] of idx.corpusTokenBigrams) {
    if (Math.abs(corpusToken.length - queryToken.length) > 3) continue;

    // Fast bigram prefilter
    const sim = diceCoefficient(qBigrams, cBigrams);
    if (sim < FUZZY_DICE_THRESHOLD) continue;

    // Precise Levenshtein check
    const dist = levenshtein(queryToken, corpusToken, 2);
    if (dist <= 2) {
      candidates.push({ token: corpusToken, sim, editDist: dist });
    }
  }

  // Sort by edit distance first, then by Dice similarity
  candidates.sort((a, b) => a.editDist - b.editDist || b.sim - a.sim);

  return candidates.slice(0, MAX_FUZZY_EXPANSIONS).map((c) => ({
    token: c.token,
    // Fuzzy matches get a scoring penalty — exact > prefix > fuzzy
    penalty: c.editDist === 1 ? 0.8 : 0.5,
  }));
}

/**
 * Find prefix matches (type-ahead). "phy" → "physics", "philosophy".
 * Prioritize shorter expansions (closer to what user typed).
 */
function prefixExpand(queryToken: string, idx: SearchIndex): string[] {
  const matches: { token: string; len: number }[] = [];
  for (const corpusToken of idx.invertedIndex.keys()) {
    if (corpusToken.startsWith(queryToken) && corpusToken !== queryToken) {
      matches.push({ token: corpusToken, len: corpusToken.length });
    }
  }
  matches.sort((a, b) => a.len - b.len);
  return matches.slice(0, MAX_FUZZY_EXPANSIONS).map((m) => m.token);
}

/**
 * Substring matching fallback — find corpus tokens that contain the query token.
 * Useful for partial matches like "graph" in "photography".
 */
function substringExpand(queryToken: string, idx: SearchIndex): string[] {
  if (queryToken.length < 3) return []; // too short for meaningful substring
  const matches: string[] = [];
  for (const corpusToken of idx.invertedIndex.keys()) {
    if (corpusToken.includes(queryToken) && corpusToken !== queryToken) {
      matches.push(corpusToken);
      if (matches.length >= MAX_FUZZY_EXPANSIONS) break;
    }
  }
  return matches;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type SearchResult = {
  post: Post;
  originalIndex: number;
  score: number;
};

let cachedIndex: SearchIndex | null = null;

/** Build (or return cached) search index for the given posts. */
export function getSearchIndex(posts: Post[]): SearchIndex {
  if (!cachedIndex || cachedIndex.N !== posts.length) {
    cachedIndex = buildIndex(posts);
  }
  return cachedIndex;
}

/**
 * Search posts with ranked, fuzzy, field-weighted relevance scoring.
 *
 * Returns all posts (sorted by score descending) when query is empty,
 * or only matching posts when a query is provided.
 */
export function searchPosts(query: string, posts: Post[]): SearchResult[] {
  const idx = getSearchIndex(posts);
  const trimmed = query.trim();

  // No query → return all posts in original order
  if (!trimmed) {
    return idx.docs.map((doc) => ({
      post: doc.post,
      originalIndex: doc.originalIndex,
      score: 0,
    }));
  }

  const rawTokens = tokenize(trimmed);
  if (rawTokens.length === 0) {
    // Query was all punctuation/single chars — fall back to substring search on raw text
    return substringFallback(trimmed, idx);
  }

  // Expand each query token: exact → prefix → fuzzy → substring
  type ExpandedToken = { token: string; penalty: number };
  const expandedTokenSets: ExpandedToken[][] = rawTokens.map((qt) => {
    // 1. Exact match
    if (idx.invertedIndex.has(qt)) {
      const result: ExpandedToken[] = [{ token: qt, penalty: 1.0 }];
      // Also add prefix expansions for broader recall
      const prefixes = prefixExpand(qt, idx);
      for (const p of prefixes) {
        result.push({ token: p, penalty: 0.6 });
      }
      return result;
    }

    // 2. Prefix match (user is still typing)
    const prefixes = prefixExpand(qt, idx);
    if (prefixes.length > 0) {
      return prefixes.map((p) => ({ token: p, penalty: 0.85 }));
    }

    // 3. Fuzzy match (typo correction)
    const fuzzy = fuzzyExpand(qt, idx);
    if (fuzzy.length > 0) {
      return fuzzy;
    }

    // 4. Substring match (partial word)
    const substrings = substringExpand(qt, idx);
    if (substrings.length > 0) {
      return substrings.map((s) => ({ token: s, penalty: 0.4 }));
    }

    // 5. No match at all — keep the token (will get 0 score, but allows phrase matching)
    return [{ token: qt, penalty: 1.0 }];
  });

  // Gather candidate doc indices — intersection for AND, union fallback
  let candidateSet: Set<number> | null = null;

  for (const tokenSet of expandedTokenSets) {
    const tokenCandidates = new Set<number>();
    for (const { token } of tokenSet) {
      const docSet = idx.invertedIndex.get(token);
      if (docSet) {
        for (const d of docSet) tokenCandidates.add(d);
      }
    }
    if (candidateSet === null) {
      candidateSet = tokenCandidates;
    } else {
      const intersection = new Set<number>();
      for (const d of candidateSet) {
        if (tokenCandidates.has(d)) intersection.add(d);
      }
      candidateSet = intersection.size > 0 ? intersection : new Set([...candidateSet, ...tokenCandidates]);
    }
  }

  // Also add candidates from raw substring matching on titles (catch-all safety net)
  const lowerTrimmed = trimmed.toLowerCase();
  for (let i = 0; i < idx.docs.length; i++) {
    if (idx.docs[i].fields.title.raw.includes(lowerTrimmed)) {
      if (!candidateSet) candidateSet = new Set();
      candidateSet.add(i);
    }
  }

  if (!candidateSet || candidateSet.size === 0) {
    return [];
  }

  // Flatten expanded tokens for scoring, applying penalties
  const flatExpandedTokens = expandedTokenSets.flat();
  const allQueryTokens = flatExpandedTokens.map((et) => et.token);
  const avgPenalty = flatExpandedTokens.reduce((sum, et) => sum + et.penalty, 0) / flatExpandedTokens.length;

  // Score candidates
  const results: SearchResult[] = [];
  for (const docIdx of candidateSet) {
    const doc = idx.docs[docIdx];
    let score = scoreDoc(doc, allQueryTokens, trimmed, idx);

    // Apply average penalty from fuzzy expansion
    if (avgPenalty < 1.0) {
      // Only penalize the BM25 portion, not the title bonuses
      score *= (0.4 + 0.6 * avgPenalty);
    }

    if (score > 0) {
      results.push({ post: doc.post, originalIndex: doc.originalIndex, score });
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  return results;
}

/** Fallback for when tokenization yields nothing (e.g. query is all symbols) */
function substringFallback(raw: string, idx: SearchIndex): SearchResult[] {
  const lower = raw.toLowerCase();
  const results: SearchResult[] = [];

  for (const doc of idx.docs) {
    let score = 0;
    if (doc.fields.title.raw.includes(lower)) score += 50;
    else if (doc.fields.tags.raw.includes(lower)) score += 20;
    else if (doc.fields.excerpt.raw.includes(lower)) score += 10;
    else if (doc.fields.content.raw.includes(lower)) score += 1;

    if (score > 0) {
      results.push({ post: doc.post, originalIndex: doc.originalIndex, score });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}
