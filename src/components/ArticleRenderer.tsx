import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import type { Components } from 'react-markdown';

import TikZRenderer from './TikZRenderer';
import InteractiveSandbox from './InteractiveSandbox';

interface ArticleRendererProps {
  content: string;
}

const markdownComponents: Components = {
  code({ className, children, node, ...props }) {
    const match = /language-(\w[\w-]*)/.exec(className || '');
    const language = match ? match[1] : '';
    const codeString = String(children).replace(/\n$/, '');

    // Determine if this is a block-level code element (inside a <pre>)
    // react-markdown wraps fenced code blocks in <pre><code>
    const isBlock = node?.position && codeString.includes('\n') || language;

    if (language === 'tikz') {
      return <TikZRenderer content={codeString} />;
    }

    if (language === 'html-live') {
      return <InteractiveSandbox code={codeString} />;
    }

    // Block code (fenced)
    if (isBlock && language) {
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    }

    // Inline code
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },
  pre({ children, node, ...props }) {
    // react-markdown wraps fenced code blocks in <pre><code>...</code></pre>
    // We intercept the <pre> to check if its inner <code> is meant to be a custom component.
    // If it is, we bypass the <pre> tag entirely so we don't render a black code box around our dynamic elements.
    if (
      node &&
      node.children &&
      node.children.length === 1 &&
      node.children[0].type === 'element' &&
      node.children[0].tagName === 'code'
    ) {
      const codeNode = node.children[0];
      if (codeNode.properties && codeNode.properties.className) {
        const classStr = String(codeNode.properties.className);
        if (classStr.includes('language-html-live') || classStr.includes('language-tikz')) {
          return <>{children}</>;
        }
      }
    }
    return <pre {...props}>{children}</pre>;
  },
};

const remarkPlugins = [remarkMath];
const rehypePlugins = [rehypeKatex, rehypeRaw];

function ArticleRenderer({ content }: ArticleRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={remarkPlugins}
      rehypePlugins={rehypePlugins}
      components={markdownComponents}
    >
      {content}
    </ReactMarkdown>
  );
}

export default memo(ArticleRenderer);
