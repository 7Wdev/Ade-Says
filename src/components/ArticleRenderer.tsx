import {
  lazy,
  memo,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

import { createMarkdownComponents, type NarrationRenderState } from './articleMarkdownComponents';
import ViewportRender from './ViewportRender';
import { countNarrationWords } from '../utils/narration';

interface ArticleRendererProps {
  bookmark?: {
    activeWordIndex: number | null;
    onToggle: (wordIndex: number) => void;
    scrollRequest: number;
  };
  content: string;
  narration?: {
    activeWordIndex: number | null;
    enabled: boolean;
  };
}

const MathArticleRenderer = lazy(() => import('./MathArticleRenderer'));
const rehypePlugins = [rehypeRaw];
const mathDelimiterPattern = /(^|[^\\])(?:\$\$?[\s\S]*?\$\$?|\\(?:\(|\[|begin\{))/;
const ARTICLE_VIRTUALIZATION_MIN_CHARS = 6500;
const ARTICLE_CHUNK_TARGET_CHARS = 2200;
const ARTICLE_CHUNK_TARGET_HEIGHT = 900;
const ARTICLE_INITIAL_RENDER_HEIGHT = 1800;
const ARTICLE_ROOT_MARGIN = '2400px 0px';
const ARTICLE_IDLE_RENDER_TIMEOUT = 700;
const ARTICLE_IDLE_RENDER_FALLBACK_DELAY = 90;
const ARTICLE_ESTIMATED_CONTENT_WIDTH = 820;
const ARTICLE_ESTIMATED_PHOTO_PAIR_GAP = 18;
const ARTICLE_TOUCH_TRIPLE_TAP_DELAY = 520;
const ARTICLE_TOUCH_CLICK_SUPPRESSION = 700;

type ArticleChunk = {
  content: string;
  estimatedHeight: number;
  hasMath: boolean;
  id: string;
};

type MarkdownAtom = {
  content: string;
  estimatedHeight: number;
  isHeading: boolean;
  isHeavy: boolean;
};

type MarkdownBlockProps = {
  content: string;
  hasMath: boolean;
  narration?: ArticleRendererProps['narration'];
  wordRenderingEnabled: boolean;
  wordOffset: number;
};

type ArticleWidthClass = 'compact' | 'regular' | 'wide';

type ArticleIdleDeadline = {
  didTimeout: boolean;
  timeRemaining: () => number;
};

type ArticleIdleWindow = Window & {
  cancelIdleCallback?: (handle: number) => void;
  requestIdleCallback?: (
    callback: (deadline: ArticleIdleDeadline) => void,
    options?: { timeout: number },
  ) => number;
};

type ArticleIdleRenderState = {
  count: number;
  key: string;
};

type ArticleTapState = {
  count: number;
  lastTapTime: number;
  wordIndex: number | null;
};

type ArticleBookmarkLineMarkerState = {
  side: 'left' | 'right';
  state: 'active' | 'removing';
  top: number;
};

type ArticleBookmarkWordState = 'active' | 'entering' | 'removing';

function createChunkId(index: number, content: string, estimatedHeight: number) {
  let hash = 0;

  for (let charIndex = 0; charIndex < content.length; charIndex += 1) {
    hash = ((hash << 5) - hash + content.charCodeAt(charIndex)) | 0;
  }

  return `${index}-${content.length}-${Math.round(estimatedHeight)}-${Math.abs(hash).toString(36)}`;
}

function getFenceLanguage(line: string) {
  return /^(```|~~~)\s*([\w-]+)?/.exec(line.trim())?.[2]?.toLowerCase() ?? '';
}

function getArticleWidthClass(width: number): ArticleWidthClass {
  if (width < 640) {
    return 'compact';
  }

  if (width < 920) {
    return 'regular';
  }

  return 'wide';
}

function getInitialArticleWidthClass(): ArticleWidthClass {
  if (typeof window === 'undefined') {
    return 'wide';
  }

  return getArticleWidthClass(window.innerWidth);
}

function scheduleArticleIdleRender(callback: (deadline: ArticleIdleDeadline) => void): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const idleWindow = window as ArticleIdleWindow;

  if (idleWindow.requestIdleCallback && idleWindow.cancelIdleCallback) {
    const handle = idleWindow.requestIdleCallback(callback, { timeout: ARTICLE_IDLE_RENDER_TIMEOUT });

    return () => {
      idleWindow.cancelIdleCallback?.(handle);
    };
  }

  const handle = window.setTimeout(() => {
    callback({
      didTimeout: true,
      timeRemaining: () => 0,
    });
  }, ARTICLE_IDLE_RENDER_FALLBACK_DELAY);

  return () => window.clearTimeout(handle);
}

function estimateParagraphHeight(content: string) {
  const text = content
    .replace(/<[^>]+>/g, '')
    .replace(/!\[[^\]]*]\([^)]+\)/g, '')
    .trim();
  const lines = Math.max(1, Math.ceil(text.length / 76));

  return 24 + lines * 32;
}

function getNumericHtmlAttribute(markup: string, attribute: string) {
  const match = new RegExp(`\\s${attribute}\\s*=\\s*["']?(\\d+(?:\\.\\d+)?)`, 'i').exec(markup);
  const value = match ? Number(match[1]) : 0;

  return Number.isFinite(value) && value > 0 ? value : 0;
}

function estimateImageRenderedHeight(markup: string, renderedWidth: number) {
  const intrinsicWidth = getNumericHtmlAttribute(markup, 'width');
  const intrinsicHeight = getNumericHtmlAttribute(markup, 'height');

  if (!intrinsicWidth || !intrinsicHeight) {
    return 430;
  }

  return Math.round(renderedWidth * (intrinsicHeight / intrinsicWidth));
}

function estimateImageOuterHeight(markup: string, renderedWidth = ARTICLE_ESTIMATED_CONTENT_WIDTH) {
  return estimateImageRenderedHeight(markup, renderedWidth) + 64;
}

function estimateCodeFenceHeight(content: string) {
  const lines = content.split(/\r?\n/);
  const language = getFenceLanguage(lines[0] ?? '');
  const sandboxHeight = /<!--\s*sandbox-height:\s*(\d+)\s*-->/i.exec(content)?.[1];

  if (language === 'html-live') {
    const parsedHeight = sandboxHeight ? Number(sandboxHeight) : 320;

    return Math.min(760, Math.max(260, parsedHeight)) + 72;
  }

  if (language === 'tikz') {
    return 320;
  }

  return 154 + Math.max(1, lines.length - 2) * 25;
}

function estimateRawHtmlHeight(content: string, contentWidth = ARTICLE_ESTIMATED_CONTENT_WIDTH) {
  const imageTags = Array.from(content.matchAll(/<img\b[^>]*>/gi), (match) => match[0]);

  if (/class=["'][^"']*\bstego-photo-pair\b/i.test(content)) {
    const columnWidth = (contentWidth - ARTICLE_ESTIMATED_PHOTO_PAIR_GAP) / 2;
    const imageHeight = Math.max(
      220,
      ...imageTags.map((tag) => estimateImageRenderedHeight(tag, columnWidth)),
    );

    return imageHeight + 100;
  }

  if (imageTags.length > 0) {
    return imageTags.reduce((total, tag) => total + estimateImageOuterHeight(tag, contentWidth), 0);
  }

  return estimateParagraphHeight(content);
}

function estimateMarkdownAtom(content: string) {
  const trimmed = content.trim();
  const lineCount = trimmed.split(/\r?\n/).length;

  if (!trimmed) {
    return 0;
  }

  if (/^(```|~~~)/.test(trimmed)) {
    return estimateCodeFenceHeight(trimmed);
  }

  if (/^#{1,2}\s+/.test(trimmed)) {
    return /^#\s+/.test(trimmed) ? 144 : 120;
  }

  if (/^#{3,6}\s+/.test(trimmed)) {
    return 92;
  }

  if (/^\$\$/.test(trimmed) || /\\begin\{/.test(trimmed)) {
    return 80 + lineCount * 30;
  }

  if (/^!\[[^\]]*]\([^)]+\)\s*$/.test(trimmed)) {
    return 540;
  }

  if (/^<\w+/i.test(trimmed)) {
    return estimateRawHtmlHeight(trimmed);
  }

  if (/^\|.*\|/.test(trimmed)) {
    return 72 + lineCount * 44;
  }

  return estimateParagraphHeight(trimmed);
}

function splitMarkdownAtoms(content: string): MarkdownAtom[] {
  const atoms: MarkdownAtom[] = [];
  const currentLines: string[] = [];
  const lines = content.split(/\r?\n/);
  let inFence = false;
  let fenceMarker = '';

  const pushAtom = () => {
    const atomContent = currentLines.join('\n').trim();

    currentLines.length = 0;

    if (!atomContent) {
      return;
    }

    const estimatedHeight = estimateMarkdownAtom(atomContent);
    atoms.push({
      content: atomContent,
      estimatedHeight,
      isHeading: /^#{1,3}\s+/.test(atomContent),
      isHeavy: estimatedHeight >= 420 || /^(```|~~~)/.test(atomContent),
    });
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const fenceMatch = /^(```|~~~)/.exec(trimmed);

    if (inFence) {
      currentLines.push(line);

      if (fenceMatch?.[1] === fenceMarker) {
        inFence = false;
        fenceMarker = '';
        pushAtom();
      }

      continue;
    }

    if (fenceMatch) {
      pushAtom();
      inFence = true;
      fenceMarker = fenceMatch[1];
      currentLines.push(line);
      continue;
    }

    if (/^#{1,3}\s+/.test(line)) {
      pushAtom();
      currentLines.push(line);
      pushAtom();
      continue;
    }

    if (trimmed === '') {
      pushAtom();
      continue;
    }

    currentLines.push(line);
  }

  pushAtom();

  return atoms;
}

function createArticleChunks(content: string): ArticleChunk[] {
  if (content.length < ARTICLE_VIRTUALIZATION_MIN_CHARS) {
    return [{
      content,
      estimatedHeight: estimateMarkdownAtom(content),
      hasMath: mathDelimiterPattern.test(content),
      id: createChunkId(0, content, content.length),
    }];
  }

  const atoms = splitMarkdownAtoms(content);
  const chunks: ArticleChunk[] = [];
  const currentAtoms: MarkdownAtom[] = [];
  let currentLength = 0;
  let currentEstimatedHeight = 0;

  const pushChunk = () => {
    const chunkContent = currentAtoms.map((atom) => atom.content).join('\n\n').trim();

    if (chunkContent) {
      chunks.push({
        content: chunkContent,
        estimatedHeight: Math.max(220, currentEstimatedHeight),
        hasMath: mathDelimiterPattern.test(chunkContent),
        id: createChunkId(chunks.length, chunkContent, currentEstimatedHeight),
      });
    }

    currentAtoms.length = 0;
    currentLength = 0;
    currentEstimatedHeight = 0;
  };

  for (const atom of atoms) {
    const shouldSplitBefore = currentAtoms.length > 0 && (
      atom.isHeading ||
      atom.isHeavy ||
      currentLength + atom.content.length > ARTICLE_CHUNK_TARGET_CHARS ||
      currentEstimatedHeight + atom.estimatedHeight > ARTICLE_CHUNK_TARGET_HEIGHT
    );

    if (shouldSplitBefore) {
      pushChunk();
    }

    currentAtoms.push(atom);
    currentLength += atom.content.length + 2;
    currentEstimatedHeight += atom.estimatedHeight;

    if (atom.isHeavy && currentAtoms.length > 0) {
      pushChunk();
    }
  }

  pushChunk();

  return chunks.length > 1 ? chunks : [{
    content,
    estimatedHeight: estimateMarkdownAtom(content),
    hasMath: mathDelimiterPattern.test(content),
    id: createChunkId(0, content, content.length),
  }];
}

function getInitialRenderCount(chunks: ArticleChunk[], widthClass: ArticleWidthClass) {
  let estimatedHeight = 0;

  for (let index = 0; index < chunks.length; index += 1) {
    estimatedHeight += getResponsiveChunkHeight(chunks[index], widthClass);

    if (index >= 1 && estimatedHeight >= ARTICLE_INITIAL_RENDER_HEIGHT) {
      return index + 1;
    }
  }

  return chunks.length;
}

function estimateWrappedCodeHeight(content: string, widthClass: ArticleWidthClass) {
  const lines = content.split(/\r?\n/).slice(1, -1);
  const charsPerLine = widthClass === 'compact' ? 42 : widthClass === 'regular' ? 62 : 92;
  const visualLineCount = lines.reduce((total, line) => (
    total + Math.max(1, Math.ceil(line.length / charsPerLine))
  ), 0);

  return 92 + visualLineCount * 25;
}

function getResponsiveChunkHeight(chunk: ArticleChunk, widthClass: ArticleWidthClass) {
  const fenceLanguage = getFenceLanguage(chunk.content.split(/\r?\n/)[0] ?? '');

  if (widthClass === 'wide') {
    return chunk.estimatedHeight;
  }

  if (/class=["'][^"']*\bstego-photo-pair\b/i.test(chunk.content)) {
    return widthClass === 'compact' ? 850 : 480;
  }

  if (/<img\b/i.test(chunk.content)) {
    const contentWidth = widthClass === 'compact' ? 360 : 620;

    return estimateRawHtmlHeight(chunk.content, contentWidth);
  }

  if (fenceLanguage && fenceLanguage !== 'html-live' && fenceLanguage !== 'tikz') {
    return Math.max(chunk.estimatedHeight, estimateWrappedCodeHeight(chunk.content, widthClass));
  }

  if (fenceLanguage === 'html-live') {
    const sandboxHeight = /<!--\s*sandbox-height:\s*(\d+)\s*-->/i.exec(chunk.content)?.[1];
    const baseHeight = sandboxHeight ? Number(sandboxHeight) : chunk.estimatedHeight;
    const responsiveHeight = widthClass === 'compact'
      ? Math.ceil(baseHeight * 1.35)
      : Math.ceil(baseHeight * 1.15);
    const isTimeline = /timeline-shell/.test(chunk.content);
    const stableHeight = isTimeline && widthClass === 'compact'
      ? Math.max(520, responsiveHeight)
      : responsiveHeight;

    return Math.max(chunk.estimatedHeight, stableHeight + 48);
  }

  return chunk.estimatedHeight;
}

function getChunkIndexForWord(wordIndex: number | null, wordOffsets: number[], wordCounts: number[]) {
  if (wordIndex === null) {
    return -1;
  }

  for (let index = 0; index < wordOffsets.length; index += 1) {
    const startIndex = wordOffsets[index];
    const endIndex = startIndex + wordCounts[index];

    if (wordIndex >= startIndex && wordIndex < endIndex) {
      return index;
    }
  }

  return -1;
}

function getArticleWord(root: HTMLElement, wordIndex: number) {
  return root.querySelector<HTMLElement>(`[data-article-word-index="${wordIndex}"]`);
}

function getArticleWordFromEventTarget(root: HTMLElement, target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return null;
  }

  const word = target.closest<HTMLElement>('[data-article-word-index]');

  return word && root.contains(word) ? word : null;
}

function getArticleWordIndex(word: HTMLElement) {
  const index = Number(word.getAttribute('data-article-word-index'));

  return Number.isInteger(index) && index >= 0 ? index : null;
}

function getBookmarkLineMarkerPlacement(root: HTMLElement, word: HTMLElement) {
  const wordRect = word.getClientRects()[0] ?? word.getBoundingClientRect();

  if (!wordRect.width || !wordRect.height) {
    return null;
  }

  const rootRect = root.getBoundingClientRect();
  const direction = window.getComputedStyle(root).direction;

  return {
    side: direction === 'rtl' ? 'right' : 'left',
    top: wordRect.top - rootRect.top + (wordRect.height / 2),
  } satisfies Pick<ArticleBookmarkLineMarkerState, 'side' | 'top'>;
}

function setBookmarkWordState(
  word: HTMLElement,
  state: ArticleBookmarkWordState,
  scheduleCleanup: (word: HTMLElement) => void,
) {
  if (word.getAttribute('data-bookmark-state') === state) {
    return;
  }

  word.setAttribute('data-bookmark-state', state);

  if (state === 'removing') {
    scheduleCleanup(word);
  }
}

function applyBookmarkStyles(
  root: HTMLElement,
  activeIndex: number | null,
  scheduleCleanup: (word: HTMLElement) => void,
  shouldAnimateEntry: (wordIndex: number) => boolean,
) {
  const words = root.querySelectorAll<HTMLElement>('[data-article-word-index]');

  for (const word of words) {
    const wordIndex = getArticleWordIndex(word);
    const currentState = word.getAttribute('data-bookmark-state');

    if (wordIndex === activeIndex) {
      if (currentState === 'active' || currentState === 'entering') {
        continue;
      }

      setBookmarkWordState(word, shouldAnimateEntry(wordIndex) ? 'entering' : 'active', scheduleCleanup);
    } else if (currentState === 'active' || currentState === 'entering') {
      setBookmarkWordState(word, 'removing', scheduleCleanup);
    } else if (currentState !== 'removing') {
      word.removeAttribute('data-bookmark-state');
    }
  }
}

const ArticleBlockSkeleton = memo(function ArticleBlockSkeleton({ estimatedHeight }: { estimatedHeight: number }) {
  return (
    <div
      className="article-block-skeleton"
      style={{ margin: 0, minHeight: Math.max(180, estimatedHeight) }}
      aria-hidden="true"
    >
      <span className="article-skeleton-line article-skeleton-title" />
      <span className="article-skeleton-line" />
      <span className="article-skeleton-line" />
      <span className="article-skeleton-line article-skeleton-short" />
    </div>
  );
});

const PlainMarkdownBlock = memo(function PlainMarkdownBlock({
  content,
  wordOffset,
  wordRenderingEnabled,
}: Pick<MarkdownBlockProps, 'content' | 'wordOffset' | 'wordRenderingEnabled'>) {
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!wordRenderingEnabled || !rootRef.current) return;

    const words = rootRef.current.querySelectorAll('.narration-word');
    words.forEach((word, index) => {
      const wordIndex = String(wordOffset + index);

      word.setAttribute('data-article-word-index', wordIndex);
      word.setAttribute('data-narration-word-index', wordIndex);
    });
  }, [content, wordOffset, wordRenderingEnabled]);

  const markdownComponents = useMemo(() => {
    const wordRenderingState: NarrationRenderState | undefined = wordRenderingEnabled
      ? { enabled: true }
      : undefined;

    return createMarkdownComponents(wordRenderingState);
  }, [wordRenderingEnabled]);

  return (
    <div style={{ display: 'contents' }} ref={rootRef}>
      <ReactMarkdown
        rehypePlugins={rehypePlugins}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});

const MarkdownBlock = memo(function MarkdownBlock({
  content,
  hasMath,
  narration,
  wordOffset,
  wordRenderingEnabled,
}: MarkdownBlockProps) {
  if (hasMath) {
    return (
      <Suspense fallback={<div className="article-inline-loading" role="status">Loading article</div>}>
        <MathArticleRenderer
          content={content}
          narration={narration}
          wordOffset={wordOffset}
          wordRenderingEnabled={wordRenderingEnabled}
        />
      </Suspense>
    );
  }

  return (
    <PlainMarkdownBlock
      content={content}
      wordOffset={wordOffset}
      wordRenderingEnabled={wordRenderingEnabled}
    />
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.content === nextProps.content &&
    prevProps.hasMath === nextProps.hasMath &&
    prevProps.wordOffset === nextProps.wordOffset &&
    prevProps.narration?.enabled === nextProps.narration?.enabled &&
    prevProps.wordRenderingEnabled === nextProps.wordRenderingEnabled
  );
});

function setNarrationWordClass(word: Element | null, className: string) {
  if (word) {
    word.className = className;
  }
}

function getNarrationWord(root: HTMLElement, index: number) {
  return root.querySelector(`[data-narration-word-index="${index}"]`);
}

function applyNarrationStyles(root: HTMLElement, activeIndex: number | null) {
  const words = root.querySelectorAll('.narration-word');

  for (let index = 0; index < words.length; index += 1) {
    const word = words[index];
    const wordIndex = Number(word.getAttribute('data-narration-word-index'));

    if (!Number.isFinite(wordIndex)) {
      continue;
    }

    if (wordIndex === activeIndex) {
      word.className = 'narration-word narration-word-active';
    } else if (activeIndex !== null && wordIndex < activeIndex) {
      word.className = 'narration-word narration-word-played';
    } else {
      word.className = 'narration-word';
    }
  }
}

function applyNarrationIncrementally(root: HTMLElement, previousIndex: number | null, activeIndex: number | null) {
  if (
    previousIndex === null ||
    activeIndex === null ||
    activeIndex < previousIndex ||
    activeIndex - previousIndex > 120
  ) {
    applyNarrationStyles(root, activeIndex);
    return;
  }

  if (previousIndex === activeIndex) {
    setNarrationWordClass(getNarrationWord(root, activeIndex), 'narration-word narration-word-active');
    return;
  }

  setNarrationWordClass(getNarrationWord(root, previousIndex), 'narration-word narration-word-played');

  for (let index = previousIndex + 1; index < activeIndex; index += 1) {
    setNarrationWordClass(getNarrationWord(root, index), 'narration-word narration-word-played');
  }

  setNarrationWordClass(getNarrationWord(root, activeIndex), 'narration-word narration-word-active');
}

function ArticleRenderer({ bookmark, content, narration }: ArticleRendererProps) {
  const chunks = useMemo(() => createArticleChunks(content), [content]);
  const rootRef = useRef<HTMLDivElement>(null);
  const [articleWidthClass, setArticleWidthClass] = useState<ArticleWidthClass>(getInitialArticleWidthClass);
  const initialRenderCount = useMemo(() => getInitialRenderCount(chunks, articleWidthClass), [articleWidthClass, chunks]);
  const articleRenderKey = useMemo(() => (
    `${chunks.length}:${chunks[0]?.id ?? ''}:${chunks[chunks.length - 1]?.id ?? ''}`
  ), [chunks]);
  const [idleRenderState, setIdleRenderState] = useState<ArticleIdleRenderState>(() => ({
    count: initialRenderCount,
    key: articleRenderKey,
  }));
  const idleRenderCount = idleRenderState.key === articleRenderKey
    ? Math.max(idleRenderState.count, initialRenderCount)
    : initialRenderCount;
  const wordRenderingEnabled = Boolean(narration?.enabled || bookmark);
  const wordCounts = useMemo(() => chunks.map((chunk) => countNarrationWords(chunk.content)), [chunks]);
  const wordOffsets = useMemo(() => {
    return wordCounts.map((_, index) => (
      wordCounts.slice(0, index).reduce((total, wordCount) => total + wordCount, 0)
    ));
  }, [wordCounts]);
  const bookmarkedWordIndex = bookmark?.activeWordIndex ?? null;
  const scrollTargetChunkIndex = bookmark?.scrollRequest
    ? getChunkIndexForWord(bookmarkedWordIndex, wordOffsets, wordCounts)
    : -1;
  const renderedVirtualCount = scrollTargetChunkIndex >= 0
    ? Math.max(idleRenderCount, scrollTargetChunkIndex + 1)
    : idleRenderCount;
  const shouldVirtualize = chunks.length > 1;
  const previousActiveWordRef = useRef<number | null>(null);
  const activeWordRef = useRef<number | null>(null);
  const bookmarkCleanupTimersRef = useRef<number[]>([]);
  const bookmarkMarkerRemovalTimerRef = useRef<number | null>(null);
  const pendingBookmarkEntryWordRef = useRef<number | null>(null);
  const touchTapStateRef = useRef<ArticleTapState>({
    count: 0,
    lastTapTime: 0,
    wordIndex: null,
  });
  const suppressClickUntilRef = useRef(0);
  const [bookmarkMarker, setBookmarkMarker] = useState<ArticleBookmarkLineMarkerState | null>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const updateWidthClass = () => {
      const nextWidthClass = getArticleWidthClass(root.getBoundingClientRect().width || window.innerWidth);
      setArticleWidthClass((currentWidthClass) => (
        currentWidthClass === nextWidthClass ? currentWidthClass : nextWidthClass
      ));
    };

    updateWidthClass();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateWidthClass);
      return () => window.removeEventListener('resize', updateWidthClass);
    }

    const resizeObserver = new ResizeObserver(updateWidthClass);
    resizeObserver.observe(root);
    window.addEventListener('resize', updateWidthClass);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateWidthClass);
    };
  }, [content]);

  useEffect(() => {
    previousActiveWordRef.current = null;
    activeWordRef.current = null;
    pendingBookmarkEntryWordRef.current = null;
    touchTapStateRef.current = {
      count: 0,
      lastTapTime: 0,
      wordIndex: null,
    };
    suppressClickUntilRef.current = 0;
  }, [content]);

  useEffect(() => () => {
    for (const timer of bookmarkCleanupTimersRef.current) {
      window.clearTimeout(timer);
    }

    bookmarkCleanupTimersRef.current = [];

    if (bookmarkMarkerRemovalTimerRef.current !== null) {
      window.clearTimeout(bookmarkMarkerRemovalTimerRef.current);
      bookmarkMarkerRemovalTimerRef.current = null;
    }
  }, []);

  const scheduleBookmarkCleanup = useCallback((word: HTMLElement) => {
    const timer = window.setTimeout(() => {
      if (word.getAttribute('data-bookmark-state') === 'removing') {
        word.removeAttribute('data-bookmark-state');
      }

      bookmarkCleanupTimersRef.current = bookmarkCleanupTimersRef.current.filter((item) => item !== timer);
    }, 600);

    bookmarkCleanupTimersRef.current.push(timer);
  }, []);

  const clearBookmarkMarkerRemoval = useCallback(() => {
    if (bookmarkMarkerRemovalTimerRef.current === null) {
      return;
    }

    window.clearTimeout(bookmarkMarkerRemovalTimerRef.current);
    bookmarkMarkerRemovalTimerRef.current = null;
  }, []);

  const scheduleBookmarkMarkerRemoval = useCallback(() => {
    clearBookmarkMarkerRemoval();
    setBookmarkMarker((currentMarker) => (
      currentMarker ? { ...currentMarker, state: 'removing' } : null
    ));

    bookmarkMarkerRemovalTimerRef.current = window.setTimeout(() => {
      setBookmarkMarker(null);
      bookmarkMarkerRemovalTimerRef.current = null;
    }, 520);
  }, [clearBookmarkMarkerRemoval]);

  const toggleBookmarkedWord = useCallback((word: HTMLElement) => {
    if (!bookmark) {
      return false;
    }

    const wordIndex = getArticleWordIndex(word);
    if (wordIndex === null) {
      return false;
    }

    pendingBookmarkEntryWordRef.current = bookmark.activeWordIndex === wordIndex ? null : wordIndex;
    window.getSelection()?.removeAllRanges();
    bookmark.onToggle(wordIndex);

    return true;
  }, [bookmark]);

  const shouldAnimateBookmarkEntry = useCallback((wordIndex: number) => {
    if (pendingBookmarkEntryWordRef.current !== wordIndex) {
      return false;
    }

    pendingBookmarkEntryWordRef.current = null;
    return true;
  }, []);

  const handleArticlePointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!bookmark || event.pointerType === 'mouse') {
      return;
    }

    const root = rootRef.current;
    if (!root) {
      return;
    }

    const word = getArticleWordFromEventTarget(root, event.target);
    if (!word) {
      touchTapStateRef.current = {
        count: 0,
        lastTapTime: 0,
        wordIndex: null,
      };
      return;
    }

    const wordIndex = getArticleWordIndex(word);
    if (wordIndex === null) {
      return;
    }

    const now = event.timeStamp;
    const previousTapState = touchTapStateRef.current;
    const isSameSequence = (
      previousTapState.wordIndex === wordIndex &&
      now - previousTapState.lastTapTime <= ARTICLE_TOUCH_TRIPLE_TAP_DELAY
    );
    const nextCount = isSameSequence ? previousTapState.count + 1 : 1;

    touchTapStateRef.current = {
      count: nextCount,
      lastTapTime: now,
      wordIndex,
    };

    if (nextCount >= 3) {
      event.preventDefault();
      event.stopPropagation();
      touchTapStateRef.current = {
        count: 0,
        lastTapTime: 0,
        wordIndex: null,
      };
      suppressClickUntilRef.current = Date.now() + ARTICLE_TOUCH_CLICK_SUPPRESSION;
      toggleBookmarkedWord(word);
    }
  }, [bookmark, toggleBookmarkedWord]);

  const handleArticleClick = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (Date.now() < suppressClickUntilRef.current) {
      return;
    }

    if (event.detail !== 3 || !bookmark) {
      return;
    }

    const root = rootRef.current;
    if (!root) {
      return;
    }

    const word = getArticleWordFromEventTarget(root, event.target);
    if (!word) {
      return;
    }

    if (!toggleBookmarkedWord(word)) {
      return;
    }

    event.preventDefault();
  }, [bookmark, toggleBookmarkedWord]);

  useEffect(() => {
    if (!wordRenderingEnabled || !bookmark) {
      return undefined;
    }

    const root = rootRef.current;
    if (!root) {
      return undefined;
    }

    applyBookmarkStyles(root, bookmarkedWordIndex, scheduleBookmarkCleanup, shouldAnimateBookmarkEntry);

    const observer = new MutationObserver((mutations) => {
      if (mutations.some((mutation) => mutation.addedNodes.length > 0)) {
        applyBookmarkStyles(root, bookmarkedWordIndex, scheduleBookmarkCleanup, shouldAnimateBookmarkEntry);
      }
    });

    observer.observe(root, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [bookmark, bookmarkedWordIndex, scheduleBookmarkCleanup, shouldAnimateBookmarkEntry, wordRenderingEnabled]);

  useLayoutEffect(() => {
    if (!wordRenderingEnabled || !bookmark) {
      const removalFrame = window.requestAnimationFrame(scheduleBookmarkMarkerRemoval);

      return () => window.cancelAnimationFrame(removalFrame);
    }

    if (bookmarkedWordIndex === null) {
      const removalFrame = window.requestAnimationFrame(scheduleBookmarkMarkerRemoval);

      return () => window.cancelAnimationFrame(removalFrame);
    }

    const root = rootRef.current;
    if (!root) {
      return undefined;
    }

    let frame = 0;
    let observer: MutationObserver | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let cancelled = false;

    const updateBookmarkMarker = () => {
      frame = 0;

      if (cancelled) {
        return;
      }

      const word = getArticleWord(root, bookmarkedWordIndex);
      const placement = word ? getBookmarkLineMarkerPlacement(root, word) : null;

      if (!placement) {
        return;
      }

      clearBookmarkMarkerRemoval();
      setBookmarkMarker((currentMarker) => {
        if (
          currentMarker?.state === 'active' &&
          currentMarker.side === placement.side &&
          Math.abs(currentMarker.top - placement.top) < 0.5
        ) {
          return currentMarker;
        }

        return {
          ...placement,
          state: 'active',
        };
      });
    };

    const requestBookmarkMarkerUpdate = () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      frame = window.requestAnimationFrame(updateBookmarkMarker);
    };

    requestBookmarkMarkerUpdate();

    observer = new MutationObserver((mutations) => {
      if (mutations.some((mutation) => mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0)) {
        requestBookmarkMarkerUpdate();
      }
    });
    observer.observe(root, { childList: true, subtree: true });

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(requestBookmarkMarkerUpdate);
      resizeObserver.observe(root);
    }

    window.addEventListener('resize', requestBookmarkMarkerUpdate);
    document.fonts?.ready.then(() => {
      if (!cancelled) {
        requestBookmarkMarkerUpdate();
      }
    });

    return () => {
      cancelled = true;

      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      observer?.disconnect();
      resizeObserver?.disconnect();
      window.removeEventListener('resize', requestBookmarkMarkerUpdate);
    };
  }, [
    bookmark,
    bookmarkedWordIndex,
    clearBookmarkMarkerRemoval,
    renderedVirtualCount,
    scheduleBookmarkMarkerRemoval,
    wordRenderingEnabled,
  ]);

  useLayoutEffect(() => {
    if (!bookmark?.scrollRequest || bookmarkedWordIndex === null) {
      return undefined;
    }

    const root = rootRef.current;
    if (!root) {
      return undefined;
    }

    let focusTimer = 0;
    let observer: MutationObserver | null = null;
    let observerTimer = 0;
    const scrollToBookmark = () => {
      const word = getArticleWord(root, bookmarkedWordIndex);

      if (!word) {
        return false;
      }

      observer?.disconnect();
      observer = null;
      word.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
      word.setAttribute('data-bookmark-focus', 'true');

      focusTimer = window.setTimeout(() => {
        word.removeAttribute('data-bookmark-focus');
      }, 1100);

      return true;
    };
    const frame = window.requestAnimationFrame(() => {
      if (scrollToBookmark()) {
        return;
      }

      observer = new MutationObserver(() => {
        scrollToBookmark();
      });
      observer.observe(root, { childList: true, subtree: true });

      observerTimer = window.setTimeout(() => {
        observer?.disconnect();
        observer = null;
      }, 1600);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();

      if (focusTimer) {
        window.clearTimeout(focusTimer);
      }

      if (observerTimer) {
        window.clearTimeout(observerTimer);
      }
    };
  }, [bookmark?.scrollRequest, bookmarkedWordIndex, renderedVirtualCount]);

  useEffect(() => {
    if (!shouldVirtualize || idleRenderCount >= chunks.length) {
      return undefined;
    }

    let cancelled = false;
    const cancelIdleRender = scheduleArticleIdleRender((deadline) => {
      if (cancelled) {
        return;
      }

      setIdleRenderState((currentState) => {
        const currentCount = currentState.key === articleRenderKey
          ? Math.max(currentState.count, initialRenderCount)
          : initialRenderCount;

        if (currentCount >= chunks.length) {
          return currentState.key === articleRenderKey
            ? currentState
            : { count: currentCount, key: articleRenderKey };
        }

        const increment = deadline.didTimeout || deadline.timeRemaining() > 18 ? 2 : 1;
        const nextCount = Math.min(chunks.length, currentCount + increment);

        return {
          count: nextCount,
          key: articleRenderKey,
        };
      });
    });

    return () => {
      cancelled = true;
      cancelIdleRender();
    };
  }, [articleRenderKey, chunks.length, idleRenderCount, initialRenderCount, shouldVirtualize]);

  useEffect(() => {
    if (!narration?.enabled) return;

    const root = rootRef.current;
    if (!root) return;

    const activeIndex = narration.activeWordIndex;
    applyNarrationIncrementally(root, previousActiveWordRef.current, activeIndex);
    previousActiveWordRef.current = activeIndex;
    activeWordRef.current = activeIndex;
  }, [narration?.activeWordIndex, narration?.enabled]);

  useEffect(() => {
    if (!narration?.enabled) return;

    const root = rootRef.current;
    if (!root) return;

    applyNarrationStyles(root, activeWordRef.current);

    const observer = new MutationObserver((mutations) => {
      if (mutations.some((mutation) => mutation.addedNodes.length > 0)) {
        applyNarrationStyles(root, activeWordRef.current);
      }
    });

    observer.observe(root, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [narration?.enabled]);


  const bookmarkMarkerNode = bookmarkMarker ? (
    <span
      aria-hidden="true"
      className={`article-bookmark-line-marker is-${bookmarkMarker.side} is-${bookmarkMarker.state}`}
      style={{
        '--article-bookmark-marker-top': `${bookmarkMarker.top}px`,
      } as CSSProperties}
    />
  ) : null;

  if (shouldVirtualize) {
    return (
      <div
        className="virtual-article"
        onClick={handleArticleClick}
        onPointerUp={handleArticlePointerUp}
        ref={rootRef}
      >
        {bookmarkMarkerNode}
        {chunks.map((chunk, index) => {
          const estimatedHeight = getResponsiveChunkHeight(chunk, articleWidthClass);

          if (index < initialRenderCount) {
            return (
              <div className="lazy-article-block" key={chunk.id}>
                <MarkdownBlock
                  content={chunk.content}
                  hasMath={chunk.hasMath}
                  narration={narration}
                  wordRenderingEnabled={wordRenderingEnabled}
                  wordOffset={wordOffsets[index]}
                />
              </div>
            );
          }

          return (
            <ViewportRender
              cacheKey={chunk.id}
              className="lazy-article-block"
              initialRender={index < renderedVirtualCount}
              key={chunk.id}
              minHeight={estimatedHeight}
              placeholder={<ArticleBlockSkeleton estimatedHeight={estimatedHeight} />}
              rootMargin={ARTICLE_ROOT_MARGIN}
              unmountWhenOutside={false}
            >
              <MarkdownBlock
                content={chunk.content}
                hasMath={chunk.hasMath}
                narration={narration}
                wordRenderingEnabled={wordRenderingEnabled}
                wordOffset={wordOffsets[index]}
              />
            </ViewportRender>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className="virtual-article"
      onClick={handleArticleClick}
      onPointerUp={handleArticlePointerUp}
      ref={rootRef}
    >
      {bookmarkMarkerNode}
      <MarkdownBlock
        content={content}
        hasMath={chunks[0]?.hasMath ?? false}
        narration={narration}
        wordRenderingEnabled={wordRenderingEnabled}
        wordOffset={0}
      />
    </div>
  );
}

export default memo(ArticleRenderer);
