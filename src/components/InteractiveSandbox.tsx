import { useEffect, useRef, useState } from 'react';

interface InteractiveSandboxProps {
  code: string;
}

export default function InteractiveSandbox({ code }: InteractiveSandboxProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    // Use srcdoc for cleaner, more reliable injection
    // This avoids timing issues with contentDocument.write()
    const html = `<!DOCTYPE html>
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
      }
    </style>
  </head>
  <body>
    ${code}
  </body>
</html>`;

    iframe.srcdoc = html;
  }, [code]);

  return (
    <div className="sandbox-wrapper">
      {!loaded && (
        <div className="sandbox-loading" role="status" aria-live="polite">
          <m3e-loading-indicator variant="contained" aria-label="Loading interactive demo" />
          <span>Preparing sandbox…</span>
        </div>
      )}
      <iframe
        ref={iframeRef}
        className={`interactive-sandbox ${loaded ? 'sandbox-ready' : ''}`}
        sandbox="allow-scripts"
        title="Interactive code sandbox"
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}
