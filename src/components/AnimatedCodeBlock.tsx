import { useEffect, useRef, useState } from 'react';
import { highlightCode } from './articleMarkdownComponents';

export type AnimatedCodeBlockProps = {
  code: string;
  language: string;
  className?: string;
  duration?: number;
};

export default function AnimatedCodeBlock({
  code,
  language,
  className,
  duration = 0, // default calculated based on length if 0
}: AnimatedCodeBlockProps) {
  const [displayedCode, setDisplayedCode] = useState('');
  const [isDone, setIsDone] = useState(false);
  const containerRef = useRef<HTMLElement>(null);
  const animationRef = useRef<number>(null);

  useEffect(() => {
    const startAnimation = () => {
      setDisplayedCode('');
      setIsDone(false);
      let startTimestamp: number | null = null;
      const animationDuration = duration || Math.min(code.length * 20, 5000); // 20ms per char, max 5.0s

      const step = (timestamp: number) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = timestamp - startTimestamp;
        const percentage = Math.min(progress / animationDuration, 1);
        
        const charCount = Math.floor(percentage * code.length);
        setDisplayedCode(code.slice(0, charCount));

        if (percentage < 1) {
          animationRef.current = requestAnimationFrame(step);
        } else {
          setIsDone(true);
        }
      };

      animationRef.current = requestAnimationFrame(step);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          startAnimation();
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [code, duration]);

  return (
    <>
      <style>{`
        @keyframes animated-code-cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .animated-code-cursor {
          display: inline-block;
          width: 1ch;
          animation: animated-code-cursor-blink 1s step-end infinite;
          vertical-align: baseline;
          transform: translateY(-1px);
        }
        .animated-code-container {
          position: relative;
          display: block;
        }
        .animated-code-sizer {
          visibility: hidden;
          pointer-events: none;
          user-select: none;
        }
        .animated-code-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
        }
      `}</style>
      <code ref={containerRef} className={className + ' animated-code-container'}>
        <span className="animated-code-sizer" aria-hidden="true">
          {highlightCode(language, code)}
        </span>
        <span className="animated-code-overlay">
          {highlightCode(language, displayedCode)}
          {!isDone && <span className="animated-code-cursor">|</span>}
        </span>
      </code>
    </>
  );
}
