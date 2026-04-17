import { lazy, memo, Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
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
const ARTICLE_CHUNK_TARGET_CHARS = 2600;
const ARTICLE_INITIAL_CHUNKS = 2;

type MarkdownBlockProps = {
  content: string;
  hasMath: boolean;
  narration?: ArticleRendererProps['narration'];
  wordOffset: number;
};

function splitMarkdownForViewport(content: string) {
  if (content.length < ARTICLE_VIRTUALIZATION_MIN_CHARS) {
    return [content];
  }

  const chunks: string[] = [];
  const currentLines: string[] = [];
  const lines = content.split(/\r?\n/);
  let currentLength = 0;
  let inFence = false;

  const pushChunk = () => {
    const chunk = currentLines.join('\n').trim();
    if (chunk) {
      chunks.push(chunk);
    }

    currentLines.length = 0;
    currentLength = 0;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const startsFence = /^(```|~~~)/.test(trimmed);
    const isHeading = !inFence && /^#{1,3}\s+/.test(line);
    const shouldSplitBefore = isHeading && currentLength >= ARTICLE_CHUNK_TARGET_CHARS / 2;

    if (shouldSplitBefore) {
      pushChunk();
    }

    currentLines.push(line);
    currentLength += line.length + 1;

    if (startsFence) {
      inFence = !inFence;
    }

    if (!inFence && trimmed === '' && currentLength >= ARTICLE_CHUNK_TARGET_CHARS) {
      pushChunk();
    }
  }

  pushChunk();

  return chunks.length > 1 ? chunks : [content];
}

const ArticleBlockSkeleton = memo(function ArticleBlockSkeleton() {
  return (
    <div className="article-block-skeleton" aria-hidden="true">
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

  const narrationState: NarrationRenderState | undefined = narration?.enabled
    ? { enabled: true }
    : undefined;

  return (
    <div style={{ display: 'contents' }} ref={rootRef}>
      <ReactMarkdown
        rehypePlugins={rehypePlugins}
        components={createMarkdownComponents(narrationState)}
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

function ArticleRenderer({ content, narration }: ArticleRendererProps) {
  const chunks = useMemo(() => splitMarkdownForViewport(content), [content]);
  const wordOffsets = useMemo(() => {
    const wordCounts = chunks.map((chunk) => countNarrationWords(chunk));

    return wordCounts.map((_, index) => (
      wordCounts.slice(0, index).reduce((total, wordCount) => total + wordCount, 0)
    ));
  }, [chunks]);
  const hasMath = mathDelimiterPattern.test(content);
  const shouldVirtualize = chunks.length > 1;
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!narration?.enabled) return;

    const root = rootRef.current;
    if (!root) return;

    const applyStyles = () => {
      const activeIndex = narration.activeWordIndex;
      const words = root.querySelectorAll('.narration-word');

      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const idx = parseInt(word.getAttribute('data-narration-word-index') || '-1', 10);
        if (idx === -1) continue;

        if (idx === activeIndex) {
          word.className = 'narration-word narration-word-active';
        } else if (activeIndex !== null && idx < activeIndex) {
          word.className = 'narration-word narration-word-played';
        } else {
          word.className = 'narration-word';
        }
      }
    };

    applyStyles();

    const observer = new MutationObserver((mutations) => {
      let shouldApply = false;
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          shouldApply = true;
          break;
        }
      }
      if (shouldApply) {
        applyStyles();
      }
    });

    observer.observe(root, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [narration?.activeWordIndex, narration?.enabled]);


  if (shouldVirtualize) {
    return (
      <div className="virtual-article" ref={rootRef}>
        {chunks.map((chunk, index) => {
          const blockHasMath = hasMath && mathDelimiterPattern.test(chunk);

          if (index < ARTICLE_INITIAL_CHUNKS) {
            return (
              <div className="lazy-article-block" key={`${index}-${chunk.length}`}>
                <MarkdownBlock
                  content={chunk}
                  hasMath={blockHasMath}
                  narration={narration}
                  wordOffset={wordOffsets[index]}
                />
              </div>
            );
          }

          return (
            <ViewportRender
              className="lazy-article-block"
              key={`${index}-${chunk.length}`}
              minHeight={300}
              placeholder={<ArticleBlockSkeleton />}
              rootMargin="1200px 0px"
            >
              <MarkdownBlock
                content={chunk}
                hasMath={blockHasMath}
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
      <MarkdownBlock content={content} hasMath={hasMath} narration={narration} wordOffset={0} />
    </div>
  );
}

export default memo(ArticleRenderer);
