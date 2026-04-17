import { memo, useLayoutEffect, useRef } from 'react';
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
  wordOffset?: number;
}

const remarkPlugins = [remarkMath];
const rehypePlugins = [rehypeKatex, rehypeRaw];

function MathArticleRenderer({ content, narration, wordOffset = 0 }: MathArticleRendererProps) {
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
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={createMarkdownComponents(narrationState)}
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
    prevProps.narration?.enabled === nextProps.narration?.enabled
  );
});
