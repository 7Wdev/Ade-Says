import {
  memo,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';

type ViewportRenderProps = {
  children: ReactNode;
  className?: string;
  initialRender?: boolean;
  minHeight?: number;
  placeholder?: ReactNode;
  rootMargin?: string;
  unmountWhenOutside?: boolean;
};

function ViewportRender({
  children,
  className,
  initialRender = false,
  minHeight = 240,
  placeholder,
  rootMargin = '900px 0px',
  unmountWhenOutside = true,
}: ViewportRenderProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canObserveViewport = typeof IntersectionObserver !== 'undefined';
  const shouldRenderInitially = initialRender || !canObserveViewport;
  const [isIntersecting, setIsIntersecting] = useState(shouldRenderInitially);
  const [hasRendered, setHasRendered] = useState(shouldRenderInitially);
  const [measuredHeight, setMeasuredHeight] = useState<number>();
  const shouldRender = isIntersecting || (hasRendered && !unmountWhenOutside);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;

    if (initialRender || !canObserveViewport) return;

    const observer = new IntersectionObserver(([entry]) => {
      const nextIsIntersecting = entry.isIntersecting;
      setIsIntersecting(nextIsIntersecting);

      if (nextIsIntersecting) {
        setHasRendered(true);
      }
    }, { rootMargin });

    observer.observe(node);

    return () => observer.disconnect();
  }, [canObserveViewport, initialRender, rootMargin]);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || !shouldRender) return;

    const updateMeasuredHeight = () => {
      const height = node.getBoundingClientRect().height;

      if (height > 0) {
        setMeasuredHeight((currentHeight) => (
          Math.abs((currentHeight ?? 0) - height) > 1 ? height : currentHeight
        ));
      }
    };

    updateMeasuredHeight();

    if (typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const resizeObserver = new ResizeObserver(updateMeasuredHeight);
    resizeObserver.observe(node);

    return () => resizeObserver.disconnect();
  }, [shouldRender]);

  const placeholderStyle: CSSProperties | undefined = shouldRender
    ? undefined
    : { minHeight: measuredHeight ?? minHeight };

  return (
    <div ref={rootRef} className={className} style={placeholderStyle}>
      {shouldRender ? children : placeholder}
    </div>
  );
}

export default memo(ViewportRender);
