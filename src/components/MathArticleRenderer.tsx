import { memo, useLayoutEffect, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import remarkMath from 'remark-math';
import 'katex/dist/katex.min.css';

import { createMarkdownComponents, type NarrationRenderState } from './articleMarkdownComponents';

interface MathArticleRendererProps {
  content: string;
  narration?: {
    activeWordIndex: number | null;
    enabled: boolean;
  };
  wordRenderingEnabled?: boolean;
  wordOffset?: number;
}

const remarkPlugins = [remarkMath];
const rehypePlugins = [rehypeKatex, rehypeRaw];

function MathArticleRenderer({
  content,
  narration,
  wordOffset = 0,
  wordRenderingEnabled = Boolean(narration?.enabled),
}: MathArticleRendererProps) {
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
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default memo(MathArticleRenderer, (prevProps, nextProps) => {
  return (
    prevProps.content === nextProps.content &&
    prevProps.wordOffset === nextProps.wordOffset &&
    prevProps.narration?.enabled === nextProps.narration?.enabled &&
    prevProps.wordRenderingEnabled === nextProps.wordRenderingEnabled
  );
});
