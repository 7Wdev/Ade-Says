/* eslint-disable react-refresh/only-export-components */
import {
  Children,
  cloneElement,
  createElement,
  isValidElement,
  lazy,
  Suspense,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react';
import type { Components } from 'react-markdown';

import { isNarrationWordToken, splitNarrationTextTokens } from '../utils/narration';

const TikZRenderer = lazy(() => import('./TikZRenderer'));
const InteractiveSandbox = lazy(() => import('./InteractiveSandbox'));

export type NarrationRenderState = {
  enabled: boolean;
  wordCursor: {
    current: number;
  };
};

const dynamicBlockFallback = (
  <div className="tikz-wrapper">
    <div className="tikz-loading" role="status" aria-live="polite">
      <m3e-loading-indicator variant="contained" aria-label="Loading article block" />
      <span>Loading block</span>
    </div>
  </div>
);

type NarratedElementProps = HTMLAttributes<HTMLElement> & {
  children?: ReactNode;
  node?: unknown;
};

type NarratedTagName = 'p' | 'li' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'blockquote';

function wrapNarrationText(text: string, narration: NarrationRenderState) {
  return splitNarrationTextTokens(text).map((token, tokenIndex) => {
    if (!isNarrationWordToken(token)) {
      return token;
    }

    const wordIndex = narration.wordCursor.current;
    narration.wordCursor.current += 1;

    return (
      <span
        className="narration-word"
        data-narration-word-index={wordIndex}
        key={`${wordIndex}-${tokenIndex}`}
      >
        {token}
      </span>
    );
  });
}

function shouldSkipNarrationWrap(element: ReactElement) {
  return (
    element.type === 'code' ||
    element.type === 'pre' ||
    element.type === markdownComponents.code ||
    element.type === markdownComponents.pre
  );
}

function wrapNarrationNode(node: ReactNode, narration: NarrationRenderState): ReactNode {
  return Children.map(node, (child) => {
    if (typeof child === 'string') {
      return wrapNarrationText(child, narration);
    }

    if (!isValidElement(child) || shouldSkipNarrationWrap(child)) {
      return child;
    }

    const childProps = child.props as { children?: ReactNode };

    if (!childProps.children) {
      return child;
    }

    return cloneElement(child as ReactElement<{ children?: ReactNode }>, {
      children: wrapNarrationNode(childProps.children, narration),
    });
  });
}

function createNarratedElement(tagName: NarratedTagName, narration: NarrationRenderState) {
  return function NarratedElement(props: NarratedElementProps) {
    const { children, node, ...rest } = props;

    void node;

    return createElement(tagName, rest, wrapNarrationNode(children, narration));
  };
}

export const markdownComponents: Components = {
  code({ className, children, node, ...props }) {
    void node;

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

export function createMarkdownComponents(narration?: NarrationRenderState): Components {
  if (!narration?.enabled) {
    return markdownComponents;
  }

  return {
    ...markdownComponents,
    p: createNarratedElement('p', narration),
    li: createNarratedElement('li', narration),
    h1: createNarratedElement('h1', narration),
    h2: createNarratedElement('h2', narration),
    h3: createNarratedElement('h3', narration),
    h4: createNarratedElement('h4', narration),
    h5: createNarratedElement('h5', narration),
    h6: createNarratedElement('h6', narration),
    blockquote: createNarratedElement('blockquote', narration),
  };
}
