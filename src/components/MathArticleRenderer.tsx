import { memo } from 'react';
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
  const narrationState: NarrationRenderState | undefined = narration?.enabled
    ? {
      activeWordIndex: narration.activeWordIndex,
      enabled: true,
      wordCursor: { current: wordOffset },
    }
    : undefined;

  return (
    <ReactMarkdown
      remarkPlugins={remarkPlugins}
      rehypePlugins={rehypePlugins}
      components={createMarkdownComponents(narrationState)}
    >
      {content}
    </ReactMarkdown>
  );
}

export default memo(MathArticleRenderer);
