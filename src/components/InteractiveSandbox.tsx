import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';

interface InteractiveSandboxProps {
  code: string;
}

function InteractiveSandbox({ code }: InteractiveSandboxProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);
  const sandboxChromeNone = useMemo(() => (
    new RegExp(String.raw`<!--\s*sandbox-chrome:\s*none\s*-->`, 'i').test(code)
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
      html::-webkit-scrollbar, body::-webkit-scrollbar {
        width: 0;
        height: 0;
        display: none;
      }
    </style>
  </head>
  <body>
    ${code}
  </body>
</html>`, [code]);
  const handleLoad = useCallback(() => setLoaded(true), []);

  useEffect(() => {
    setLoaded(false);
    setMeasuredHeight(null);
  }, [html]);

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

      setMeasuredHeight(Math.min(2000, Math.max(160, Math.ceil(nextHeight))));
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div
      className={`sandbox-wrapper${sandboxChromeNone ? ' sandbox-wrapper-no-chrome' : ''}`}
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
        sandbox="allow-scripts"
        scrolling="no"
        style={sandboxStyle}
        title="Interactive code sandbox"
        onLoad={handleLoad}
      />
    </div>
  );
}

export default memo(InteractiveSandbox);
