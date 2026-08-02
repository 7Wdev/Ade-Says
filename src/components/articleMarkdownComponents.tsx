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
const languageAliases: Record<string, string> = {
  c: 'c',
  cc: 'cpp',
  'c++': 'cpp',
  cpp: 'cpp',
  cxx: 'cpp',
  cs: 'csharp',
  'c#': 'csharp',
  csharp: 'csharp',
  dart: 'dart',
  golang: 'go',
  html: 'markup',
  java: 'java',
  js: 'javascript',
  jsx: 'javascript',
  javascript: 'javascript',
  kt: 'kotlin',
  kotlin: 'kotlin',
  py: 'python',
  python: 'python',
  rb: 'ruby',
  ruby: 'ruby',
  rs: 'rust',
  rust: 'rust',
  sh: 'shell',
  shell: 'shell',
  bash: 'shell',
  zsh: 'shell',
  swift: 'swift',
  ts: 'typescript',
  tsx: 'typescript',
  typescript: 'typescript',
  xml: 'markup',
  yaml: 'yaml',
  yml: 'yaml',
};

const codeLanguageLabels: Record<string, string> = {
  c: 'C',
  cpp: 'C++',
  csharp: 'C#',
  css: 'CSS',
  dart: 'Dart',
  go: 'Go',
  java: 'Java',
  javascript: 'JavaScript',
  json: 'JSON',
  kotlin: 'Kotlin',
  markup: 'HTML',
  php: 'PHP',
  python: 'Python',
  ruby: 'Ruby',
  rust: 'Rust',
  scss: 'SCSS',
  shell: 'Shell',
  sql: 'SQL',
  swift: 'Swift',
  typescript: 'TypeScript',
  yaml: 'YAML',
};

const commonKeywords = [
  'break', 'case', 'catch', 'class', 'continue', 'default', 'do', 'else', 'finally',
  'for', 'if', 'import', 'in', 'new', 'return', 'switch', 'throw', 'try', 'while',
];

const languageKeywords: Record<string, Set<string>> = {
  javascript: new Set([
    ...commonKeywords, 'async', 'await', 'const', 'debugger', 'delete', 'export', 'extends',
    'from', 'function', 'get', 'instanceof', 'let', 'of', 'set', 'static', 'super',
    'this', 'typeof', 'var', 'void', 'with', 'yield',
  ]),
  typescript: new Set([
    ...commonKeywords, 'abstract', 'any', 'as', 'asserts', 'async', 'await', 'boolean',
    'const', 'declare', 'enum', 'export', 'extends', 'from', 'function', 'implements',
    'infer', 'interface', 'keyof', 'let', 'namespace', 'never', 'number', 'of', 'override',
    'private', 'protected', 'public', 'readonly', 'satisfies', 'static', 'string', 'symbol',
    'this', 'type', 'typeof', 'undefined', 'unique', 'unknown', 'var', 'void', 'yield',
  ]),
  c: new Set([
    ...commonKeywords, 'auto', 'char', 'const', 'double', 'enum', 'extern', 'float',
    'goto', 'inline', 'int', 'long', 'register', 'restrict', 'short', 'signed', 'sizeof',
    'static', 'struct', 'typedef', 'union', 'unsigned', 'void', 'volatile',
  ]),
  cpp: new Set([
    ...commonKeywords, 'alignas', 'alignof', 'auto', 'bool', 'char', 'concept', 'const',
    'constexpr', 'consteval', 'constinit', 'decltype', 'delete', 'double', 'enum', 'explicit',
    'export', 'extern', 'float', 'friend', 'inline', 'int', 'long', 'mutable', 'namespace',
    'noexcept', 'nullptr', 'operator', 'private', 'protected', 'public', 'requires', 'short',
    'signed', 'sizeof', 'static', 'struct', 'template', 'this', 'thread_local', 'typedef',
    'typename', 'union', 'unsigned', 'using', 'virtual', 'void', 'volatile',
  ]),
  csharp: new Set([
    ...commonKeywords, 'abstract', 'as', 'async', 'await', 'base', 'bool', 'byte', 'const',
    'decimal', 'delegate', 'double', 'dynamic', 'event', 'explicit', 'extern', 'float', 'implicit',
    'int', 'interface', 'internal', 'is', 'lock', 'long', 'namespace', 'object', 'operator',
    'out', 'override', 'params', 'private', 'protected', 'public', 'readonly', 'record', 'ref',
    'sbyte', 'sealed', 'short', 'sizeof', 'stackalloc', 'static', 'string', 'struct', 'this',
    'uint', 'ulong', 'unchecked', 'unsafe', 'ushort', 'using', 'virtual', 'void', 'volatile',
  ]),
  ruby: new Set([
    'alias', 'and', 'begin', 'break', 'case', 'class', 'def', 'defined', 'do', 'else',
    'elsif', 'end', 'ensure', 'for', 'if', 'in', 'module', 'next', 'not', 'or', 'redo',
    'rescue', 'retry', 'return', 'self', 'super', 'then', 'undef', 'unless', 'until',
    'when', 'while', 'yield',
  ]),
  dart: new Set([
    ...commonKeywords, 'abstract', 'as', 'assert', 'async', 'await', 'base', 'const',
    'covariant', 'deferred', 'dynamic', 'export', 'extends', 'extension', 'external', 'factory',
    'final', 'get', 'implements', 'interface', 'late', 'library', 'mixin', 'of', 'on',
    'operator', 'part', 'required', 'sealed', 'set', 'show', 'static', 'super', 'sync',
    'this', 'typedef', 'var', 'void', 'when', 'with', 'yield',
  ]),
  rust: new Set([
    'as', 'async', 'await', 'break', 'const', 'continue', 'crate', 'dyn', 'else', 'enum',
    'extern', 'false', 'fn', 'for', 'if', 'impl', 'in', 'let', 'loop', 'match', 'mod',
    'move', 'mut', 'pub', 'ref', 'return', 'self', 'Self', 'static', 'struct', 'super',
    'trait', 'true', 'type', 'unsafe', 'use', 'where', 'while',
  ]),
  python: new Set([
    'and', 'as', 'assert', 'async', 'await', 'break', 'case', 'class', 'continue', 'def',
    'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if', 'import',
    'in', 'is', 'lambda', 'match', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return',
    'try', 'while', 'with', 'yield',
  ]),
  java: new Set([
    ...commonKeywords, 'abstract', 'assert', 'boolean', 'byte', 'char', 'const', 'double',
    'enum', 'extends', 'final', 'float', 'goto', 'implements', 'instanceof', 'int', 'interface',
    'long', 'native', 'package', 'private', 'protected', 'public', 'short', 'static', 'strictfp',
    'super', 'synchronized', 'this', 'throws', 'transient', 'void', 'volatile',
  ]),
  kotlin: new Set([
    'as', 'break', 'by', 'catch', 'class', 'constructor', 'continue', 'data', 'do', 'else',
    'enum', 'false', 'finally', 'for', 'fun', 'get', 'if', 'import', 'in', 'interface',
    'internal', 'is', 'lateinit', 'object', 'open', 'operator', 'out', 'override', 'package',
    'private', 'protected', 'public', 'return', 'sealed', 'set', 'super', 'this', 'throw',
    'true', 'try', 'typealias', 'val', 'var', 'when', 'while',
  ]),
  go: new Set([
    'break', 'case', 'chan', 'const', 'continue', 'default', 'defer', 'else', 'fallthrough',
    'for', 'func', 'go', 'goto', 'if', 'import', 'interface', 'map', 'package', 'range',
    'return', 'select', 'struct', 'switch', 'type', 'var',
  ]),
  swift: new Set([
    'as', 'associatedtype', 'break', 'case', 'catch', 'class', 'continue', 'convenience',
    'defer', 'deinit', 'do', 'else', 'enum', 'extension', 'fallthrough', 'fileprivate', 'final',
    'for', 'func', 'get', 'guard', 'if', 'import', 'in', 'init', 'inout', 'internal', 'is',
    'lazy', 'let', 'mutating', 'open', 'operator', 'override', 'private', 'protocol', 'public',
    'repeat', 'required', 'return', 'self', 'set', 'static', 'struct', 'subscript', 'super',
    'switch', 'throw', 'throws', 'try', 'typealias', 'var', 'where', 'while',
  ]),
  php: new Set([
    ...commonKeywords, 'abstract', 'and', 'array', 'as', 'callable', 'clone', 'const',
    'declare', 'echo', 'empty', 'endfor', 'endforeach', 'endif', 'endswitch', 'endwhile',
    'extends', 'final', 'fn', 'foreach', 'function', 'global', 'implements', 'include',
    'instanceof', 'interface', 'isset', 'list', 'match', 'namespace', 'or', 'private',
    'protected', 'public', 'readonly', 'require', 'static', 'trait', 'unset', 'use', 'var',
    'xor', 'yield',
  ]),
  shell: new Set([
    'case', 'do', 'done', 'elif', 'else', 'esac', 'export', 'fi', 'for', 'function', 'if',
    'in', 'local', 'readonly', 'return', 'select', 'then', 'time', 'until', 'while',
  ]),
  sql: new Set([
    'ADD', 'ALTER', 'AND', 'AS', 'ASC', 'BEGIN', 'BETWEEN', 'BY', 'CASE', 'CREATE',
    'DATABASE', 'DELETE', 'DESC', 'DISTINCT', 'DROP', 'ELSE', 'END', 'EXISTS', 'FROM',
    'FULL', 'GROUP', 'HAVING', 'IN', 'INDEX', 'INNER', 'INSERT', 'INTO', 'IS', 'JOIN',
    'LEFT', 'LIKE', 'LIMIT', 'NOT', 'NULL', 'ON', 'OR', 'ORDER', 'OUTER', 'PRIMARY',
    'PROCEDURE', 'RIGHT', 'SELECT', 'SET', 'TABLE', 'THEN', 'TRUNCATE', 'UNION',
    'UNIQUE', 'UPDATE', 'VALUES', 'VIEW', 'WHEN', 'WHERE', 'WITH',
  ]),
};

const constantTokens = new Set([
  'true', 'false', 'null', 'undefined', 'NaN', 'Infinity', 'True', 'False', 'None',
  'nil', 'NULL', 'nullptr',
]);

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
  const match = /(?:^|\s)language-([^\s]+)/.exec(value);

  return match ? match[1] : '';
}

export function normalizeCodeLanguage(language: string) {
  const normalized = language.trim().toLowerCase();

  return languageAliases[normalized] ?? normalized;
}

export function getLanguageLabel(language: string) {
  const normalized = normalizeCodeLanguage(language);

  return codeLanguageLabels[normalized] ?? language.toUpperCase();
}

function getTokenPattern(language: string) {
  const commentPattern = language === 'sql'
    ? String.raw`--[^\n\r]*|\/\*[\s\S]*?\*\/`
    : ['python', 'ruby', 'shell', 'yaml'].includes(language)
      ? String.raw`\#[^\n\r]*`
      : String.raw`\/\/[^\n\r]*|\/\*[\s\S]*?\*\/`;

  return new RegExp(
    `${commentPattern}|\`(?:\\[\\s\\S]|[^\\\`])*\`|'(?:\\\\.|[^\\\\'])*'|"(?:\\\\.|[^\\\\"])*"|\\b[A-Za-z_$][\\w$]*\\b|\\b(?:0[xX][0-9a-fA-F]+|0[bB][01]+|0[oO][0-7]+|\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?)\\b|[&|^~!?=<>+\\-*/%]+|[{}()[\\].,;:]`,
    'g',
  );
}

function getTokenClass(token: string, language: string) {
  if (
    token.startsWith('//') ||
    token.startsWith('/*') ||
    token.startsWith('#') ||
    (language === 'sql' && token.startsWith('--'))
  ) {
    return 'comment';
  }

  if (token.startsWith('"') || token.startsWith("'") || token.startsWith('`')) {
    return 'string';
  }

  if (constantTokens.has(token)) {
    return 'constant';
  }

  if (/^(?:0[xX][0-9a-fA-F]+|0[bB][01]+|0[oO][0-7]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)$/.test(token)) {
    return 'number';
  }

  const keywordSet = languageKeywords[language];
  if (keywordSet?.has(language === 'sql' ? token.toUpperCase() : token)) {
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

function highlightLanguage(code: string, language: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let tokenIndex = 0;

  for (const match of code.matchAll(getTokenPattern(language))) {
    const token = match[0];
    const index = match.index ?? 0;

    if (index > lastIndex) {
      nodes.push(code.slice(lastIndex, index));
    }

    let tokenClass = getTokenClass(token, language);
    
    // Improve identifier highlighting
    if (tokenClass === '' && /^[A-Za-z_$][\w$]*$/.test(token)) {
      const nextChars = code.slice(index + token.length).trimStart();
      if (nextChars.startsWith('(')) {
        tokenClass = 'function';
      } else {
        const prevChars = code.slice(0, index).trimEnd();
        if (prevChars.endsWith('.') || prevChars.endsWith('::') || prevChars.endsWith('->')) {
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
  return highlightLanguage(code, normalizeCodeLanguage(language));
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
          const normalizedLanguage = normalizeCodeLanguage(language);
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
              data-code-language={normalizedLanguage}
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
