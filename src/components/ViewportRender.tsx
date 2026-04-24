import {
  memo,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';

type ViewportRenderProps = {
  cacheKey?: string;
  children: ReactNode;
  className?: string;
  initialRender?: boolean;
  minHeight?: number;
  placeholder?: ReactNode;
  rootMargin?: string;
  unmountWhenOutside?: boolean;
};

const measuredHeightCache = new Map<string, number>();
const HEIGHT_CACHE_BUCKET_SIZE = 160;

function getWidthBucket(width: number) {
  if (!Number.isFinite(width) || width <= 0) {
    return 'unknown';
  }

  return String(Math.max(
    HEIGHT_CACHE_BUCKET_SIZE,
    Math.round(width / HEIGHT_CACHE_BUCKET_SIZE) * HEIGHT_CACHE_BUCKET_SIZE,
  ));
}

function getHeightCacheKey(cacheKey: string | undefined, widthBucket: string) {
  return cacheKey ? `${cacheKey}:${widthBucket}` : undefined;
}

function ViewportRender({
  cacheKey,
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
  const [widthBucket, setWidthBucket] = useState('unknown');
  const resolvedCacheKey = getHeightCacheKey(cacheKey, widthBucket);
  const [measuredHeight, setMeasuredHeight] = useState<number>();
  const shouldRender = isIntersecting || (hasRendered && !unmountWhenOutside);

  useLayoutEffect(() => {
    const node = rootRef.current;
    if (!node) return;

    const updateWidthBucket = () => {
      const nextWidthBucket = getWidthBucket(node.getBoundingClientRect().width);
      setWidthBucket((currentWidthBucket) => (
        currentWidthBucket === nextWidthBucket ? currentWidthBucket : nextWidthBucket
      ));
    };

    updateWidthBucket();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateWidthBucket);
      return () => window.removeEventListener('resize', updateWidthBucket);
    }

    const resizeObserver = new ResizeObserver(updateWidthBucket);
    resizeObserver.observe(node);
    window.addEventListener('resize', updateWidthBucket);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateWidthBucket);
    };
  }, []);

  useEffect(() => {
    setMeasuredHeight(resolvedCacheKey ? measuredHeightCache.get(resolvedCacheKey) : undefined);
  }, [resolvedCacheKey]);

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

        if (resolvedCacheKey) {
          measuredHeightCache.set(resolvedCacheKey, height);
        }
      }
    };

    updateMeasuredHeight();

    if (typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const resizeObserver = new ResizeObserver(updateMeasuredHeight);
    resizeObserver.observe(node);

    return () => resizeObserver.disconnect();
  }, [resolvedCacheKey, shouldRender]);

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
