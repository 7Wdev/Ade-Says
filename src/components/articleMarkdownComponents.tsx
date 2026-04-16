/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense } from 'react';
import type { Components } from 'react-markdown';

const TikZRenderer = lazy(() => import('./TikZRenderer'));
const InteractiveSandbox = lazy(() => import('./InteractiveSandbox'));

const dynamicBlockFallback = (
  <div className="tikz-wrapper">
    <div className="tikz-loading" role="status" aria-live="polite">
      <m3e-loading-indicator variant="contained" aria-label="Loading article block" />
      <span>Loading block</span>
    </div>
  </div>
);

export const markdownComponents: Components = {
  code({ className, children, node, ...props }) {
    const match = /language-(\w[\w-]*)/.exec(className || '');
    const language = match ? match[1] : '';
    const codeString = String(children).replace(/\n$/, '');
    const isBlock = Boolean((node?.position && codeString.includes('\n')) || language);

    if (language === 'tikz') {
      return (
        <Suspense fallback={dynamicBlockFallback}>
          <TikZRenderer content={codeString} />
        </Suspense>
      );
    }

    if (language === 'html-live') {
      return (
        <Suspense fallback={dynamicBlockFallback}>
          <InteractiveSandbox code={codeString} />
        </Suspense>
      );
    }

    if (isBlock && language) {
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    }

    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },
  pre({ children, node, ...props }) {
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
