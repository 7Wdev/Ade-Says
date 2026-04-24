import { lazy, memo, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

import { createMarkdownComponents, type NarrationRenderState } from './articleMarkdownComponents';
import ViewportRender from './ViewportRender';
import { countNarrationWords } from '../utils/narration';

interface ArticleRendererProps {
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
  wordOffset: number;
};

type ArticleWidthClass = 'compact' | 'regular' | 'wide';

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

function estimateParagraphHeight(content: string) {
  const text = content
    .replace(/<[^>]+>/g, '')
    .replace(/!\[[^\]]*]\([^)]+\)/g, '')
    .trim();
  const lines = Math.max(1, Math.ceil(text.length / 76));

  return 24 + lines * 32;
}

function estimateCodeFenceHeight(content: string) {
  const lines = content.split(/\r?\n/);
  const language = getFenceLanguage(lines[0] ?? '');
  const sandboxHeight = /<!--\s*sandbox-height:\s*(\d+)\s*-->/i.exec(content)?.[1];

  if (language === 'html-live') {
    const parsedHeight = sandboxHeight ? Number(sandboxHeight) : 320;

    return Math.min(2100, Math.max(260, parsedHeight)) + 72;
  }

  if (language === 'tikz') {
    return 320;
  }

  return 92 + Math.max(1, lines.length - 2) * 25;
}

function estimateRawHtmlHeight(content: string) {
  const imageCount = (content.match(/<img\b/gi) ?? []).length;

  if (/class=["'][^"']*\bstego-photo-pair\b/i.test(content)) {
    return 430;
  }

  if (imageCount > 0) {
    return imageCount * 430;
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
    return 92;
  }

  if (/^#{3,6}\s+/.test(trimmed)) {
    return 72;
  }

  if (/^\$\$/.test(trimmed) || /\\begin\{/.test(trimmed)) {
    return 80 + lineCount * 30;
  }

  if (/^!\[[^\]]*]\([^)]+\)\s*$/.test(trimmed)) {
    return 500;
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

const ArticleBlockSkeleton = memo(function ArticleBlockSkeleton({ estimatedHeight }: { estimatedHeight: number }) {
  return (
    <div
      className="article-block-skeleton"
      style={{ minHeight: Math.max(180, estimatedHeight) }}
      aria-hidden="true"
    >
      <span className="article-skeleton-line article-skeleton-title" />
      <span className="article-skeleton-line" />
      <span className="article-skeleton-line" />
      <span className="article-skeleton-line article-skeleton-short" />
    </div>
  );
});

const PlainMarkdownBlock = memo(function PlainMarkdownBlock({ content, narration, wordOffset }: Pick<MarkdownBlockProps, 'content' | 'narration' | 'wordOffset'>) {
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!narration?.enabled || !rootRef.current) return;

    const words = rootRef.current.querySelectorAll('.narration-word');
    words.forEach((word, index) => {
      word.setAttribute('data-narration-word-index', String(wordOffset + index));
    });
  }, [narration?.enabled, content, wordOffset]);

  const markdownComponents = useMemo(() => {
    const narrationState: NarrationRenderState | undefined = narration?.enabled
      ? { enabled: true }
      : undefined;

    return createMarkdownComponents(narrationState);
  }, [narration?.enabled]);

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

const MarkdownBlock = memo(function MarkdownBlock({ content, hasMath, narration, wordOffset }: MarkdownBlockProps) {
  if (hasMath) {
    return (
      <Suspense fallback={<div className="article-inline-loading" role="status">Loading article</div>}>
        <MathArticleRenderer content={content} narration={narration} wordOffset={wordOffset} />
      </Suspense>
    );
  }

  return <PlainMarkdownBlock content={content} narration={narration} wordOffset={wordOffset} />;
}, (prevProps, nextProps) => {
  return (
    prevProps.content === nextProps.content &&
    prevProps.hasMath === nextProps.hasMath &&
    prevProps.wordOffset === nextProps.wordOffset &&
    prevProps.narration?.enabled === nextProps.narration?.enabled
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

function ArticleRenderer({ content, narration }: ArticleRendererProps) {
  const chunks = useMemo(() => createArticleChunks(content), [content]);
  const rootRef = useRef<HTMLDivElement>(null);
  const [articleWidthClass, setArticleWidthClass] = useState<ArticleWidthClass>(getInitialArticleWidthClass);
  const initialRenderCount = useMemo(() => getInitialRenderCount(chunks, articleWidthClass), [articleWidthClass, chunks]);
  const wordOffsets = useMemo(() => {
    const wordCounts = chunks.map((chunk) => countNarrationWords(chunk.content));

    return wordCounts.map((_, index) => (
      wordCounts.slice(0, index).reduce((total, wordCount) => total + wordCount, 0)
    ));
  }, [chunks]);
  const shouldVirtualize = chunks.length > 1;
  const previousActiveWordRef = useRef<number | null>(null);
  const activeWordRef = useRef<number | null>(null);

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
  }, [content]);

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


  if (shouldVirtualize) {
    return (
      <div className="virtual-article" ref={rootRef}>
        {chunks.map((chunk, index) => {
          const estimatedHeight = getResponsiveChunkHeight(chunk, articleWidthClass);

          if (index < initialRenderCount) {
            return (
              <div className="lazy-article-block" key={chunk.id}>
                <MarkdownBlock
                  content={chunk.content}
                  hasMath={chunk.hasMath}
                  narration={narration}
                  wordOffset={wordOffsets[index]}
                />
              </div>
            );
          }

          return (
            <ViewportRender
              cacheKey={chunk.id}
              className="lazy-article-block"
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
                wordOffset={wordOffsets[index]}
              />
            </ViewportRender>
          );
        })}
      </div>
    );
  }

  return (
    <div ref={rootRef} className="virtual-article">
      <MarkdownBlock content={content} hasMath={chunks[0]?.hasMath ?? false} narration={narration} wordOffset={0} />
    </div>
  );
}

export default memo(ArticleRenderer);
