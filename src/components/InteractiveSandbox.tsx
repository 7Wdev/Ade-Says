import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';

import {
  createTooltipSuppressionInlineScript,
  tooltipSuppressionStyleText,
} from '../utils/tooltipSuppression';

interface InteractiveSandboxProps {
  code: string;
}

const interactiveOrangeThemeStyleText = `
  :root {
    --interactive-orange-surface-lowest: #170c07;
    --interactive-orange-surface: #24140b;
    --interactive-orange-surface-high: #3a2011;
    --interactive-orange-primary: #ffad68;
    --interactive-orange-on-primary: #4b2405;
    --interactive-orange-on-surface: #ffe1c7;
    --interactive-orange-on-surface-variant: #dca77d;
    --interactive-orange-outline: #b9794d;
    --interactive-orange-outline-variant: #69452e;
  }

  body {
    background: var(--interactive-orange-surface);
    color: var(--interactive-orange-on-surface);
  }

  .lab canvas {
    background-color: var(--interactive-orange-surface-lowest);
    border-color: var(--interactive-orange-outline-variant);
    box-shadow:
      inset 0 1px 0 rgba(255, 225, 199, 0.08),
      0 18px 48px rgba(42, 18, 4, 0.48);
  }

  .hex-title,
  .sleek-lab h2,
  .timeline .label {
    color: var(--interactive-orange-on-surface);
  }

  .ch-val,
  .sleek-lab .b-label,
  .timeline .desc {
    color: var(--interactive-orange-on-surface-variant);
  }

  .bit,
  .sleek-lab .byte {
    color: var(--interactive-orange-outline-variant);
  }

  .sleek-lab .subtitle {
    color: var(--interactive-orange-primary);
  }

  .sleek-lab button {
    border-color: var(--interactive-orange-outline);
    color: var(--interactive-orange-on-surface);
  }

  .sleek-lab button:hover,
  .sleek-lab button:focus-visible {
    border-color: var(--interactive-orange-primary);
    background: var(--interactive-orange-primary);
    color: var(--interactive-orange-on-primary);
  }

  .sleek-lab .channel-row {
    border-bottom-color: color-mix(
      in srgb,
      var(--interactive-orange-outline-variant) 58%,
      transparent
    );
  }

  .timeline .track {
    background: linear-gradient(
      90deg,
      color-mix(in srgb, var(--interactive-orange-primary) 18%, transparent),
      color-mix(in srgb, var(--interactive-orange-primary) 72%, transparent),
      color-mix(in srgb, var(--interactive-orange-primary) 18%, transparent)
    );
    box-shadow: 0 0 0 1px rgba(255, 173, 104, 0.08);
  }

  .timeline .circle {
    background: var(--interactive-orange-surface);
    border-color: var(--interactive-orange-primary);
    box-shadow: 0 0 0 6px rgba(36, 20, 11, 0.94);
  }

  .timeline .node.is-active .circle {
    background: var(--interactive-orange-primary);
    box-shadow:
      0 0 0 6px rgba(36, 20, 11, 0.94),
      0 0 20px rgba(255, 173, 104, 0.52);
  }

  .timeline .packet {
    background: #ffbd7d;
    box-shadow: 0 0 12px rgba(255, 173, 104, 0.84);
  }

  .timeline .packet::before {
    background: rgba(255, 173, 104, 0.28);
  }
`;

function InteractiveSandbox({ code }: InteractiveSandboxProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const heightSettleTimerRef = useRef<number | null>(null);
  const heightMaxWaitTimerRef = useRef<number | null>(null);
  const pendingHeightRef = useRef<number | null>(null);
  const measuredHeightRef = useRef<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);
  const sandboxChromeNone = useMemo(() => (
    new RegExp(String.raw`<!--\s*sandbox-chrome:\s*none\s*-->`, 'i').test(code)
  ), [code]);
  const sandboxDiagram = useMemo(() => (
    new RegExp(String.raw`<!--\s*sandbox-type:\s*diagram\s*-->`, 'i').test(code)
  ), [code]);
  const sandboxHeight = useMemo(() => {
    const match = /<!--\s*sandbox-height:\s*(\d+)\s*-->/i.exec(code);
    const parsedHeight = match ? Number(match[1]) : 0;

    if (!Number.isFinite(parsedHeight) || parsedHeight <= 0) {
      return null;
    }

    return Math.min(760, Math.max(260, parsedHeight));
  }, [code]);
  const sandboxStyle = useMemo<CSSProperties | undefined>(() => {
    const resolvedHeight = measuredHeight ?? sandboxHeight;

    if (!resolvedHeight) {
      return undefined;
    }

    return {
      height: `${resolvedHeight}px`,
      minHeight: `${resolvedHeight}px`,
    };
  }, [measuredHeight, sandboxHeight]);

  const html = useMemo(() => `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Roboto+Flex:opsz,wght@8..144,100..1000&display=swap" rel="stylesheet">
    <style>
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      html, body {
        width: 100%;
        height: 100%;
        font-family: 'Roboto Flex', system-ui, sans-serif;
        -webkit-font-smoothing: antialiased;
        overflow: hidden;
        scrollbar-width: none;
        -ms-overflow-style: none;
      }
      ::-moz-selection {
        background: #ffe135;
        color: #100f13;
      }
      ::selection {
        background: #ffe135;
        color: #100f13;
      }
      a,
      button,
      img,
      input,
      textarea,
      select,
      label,
      summary,
      canvas,
      svg,
      [role="button"] {
        -webkit-tap-highlight-color: transparent;
      }
      html::-webkit-scrollbar, body::-webkit-scrollbar {
        width: 0;
        height: 0;
        display: none;
      }
      ${tooltipSuppressionStyleText}
    </style>
    <script>${createTooltipSuppressionInlineScript()}</script>
  </head>
  <body>
    ${code}
    ${sandboxDiagram ? '' : `<style data-interactive-orange-theme>${interactiveOrangeThemeStyleText}</style>`}
  </body>
</html>`, [code, sandboxDiagram]);
  const handleLoad = useCallback(() => setLoaded(true), []);

  const clearHeightTimers = useCallback(() => {
    if (heightSettleTimerRef.current !== null) {
      window.clearTimeout(heightSettleTimerRef.current);
      heightSettleTimerRef.current = null;
    }

    if (heightMaxWaitTimerRef.current !== null) {
      window.clearTimeout(heightMaxWaitTimerRef.current);
      heightMaxWaitTimerRef.current = null;
    }
  }, []);

  const commitPendingHeight = useCallback(() => {
    const nextHeight = pendingHeightRef.current;

    clearHeightTimers();

    if (nextHeight === null) {
      return;
    }

    pendingHeightRef.current = null;

    if (Math.abs((measuredHeightRef.current ?? 0) - nextHeight) <= 1) {
      return;
    }

    measuredHeightRef.current = nextHeight;
    setMeasuredHeight(nextHeight);
  }, [clearHeightTimers]);

  useEffect(() => {
    setLoaded(false);
    measuredHeightRef.current = null;
    pendingHeightRef.current = null;
    clearHeightTimers();
    setMeasuredHeight(null);
  }, [clearHeightTimers, html]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    iframe.srcdoc = html;
  }, [html]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const iframeWindow = iframeRef.current?.contentWindow;
      if (!iframeWindow || event.source !== iframeWindow) {
        return;
      }

      const data = event.data;
      if (
        !data ||
        typeof data !== 'object' ||
        !('type' in data) ||
        data.type !== 'interactive-sandbox:height'
      ) {
        return;
      }

      const nextHeight = Number('height' in data ? data.height : NaN);
      if (!Number.isFinite(nextHeight)) {
        return;
      }

      pendingHeightRef.current = Math.min(2000, Math.max(160, Math.ceil(nextHeight)));

      if (heightSettleTimerRef.current !== null) {
        window.clearTimeout(heightSettleTimerRef.current);
      }

      heightSettleTimerRef.current = window.setTimeout(commitPendingHeight, 140);

      if (heightMaxWaitTimerRef.current === null) {
        heightMaxWaitTimerRef.current = window.setTimeout(commitPendingHeight, 420);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [commitPendingHeight]);

  useEffect(() => () => {
    clearHeightTimers();
  }, [clearHeightTimers]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    let previousWidth = wrapper.getBoundingClientRect().width;
    const resizeObserver = new ResizeObserver(([entry]) => {
      const nextWidth = entry.contentRect.width;

      if (Math.abs(nextWidth - previousWidth) < 2) {
        return;
      }

      previousWidth = nextWidth;
      pendingHeightRef.current = null;
      clearHeightTimers();
    });

    resizeObserver.observe(wrapper);

    return () => resizeObserver.disconnect();
  }, [clearHeightTimers]);

  return (
    <div
      ref={wrapperRef}
      className={`sandbox-wrapper${sandboxChromeNone ? ' sandbox-wrapper-no-chrome' : ''}${sandboxDiagram ? ' sandbox-wrapper-diagram' : ''}`}
      style={sandboxStyle}
    >
      {!loaded && (
        <div
          className={`sandbox-loading${sandboxChromeNone ? ' sandbox-loading-no-chrome' : ''}`}
          style={sandboxStyle}
          role="status"
          aria-live="polite"
        >
          <m3e-loading-indicator variant="contained" aria-label="Loading interactive demo" />
          <span>Preparing sandbox…</span>
        </div>
      )}
      <iframe
        ref={iframeRef}
        className={`interactive-sandbox ${loaded ? 'sandbox-ready' : ''}${sandboxChromeNone ? ' sandbox-no-chrome' : ''}`}
        loading="lazy"
        sandbox="allow-scripts"
        scrolling="no"
        style={sandboxStyle}
        aria-label={sandboxDiagram ? 'Article diagram' : 'Interactive code sandbox'}
        onLoad={handleLoad}
      />
    </div>
  );
}

export default memo(InteractiveSandbox);
