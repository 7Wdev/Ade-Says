/* eslint-disable react-refresh/only-export-components */
import {
  Children,
  cloneElement,
  createElement,
  isValidElement,
  lazy,
  Suspense,
  type CSSProperties,
  type HTMLAttributes,
  type ImgHTMLAttributes,
  type ReactElement,
  type ReactNode,
  useState,
} from 'react';
import type { Components } from 'react-markdown';
import '@m3e/web/card';
import '@m3e/web/chips';
import '@m3e/web/divider';
import '@m3e/web/toolbar';
import { M3eSnackbar } from '@m3e/web/snackbar';

import { isNarrationWordToken, splitNarrationTextTokens } from '../utils/narration';

const TikZRenderer = lazy(() => import('./TikZRenderer'));
const InteractiveSandbox = lazy(() => import('./InteractiveSandbox'));
const AnimatedCodeBlock = lazy(() => import('./AnimatedCodeBlock'));
const hexColorPattern = /^#(?:[\da-f]{3}|[\da-f]{6})$/i;
const javascriptKeywords = new Set([
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'default',
  'do',
  'else',
  'export',
  'extends',
  'finally',
  'for',
  'from',
  'function',
  'if',
  'import',
  'in',
  'let',
  'new',
  'of',
  'return',
  'switch',
  'throw',
  'try',
  'typeof',
  'var',
  'void',
  'while',
]);

const codeLanguageLabels: Record<string, string> = {
  js: 'JavaScript',
  javascript: 'JavaScript',
  ts: 'TypeScript',
  typescript: 'TypeScript',
};

const jsTokenPattern = /(\/\/.*|\/\*[\s\S]*?\*\/|`(?:\\[\s\S]|[^\\`])*`|'(?:\\.|[^\\'])*'|"(?:\\.|[^\\"])*"|\b(?:true|false|null|undefined|NaN|Infinity)\b|\b[A-Za-z_$][\w$]*\b|\b(?:0[xX][0-9a-fA-F]+|0[bB][01]+|0[oO][0-7]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b|[&|^~!?=<>+\-*/%]+|[{}()[\].,;:])/g;

export type NarrationRenderState = {
  enabled: boolean;
};

type NarratedElementProps = HTMLAttributes<HTMLElement> & {
  children?: ReactNode;
  node?: unknown;
};

type MarkdownImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  node?: unknown;
};

type NarratedTagName = 'p' | 'li' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'blockquote';

function getDeclaredSandboxHeight(code: string) {
  const match = /<!--\s*sandbox-height:\s*(\d+)\s*-->/i.exec(code);
  const parsedHeight = match ? Number(match[1]) : 0;

  if (!Number.isFinite(parsedHeight) || parsedHeight <= 0) {
    return 320;
  }

  return Math.min(760, Math.max(260, parsedHeight));
}

function TikzFallback() {
  return (
    <div className="tikz-wrapper">
      <div className="tikz-loading" role="status" aria-live="polite">
        <m3e-loading-indicator variant="contained" aria-label="Loading article block" />
        <span>Loading block</span>
      </div>
    </div>
  );
}

function SandboxFallback({ code }: { code: string }) {
  const resolvedHeight = getDeclaredSandboxHeight(code);
  const sandboxStyle: CSSProperties = {
    height: `${resolvedHeight}px`,
    minHeight: `${resolvedHeight}px`,
  };
  const sandboxChromeNone = new RegExp(String.raw`<!--\s*sandbox-chrome:\s*none\s*-->`, 'i').test(code);

  return (
    <div
      className={`sandbox-wrapper${sandboxChromeNone ? ' sandbox-wrapper-no-chrome' : ''}`}
      style={sandboxStyle}
    >
      <div
        className={`sandbox-loading${sandboxChromeNone ? ' sandbox-loading-no-chrome' : ''}`}
        style={sandboxStyle}
        role="status"
        aria-live="polite"
      >
        <m3e-loading-indicator variant="contained" aria-label="Loading interactive demo" />
        <span>Preparing sandbox...</span>
      </div>
    </div>
  );
}

function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      M3eSnackbar.open('Code copied', { duration: 2000 });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      M3eSnackbar.open('Could not copy the code', true, { duration: 3600 });
    }
  };

  return (
    <m3e-icon-button
      className={`article-code-copy-btn ${copied ? 'is-copied' : ''}`}
      onClick={handleCopy}
      aria-label={copied ? 'Code copied' : 'Copy code'}
      size="extra-small"
      variant="tonal"
    >
      <m3e-icon
        aria-hidden="true"
        filled
        name={copied ? 'check' : 'content_copy'}
        variant="rounded"
      />
    </m3e-icon-button>
  );
}

function wrapNarrationText(text: string) {
  return splitNarrationTextTokens(text).map((token, tokenIndex) => {
    if (!isNarrationWordToken(token)) {
      return token;
    }

    return (
      <span
        className="narration-word"
        key={tokenIndex}
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
      return wrapNarrationText(child);
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

function getLanguageFromClassName(className: unknown) {
  const value = Array.isArray(className) ? className.join(' ') : String(className ?? '');
  const match = /language-(\w[\w-]*)/.exec(value);

  return match ? match[1] : '';
}

export function getLanguageLabel(language: string) {
  return codeLanguageLabels[language] ?? language.toUpperCase();
}

function getJavaScriptTokenClass(token: string) {
  if (token.startsWith('//') || token.startsWith('/*')) {
    return 'comment';
  }

  if (token.startsWith('"') || token.startsWith("'") || token.startsWith('`')) {
    return 'string';
  }

  if (/^(?:true|false|null|undefined|NaN|Infinity)$/.test(token)) {
    return 'constant';
  }

  if (/^(?:0[xX][0-9a-fA-F]+|0[bB][01]+|0[oO][0-7]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)$/.test(token)) {
    return 'number';
  }

  if (javascriptKeywords.has(token)) {
    return 'keyword';
  }

  if (/^[&|^~!?=<>+\-*/%]+$/.test(token)) {
    return 'operator';
  }

  if (/^[{}()[\].,;:]$/.test(token)) {
    return 'punctuation';
  }

  return '';
}

function highlightJavaScript(code: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let tokenIndex = 0;

  for (const match of code.matchAll(jsTokenPattern)) {
    const token = match[0];
    const index = match.index ?? 0;

    if (index > lastIndex) {
      nodes.push(code.slice(lastIndex, index));
    }

    let tokenClass = getJavaScriptTokenClass(token);
    
    // Improve identifier highlighting
    if (tokenClass === '' && /^[A-Za-z_$][\w$]*$/.test(token)) {
      const nextChars = code.slice(index + token.length).trimStart();
      if (nextChars.startsWith('(')) {
        tokenClass = 'function';
      } else {
        const prevChars = code.slice(0, index).trimEnd();
        if (prevChars.endsWith('.')) {
          tokenClass = 'property';
        } else {
          tokenClass = 'variable';
        }
      }
    }

    nodes.push(tokenClass
      ? (
        <span className={`syntax-token syntax-${tokenClass}`} key={`token-${tokenIndex}`}>
          {token}
        </span>
      )
      : token);

    lastIndex = index + token.length;
    tokenIndex += 1;
  }

  if (lastIndex < code.length) {
    nodes.push(code.slice(lastIndex));
  }

  return nodes;
}

export function highlightCode(language: string, code: string) {
  if (language === 'js' || language === 'javascript') {
    return highlightJavaScript(code);
  }

  return code;
}

function MarkdownImage({ alt = '', node, ...props }: MarkdownImageProps) {
  void node;

  return (
    <img
      {...props}
      alt={alt}
      decoding={props.decoding ?? 'async'}
      loading={props.loading ?? 'lazy'}
    />
  );
}

export const markdownComponents = {
  img: MarkdownImage,
  hr({ node, ...props }) {
    void node;

    return <m3e-divider {...props} className="article-divider" />;
  },
  code({ className, children, node, ...props }) {
    void node;

    const language = getLanguageFromClassName(className);
    const codeString = String(children).replace(/\n$/, '');
    const isBlock = Boolean((node?.position && codeString.includes('\n')) || language);

    if (language === 'tikz') {
      return (
        <Suspense fallback={<TikzFallback />}>
          <TikZRenderer content={codeString} />
        </Suspense>
      );
    }

    if (language === 'html-live') {
      return (
        <Suspense fallback={<SandboxFallback code={codeString} />}>
          <InteractiveSandbox code={codeString} />
        </Suspense>
      );
    }

    if (isBlock && language) {
      return (
        <Suspense fallback={<code className={className} {...props}>{codeString}</code>}>
          <AnimatedCodeBlock
            code={codeString}
            language={language}
            className={className}
          />
        </Suspense>
      );
    }

    if (!isBlock && hexColorPattern.test(codeString.trim())) {
      const color = codeString.trim().toUpperCase();

      return (
        <span className="article-hex-chip">
          <span className="article-hex-chip-code">{color}</span>
          <span
            aria-hidden="true"
            className="article-hex-chip-swatch"
            style={{ backgroundColor: color }}
          />
        </span>
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
        const language = getLanguageFromClassName(codeNode.properties.className);
        if (language === 'html-live' || language === 'tikz') {
          return <>{children}</>;
        }

        if (language) {
          // Extract the raw code string to pass to the copy button
          // children is the <code> element. children.props.children is the text.
          let rawCode = '';
          if (isValidElement(children)) {
             const childProps = (children as ReactElement<{ children?: unknown }>).props;
             if (typeof childProps.children === 'string') {
               rawCode = childProps.children;
             }
          }

          return (
            <m3e-card
              className="article-code-frame"
              data-language={language}
              orientation="vertical"
              variant="filled"
            >
              <m3e-toolbar
                aria-label={`${getLanguageLabel(language)} code block tools`}
                className="article-code-header"
                shape="rounded"
                variant="vibrant"
              >
                <m3e-chip className="article-code-language-chip" aria-hidden="true" variant="outlined">
                  <m3e-icon filled name="data_object" slot="icon" variant="rounded" />
                  {getLanguageLabel(language)}
                </m3e-chip>
                {rawCode && <CopyCodeButton code={rawCode} />}
              </m3e-toolbar>
              <pre {...props}>{children}</pre>
            </m3e-card>
          );
        }
      }
    }
    return <pre {...props}>{children}</pre>;
  },
} as Components;

export function createMarkdownComponents(wordRendering?: NarrationRenderState): Components {
  if (!wordRendering?.enabled) {
    return markdownComponents;
  }

  return {
    ...markdownComponents,
    p: createNarratedElement('p', wordRendering),
    li: createNarratedElement('li', wordRendering),
    h1: createNarratedElement('h1', wordRendering),
    h2: createNarratedElement('h2', wordRendering),
    h3: createNarratedElement('h3', wordRendering),
    h4: createNarratedElement('h4', wordRendering),
    h5: createNarratedElement('h5', wordRendering),
    h6: createNarratedElement('h6', wordRendering),
    blockquote: createNarratedElement('blockquote', wordRendering),
  };
}
