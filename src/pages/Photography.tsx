import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type SyntheticEvent,
} from "react";
import { createPortal, preload } from "react-dom";
import { Link, useParams } from "react-router-dom";
import { photoCatalogs, type PhotoAsset, type PhotoCatalog } from "../generated/photo-catalogs";

const LIGHTBOX_EXIT_MS = 280;
const VIRTUAL_OVERSCAN_MIN = 1600;
const VIRTUAL_OVERSCAN_VIEWPORT_MULTIPLIER = 1.35;
const VIRTUAL_MOTION_REFRESH_MS = 1000;
const CATALOG_TEXTURE_SRC = "/plastic-wrap-light.jpg";
const CATALOG_CARD_MIN_WIDTH = 340;
const CATALOG_CARD_MAX_WIDTH = 420;
const CATALOG_GRID_GAP = 32;
const CATALOG_GRID_MOBILE_GAP = 18;
const CATALOG_GRID_OVERSCAN_ROWS = 2;

type MasonryItem = {
  readonly photo: PhotoAsset;
  readonly index: number;
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
  readonly columnIndex: number;
};

type MasonryColumn = {
  readonly index: number;
  readonly direction: "up" | "down";
  readonly left: number;
  readonly width: number;
  readonly height: number;
  readonly items: readonly MasonryItem[];
};

type MasonryLayout = {
  readonly height: number;
  readonly items: readonly MasonryItem[];
  readonly columns: readonly MasonryColumn[];
};

type VirtualMasonryItem = {
  readonly item: MasonryItem;
  readonly key: string;
  readonly top: number;
};

type CatalogGridLayout = {
  readonly cardWidth: number;
  readonly columnCount: number;
  readonly gap: number;
  readonly height: number;
  readonly rowStride: number;
};

type VirtualCatalogItem = {
  readonly catalog: PhotoCatalog;
  readonly index: number;
  readonly key: string;
  readonly left: number;
  readonly top: number;
};

type GalleryTileStyle = CSSProperties & Record<`--${string}`, string | number>;
type GalleryColumnStyle = CSSProperties & Record<`--${string}`, string | number>;
type CatalogGridStyle = CSSProperties & Record<`--${string}`, string | number>;
type CatalogSlotStyle = CSSProperties & Record<`--${string}`, string | number>;
type LightboxStageStyle = CSSProperties & Record<`--${string}`, string | number>;



function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getColumnCount(width: number) {
  if (width >= 1120) return 4;
  if (width >= 820) return 3;
  return 2;
}

function getCatalogCover(catalog: PhotoCatalog) {
  return catalog.photos.find((photo) => photo.id === catalog.coverPhotoId) ?? catalog.photos[0];
}

function formatPhotoCount(count: number) {
  return `${count} ${count === 1 ? "photo" : "photos"}`;
}

function buildCatalogGridLayout(catalogCount: number, width: number): CatalogGridLayout {
  if (catalogCount === 0 || width <= 0) {
    return {
      cardWidth: 0,
      columnCount: 1,
      gap: CATALOG_GRID_GAP,
      height: 0,
      rowStride: 0,
    };
  }

  const gap = width <= 620 ? CATALOG_GRID_MOBILE_GAP : CATALOG_GRID_GAP;
  const minCardWidth = Math.min(CATALOG_CARD_MIN_WIDTH, width);
  const columnCount = Math.max(1, Math.floor((width + gap) / (minCardWidth + gap)));
  const cardWidth = Math.min(
    CATALOG_CARD_MAX_WIDTH,
    (width - gap * (columnCount - 1)) / columnCount,
  );
  const rowStride = cardWidth + gap;
  const rowCount = Math.ceil(catalogCount / columnCount);

  return {
    cardWidth,
    columnCount,
    gap,
    height: rowCount * cardWidth + Math.max(0, rowCount - 1) * gap,
    rowStride,
  };
}

function getVirtualCatalogItems(
  catalogs: readonly PhotoCatalog[],
  layout: CatalogGridLayout,
  visibleTop: number,
  visibleBottom: number,
) {
  if (layout.cardWidth <= 0 || catalogs.length === 0) {
    return [];
  }

  const lastRow = Math.max(0, Math.ceil(catalogs.length / layout.columnCount) - 1);
  const startRow = clamp(
    Math.floor(visibleTop / layout.rowStride) - CATALOG_GRID_OVERSCAN_ROWS,
    0,
    lastRow,
  );
  const endRow = clamp(
    Math.ceil(visibleBottom / layout.rowStride) + CATALOG_GRID_OVERSCAN_ROWS,
    startRow,
    lastRow,
  );
  const startIndex = startRow * layout.columnCount;
  const endIndex = Math.min(catalogs.length - 1, (endRow + 1) * layout.columnCount - 1);
  const virtualItems: VirtualCatalogItem[] = [];

  for (let index = startIndex; index <= endIndex; index += 1) {
    const catalog = catalogs[index];
    const row = Math.floor(index / layout.columnCount);
    const column = index % layout.columnCount;

    virtualItems.push({
      catalog,
      index,
      key: catalog.slug,
      left: column * layout.rowStride,
      top: row * layout.rowStride,
    });
  }

  return virtualItems;
}

function getColumnDurationMs(height: number) {
  return clamp(height / 38, 72, 160) * 1000;
}

function buildMasonryLayout(photos: readonly PhotoAsset[], width: number): MasonryLayout {
  if (width <= 0) {
    return { height: 0, items: [], columns: [] };
  }

  const columnCount = getColumnCount(width);
  const gap = width >= 820 ? 22 : 16;
  const columnWidth = (width - gap * (columnCount - 1)) / columnCount;
  const columnHeights = Array.from({ length: columnCount }, () => 0);
  const columnItems: MasonryItem[][] = Array.from({ length: columnCount }, () => []);
  const items = photos.map((photo, index) => {
    const columnIndex = columnHeights.indexOf(Math.min(...columnHeights));
    const naturalHeight = columnWidth * (photo.height / photo.width);
    const rhythm = [1, 0.86, 1.12, 0.96, 1.05, 0.9][index % 6];
    const minHeight = 210;
    const maxHeight = columnWidth * 1.78;
    const height = clamp(naturalHeight * rhythm, minHeight, maxHeight);
    const item = {
      photo,
      index,
      top: columnHeights[columnIndex],
      left: columnIndex * (columnWidth + gap),
      width: columnWidth,
      height,
      columnIndex,
    };

    columnHeights[columnIndex] += height + gap;
    columnItems[columnIndex].push(item);
    return item;
  });

  const columns = columnItems.map((columnPhotos, index) => ({
    index,
    direction: index % 2 === 0 ? "up" as const : "down" as const,
    left: index * (columnWidth + gap),
    width: columnWidth,
    height: Math.max(columnHeights[index], 1),
    items: columnPhotos,
  }));

  return {
    height: Math.max(...columnHeights, 0),
    items,
    columns,
  };
}

function useElementMetrics<TElement extends HTMLElement>() {
  const ref = useRef<TElement | null>(null);
  const [metrics, setMetrics] = useState(() => ({
    pageTop: 0,
    width: 0,
  }));

  useLayoutEffect(() => {
    const element = ref.current;

    if (!element) {
      return undefined;
    }

    let animationFrame = 0;

    const measureElement = () => {
      animationFrame = 0;
      const rect = element.getBoundingClientRect();
      const nextMetrics = {
        pageTop: Math.round(rect.top + window.scrollY),
        width: Math.round(rect.width),
      };

      setMetrics((currentMetrics) => (
        currentMetrics.pageTop === nextMetrics.pageTop &&
        currentMetrics.width === nextMetrics.width
          ? currentMetrics
          : nextMetrics
      ));
    };

    const requestMeasure = () => {
      if (animationFrame) {
        return;
      }

      animationFrame = window.requestAnimationFrame(measureElement);
    };

    measureElement();

    const observer = new ResizeObserver((entries) => {
      const entryWidth = Math.round(entries[0]?.contentRect.width ?? 0);
      setMetrics((currentMetrics) => (
        currentMetrics.width === entryWidth ? currentMetrics : { ...currentMetrics, width: entryWidth }
      ));
      requestMeasure();
    });

    observer.observe(element);
    window.addEventListener("resize", requestMeasure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", requestMeasure);

      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, []);

  return [ref, metrics] as const;
}

function useWindowMetrics() {
  const [metrics, setMetrics] = useState(() => ({
    scrollY: typeof window === "undefined" ? 0 : window.scrollY,
    viewportHeight: typeof window === "undefined" ? 0 : window.innerHeight,
  }));

  useEffect(() => {
    let animationFrame = 0;

    const updateMetrics = () => {
      animationFrame = 0;
      const nextMetrics = {
        scrollY: window.scrollY,
        viewportHeight: window.innerHeight,
      };

      setMetrics((currentMetrics) => (
        currentMetrics.scrollY === nextMetrics.scrollY &&
        currentMetrics.viewportHeight === nextMetrics.viewportHeight
          ? currentMetrics
          : nextMetrics
      ));
    };

    const requestMetrics = () => {
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(updateMetrics);
    };

    updateMetrics();
    window.addEventListener("scroll", requestMetrics, { passive: true });
    window.addEventListener("resize", requestMetrics);

    return () => {
      window.removeEventListener("scroll", requestMetrics);
      window.removeEventListener("resize", requestMetrics);
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, []);

  return metrics;
}

function useColumnMotionFreeze() {
  const [scrolling, setScrolling] = useState(false);

  useEffect(() => {
    let freezeTimer = 0;

    const pauseMotion = () => {
      setScrolling(true);
      window.clearTimeout(freezeTimer);
      freezeTimer = window.setTimeout(() => setScrolling(false), 220);
    };

    window.addEventListener("scroll", pauseMotion, { passive: true });
    window.addEventListener("touchmove", pauseMotion, { passive: true });

    return () => {
      window.clearTimeout(freezeTimer);
      window.removeEventListener("scroll", pauseMotion);
      window.removeEventListener("touchmove", pauseMotion);
    };
  }, []);

  return scrolling;
}

function useMotionTimeline(paused: boolean) {
  const [motionTime, setMotionTime] = useState(0);
  const startedAtRef = useRef<number | null>(null);
  const pausedAtRef = useRef<number | null>(null);
  const pausedDurationRef = useRef(0);

  const getMotionTime = useCallback(() => {
    const now = performance.now();
    const startedAt = startedAtRef.current ?? now;
    const activePauseDuration = pausedAtRef.current === null ? 0 : now - pausedAtRef.current;
    return Math.max(0, now - startedAt - pausedDurationRef.current - activePauseDuration);
  }, []);

  useEffect(() => {
    const now = performance.now();

    if (startedAtRef.current === null) {
      startedAtRef.current = now;
    }

    if (paused && pausedAtRef.current === null) {
      pausedAtRef.current = now;
    }

    if (!paused && pausedAtRef.current !== null) {
      pausedDurationRef.current += now - pausedAtRef.current;
      pausedAtRef.current = null;
    }

    const animationFrame = window.requestAnimationFrame(() => setMotionTime(getMotionTime()));
    return () => window.cancelAnimationFrame(animationFrame);
  }, [getMotionTime, paused]);

  useEffect(() => {
    if (paused) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setMotionTime(getMotionTime());
    }, VIRTUAL_MOTION_REFRESH_MS);

    return () => window.clearInterval(timer);
  }, [getMotionTime, paused]);

  return motionTime;
}

function getVirtualColumnItems(
  column: MasonryColumn,
  visibleTop: number,
  visibleBottom: number,
  motionTime: number,
  durationMs: number,
) {
  const cycleHeight = Math.max(column.height, 1);
  const phaseTime = (motionTime + column.index * 13000) % durationMs;
  const offset = (phaseTime / durationMs) * cycleHeight;
  const signedOffset = column.direction === "up" ? -offset : offset;
  const virtualItems: VirtualMasonryItem[] = [];

  for (const item of column.items) {
    const currentBaseTop = item.top + signedOffset;
    const firstRepeat = Math.floor((visibleTop - currentBaseTop - item.height) / cycleHeight);
    const lastRepeat = Math.ceil((visibleBottom - currentBaseTop) / cycleHeight);

    for (let repeat = firstRepeat; repeat <= lastRepeat; repeat += 1) {
      const currentTop = currentBaseTop + repeat * cycleHeight;

      if (currentTop + item.height >= visibleTop && currentTop <= visibleBottom) {
        virtualItems.push({
          item,
          key: `${item.photo.id}-${repeat}`,
          top: item.top + repeat * cycleHeight,
        });
      }
    }
  }

  virtualItems.sort((first, second) => first.top - second.top);
  return virtualItems;
}

const GallerySkeleton = memo(function GallerySkeleton() {
  return (
    <div className="gallery-skeleton-grid" aria-hidden="true">
      {Array.from({ length: 10 }, (_, index) => (
        <span
          className="gallery-skeleton-tile"
          key={index}
          style={{ height: index % 3 === 0 ? 300 : index % 3 === 1 ? 220 : 260 }}
        />
      ))}
    </div>
  );
});

type CatalogCardProps = {
  readonly catalog: PhotoCatalog;
  readonly priority?: boolean;
};

const CatalogCard = memo(function CatalogCard({ catalog, priority = false }: CatalogCardProps) {
  const coverPhoto = useMemo(() => getCatalogCover(catalog), [catalog]);
  const [coverLoaded, setCoverLoaded] = useState(false);
  const handleCoverLoaded = useCallback(() => setCoverLoaded(true), []);
  const photoCountLabel = useMemo(() => formatPhotoCount(catalog.photos.length), [catalog.photos.length]);

  return (
    <Link
      to={`/photography/${catalog.slug}`}
      className={`photo-catalog-card${coverLoaded ? " is-cover-loaded" : ""}`}
    >
      <span className="photo-catalog-tab" aria-hidden="true" />
      {coverPhoto ? (
        <img
          className="photo-catalog-cover"
          src={coverPhoto.thumbSrc}
          width={coverPhoto.thumbWidth}
          height={coverPhoto.thumbHeight}
          alt=""
          decoding="async"
          fetchPriority={priority ? "high" : "low"}
          loading={priority ? "eager" : "lazy"}
          onError={handleCoverLoaded}
          onLoad={handleCoverLoaded}
        />
      ) : null}
      <span className="photo-catalog-grain" aria-hidden="true" />
      <span className="photo-catalog-content">
        <span className="photo-catalog-kicker">{catalog.locationLabel}</span>
        <span className="photo-catalog-title">{catalog.name}</span>
        <span className="photo-catalog-meta">
          <span>{photoCountLabel}</span>
          <span>Open gallery</span>
        </span>
      </span>
    </Link>
  );
});

type VirtualCatalogGridProps = {
  readonly catalogs: readonly PhotoCatalog[];
};

const VirtualCatalogGrid = memo(function VirtualCatalogGrid({ catalogs }: VirtualCatalogGridProps) {
  const [gridRef, gridMetrics] = useElementMetrics<HTMLDivElement>();
  const { scrollY, viewportHeight } = useWindowMetrics();
  const layout = useMemo(
    () => buildCatalogGridLayout(catalogs.length, gridMetrics.width),
    [catalogs.length, gridMetrics.width],
  );
  const visibleTop = scrollY - gridMetrics.pageTop;
  const visibleBottom = scrollY + viewportHeight - gridMetrics.pageTop;
  const virtualItems = useMemo(
    () => getVirtualCatalogItems(catalogs, layout, visibleTop, visibleBottom),
    [catalogs, layout, visibleBottom, visibleTop],
  );
  const gridStyle = useMemo<CatalogGridStyle>(() => ({
    "--catalog-grid-height": `${layout.height}px`,
    "--catalog-grid-gap": `${layout.gap}px`,
    "--catalog-card-size": `${layout.cardWidth}px`,
  }), [layout.cardWidth, layout.gap, layout.height]);

  return (
    <div
      className="photo-catalog-grid"
      aria-label="Photography catalogs"
      ref={gridRef}
      style={gridStyle}
    >
      {virtualItems.map((item) => {
        const slotStyle: CatalogSlotStyle = {
          "--catalog-card-size": `${layout.cardWidth}px`,
          height: layout.cardWidth,
          transform: `translate3d(${item.left}px, ${item.top}px, 0)`,
          width: layout.cardWidth,
        };

        return (
          <div className="photo-catalog-slot" key={item.key} style={slotStyle}>
            <CatalogCard catalog={item.catalog} priority={item.index === 0} />
          </div>
        );
      })}
    </div>
  );
});

type CatalogIndexProps = {
  readonly catalogs: readonly PhotoCatalog[];
};

const CatalogIndex = memo(function CatalogIndex({ catalogs }: CatalogIndexProps) {
  const priorityCover = catalogs[0] ? getCatalogCover(catalogs[0]) : undefined;

  preload(CATALOG_TEXTURE_SRC, {
    as: "image",
    fetchPriority: "high",
    type: "image/jpeg",
  });

  if (priorityCover) {
    preload(priorityCover.thumbSrc, {
      as: "image",
      fetchPriority: "high",
    });
  }

  return (
    <section className="page-shell photography-page">
      <Link to="/" className="back-link">
        <span className="material-symbols-rounded">arrow_back</span>
        Back Home
      </Link>

      <div className="page-heading photography-heading">
        <span className="page-kicker">Photography</span>
        <h1>Light, Places, People, Small Moments</h1>
        <p>A quiet space for frames from life that I took.</p>
      </div>

      <VirtualCatalogGrid catalogs={catalogs} />
    </section>
  );
});

type PhotoTileProps = {
  readonly item: MasonryItem;
  readonly onOpenPhoto: (photo: PhotoAsset) => void;
  readonly top: number;
};

function getMotionDelay(motionTime: number, columnIndex: number, durationMs: number) {
  return -((motionTime + columnIndex * 13000) % durationMs);
}

const PhotoTile = memo(function PhotoTile({
  item,
  onOpenPhoto,
  top,
}: PhotoTileProps) {
  const [loaded, setLoaded] = useState(false);
  const handleOpen = useCallback(() => onOpenPhoto(item.photo), [item.photo, onOpenPhoto]);
  const handleTileLoaded = useCallback(() => setLoaded(true), []);
  const style = useMemo<GalleryTileStyle>(() => ({
    top,
    left: 0,
    width: item.width,
    height: item.height,
    "--tile-delay": `${Math.min(item.index, 12) * 36}ms`,
  }), [item.height, item.index, item.width, top]);

  return (
    <button
      className="gallery-photo-shell"
      type="button"
      style={style}
      onClick={handleOpen}
      aria-label={`Open ${item.photo.alt}`}
    >
      <span className={`gallery-photo-motion${loaded ? " is-loaded" : ""}`}>
        <span className="gallery-photo-skeleton" aria-hidden="true" />
        <img
          className="gallery-photo-image"
          src={item.photo.thumbSrc}
          width={item.photo.thumbWidth}
          height={item.photo.thumbHeight}
          alt={item.photo.alt}
          loading="lazy"
          decoding="async"
          fetchPriority={item.index < 8 ? "high" : "low"}
          onLoad={handleTileLoaded}
          onError={handleTileLoaded}
        />
      </span>
    </button>
  );
});

type PhotoColumnProps = {
  readonly column: MasonryColumn;
  readonly durationMs: number;
  readonly motionTime: number;
  readonly onOpenPhoto: (photo: PhotoAsset) => void;
  readonly virtualItems: readonly VirtualMasonryItem[];
};

const PhotoColumn = memo(function PhotoColumn({
  column,
  durationMs,
  motionTime,
  onOpenPhoto,
  virtualItems,
}: PhotoColumnProps) {
  const cycleHeight = Math.max(column.height, 1);
  const [motionDelay] = useState(() => getMotionDelay(motionTime, column.index, durationMs));
  const columnStyle = useMemo<GalleryColumnStyle>(() => ({
    left: column.left,
    width: column.width,
  }), [column.left, column.width]);
  const trackStyle = useMemo<GalleryColumnStyle>(() => ({
    "--column-cycle": `${cycleHeight}px`,
    "--column-cycle-negative": `-${cycleHeight}px`,
    "--column-duration": `${durationMs}ms`,
    "--motion-delay": `${motionDelay}ms`,
  }), [cycleHeight, durationMs, motionDelay]);

  return (
    <div className="gallery-column" style={columnStyle}>
      <div className={`gallery-column-track gallery-motion-${column.direction}`} style={trackStyle}>
        {virtualItems.map((virtualItem) => (
          <PhotoTile
            item={virtualItem.item}
            key={`${virtualItem.key}-${Math.round(column.height)}-${Math.round(column.width)}`}
            onOpenPhoto={onOpenPhoto}
            top={virtualItem.top}
          />
        ))}
      </div>
    </div>
  );
});

type PhotoMasonryProps = {
  readonly photos: readonly PhotoAsset[];
  readonly onOpenPhoto: (photo: PhotoAsset) => void;
};

const PhotoMasonry = memo(function PhotoMasonry({ photos, onOpenPhoto }: PhotoMasonryProps) {
  const [containerRef, containerMetrics] = useElementMetrics<HTMLDivElement>();
  const { scrollY, viewportHeight } = useWindowMetrics();
  const scrollMotionFrozen = useColumnMotionFreeze();
  const motionTime = useMotionTimeline(scrollMotionFrozen);
  const layout = useMemo(() => buildMasonryLayout(photos, containerMetrics.width), [containerMetrics.width, photos]);
  const virtualOverscan = Math.max(VIRTUAL_OVERSCAN_MIN, viewportHeight * VIRTUAL_OVERSCAN_VIEWPORT_MULTIPLIER);
  const visibleTop = scrollY - containerMetrics.pageTop - virtualOverscan;
  const visibleBottom = scrollY + viewportHeight - containerMetrics.pageTop + virtualOverscan;
  const visibleColumns = useMemo(() => (
    layout.columns.map((column) => {
      const durationMs = getColumnDurationMs(column.height);

      return {
        column,
        durationMs,
        virtualItems: getVirtualColumnItems(column, visibleTop, visibleBottom, motionTime, durationMs),
      };
    })
  ), [layout.columns, motionTime, visibleBottom, visibleTop]);
  const canvasStyle = useMemo<CSSProperties>(() => ({
    height: layout.height,
  }), [layout.height]);

  return (
    <div className="photo-masonry-frame" ref={containerRef}>
      {containerMetrics.width > 0 ? (
        <div className={`photo-masonry-canvas${scrollMotionFrozen ? " is-scroll-freeze" : ""}`} style={canvasStyle}>
          {visibleColumns.map(({ column, durationMs, virtualItems }) => (
            <PhotoColumn
              column={column}
              key={`${column.index}-${Math.round(column.height)}-${Math.round(column.width)}`}
              durationMs={durationMs}
              motionTime={motionTime}
              onOpenPhoto={onOpenPhoto}
              virtualItems={virtualItems}
            />
          ))}
        </div>
      ) : (
        <GallerySkeleton />
      )}
    </div>
  );
});

type PhotoLightboxProps = {
  readonly photo: PhotoAsset | null;
  readonly onClose: () => void;
};

const PhotoLightbox = memo(function PhotoLightbox({
  photo,
  onClose,
}: PhotoLightboxProps) {
  const [closing, setClosing] = useState(false);
  const [displayedPhoto, setDisplayedPhoto] = useState(photo);
  const [loadedPhotoId, setLoadedPhotoId] = useState<string | null>(null);
  const currentPhoto = photo ?? displayedPhoto;
  const currentPhotoId = currentPhoto?.id ?? null;

  if (photo && photo !== displayedPhoto) {
    setDisplayedPhoto(photo);
  }

  if (photo && closing) {
    setClosing(false);
  }

  if (!photo && displayedPhoto && !closing) {
    setClosing(true);
  }

  if (currentPhoto && loadedPhotoId && loadedPhotoId !== currentPhoto.id) {
    setLoadedPhotoId(null);
  }

  useEffect(() => {
    if (!closing || photo || !displayedPhoto) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setDisplayedPhoto(null);
      setClosing(false);
      setLoadedPhotoId(null);
    }, LIGHTBOX_EXIT_MS);

    return () => window.clearTimeout(timer);
  }, [closing, displayedPhoto, photo]);

  const loaded = currentPhoto ? loadedPhotoId === currentPhoto.id : false;

  useLayoutEffect(() => {
    if (!currentPhoto) {
      return undefined;
    }

    const lockedScrollY = window.scrollY;
    let scrollFrame = 0;

    const syncScrollbarGutter = () => {
      const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
      document.documentElement.style.setProperty("--viewer-scrollbar-width", `${scrollbarWidth}px`);
    };

    const preventScroll = (event: Event) => {
      event.preventDefault();
    };

    const keepScrollLocked = () => {
      if (window.scrollY === lockedScrollY || scrollFrame) {
        return;
      }

      scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = 0;
        window.scrollTo(0, lockedScrollY);
      });
    };

    syncScrollbarGutter();
    document.body.classList.add("photo-viewer-open");
    window.addEventListener("resize", syncScrollbarGutter);
    window.addEventListener("wheel", preventScroll, { passive: false });
    window.addEventListener("touchmove", preventScroll, { passive: false });
    window.addEventListener("scroll", keepScrollLocked, { passive: true });

    return () => {
      document.body.classList.remove("photo-viewer-open");
      document.documentElement.style.removeProperty("--viewer-scrollbar-width");
      window.removeEventListener("resize", syncScrollbarGutter);
      window.removeEventListener("wheel", preventScroll);
      window.removeEventListener("touchmove", preventScroll);
      window.removeEventListener("scroll", keepScrollLocked);

      if (scrollFrame) {
        window.cancelAnimationFrame(scrollFrame);
      }

      if (window.scrollY !== lockedScrollY) {
        window.scrollTo(0, lockedScrollY);
      }
    };
  }, [currentPhoto]);

  useEffect(() => {
    if (!currentPhoto || closing) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closing, onClose, currentPhoto]);

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }, [onClose]);

  const handleImageLoaded = useCallback((event: SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;
    const loadedId = image.dataset.photoId;

    if (!loadedId) {
      return;
    }

    const revealImage = () => {
      if (currentPhotoId === loadedId) {
        window.requestAnimationFrame(() => setLoadedPhotoId(loadedId));
      }
    };

    if (typeof image.decode === "function") {
      void image.decode().then(revealImage, revealImage);
      return;
    }

    revealImage();
  }, [currentPhotoId]);

  const stageStyle = useMemo<LightboxStageStyle | undefined>(() => {
    if (!currentPhoto) {
      return undefined;
    }

    return {
      "--photo-aspect": currentPhoto.width / currentPhoto.height,
    };
  }, [currentPhoto]);

  if (!currentPhoto) {
    return null;
  }

  return createPortal(
    <div
      className={`photo-lightbox${closing ? " is-closing" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={currentPhoto.alt}
      onMouseDown={handleMouseDown}
    >
      <div className="photo-lightbox-panel">
        <button className="photo-lightbox-close" type="button" onClick={onClose} aria-label="Close photo">
          <span className="material-symbols-rounded">close</span>
        </button>

        <figure className={`photo-lightbox-stage${loaded ? " is-loaded" : ""}`} style={stageStyle}>
          <img
            className="photo-lightbox-preview"
            src={currentPhoto.thumbSrc}
            width={currentPhoto.thumbWidth}
            height={currentPhoto.thumbHeight}
            alt=""
            aria-hidden="true"
            decoding="async"
          />
          <span className={`photo-lightbox-loader${loaded ? " is-hidden" : ""}`} aria-hidden="true">
            <m3e-loading-indicator variant="contained" aria-label="Loading full resolution photo" />
          </span>
          <img
            className={`photo-lightbox-image${loaded ? " is-loaded" : ""}`}
            src={currentPhoto.originalSrc}
            width={currentPhoto.width}
            height={currentPhoto.height}
            alt={currentPhoto.alt}
            data-photo-id={currentPhoto.id}
            decoding="async"
            loading="eager"
            fetchPriority="high"
            onLoad={handleImageLoaded}
            onError={handleImageLoaded}
          />
        </figure>
      </div>
    </div>,
    document.body
  );
});

type GalleryPageProps = {
  readonly catalog: PhotoCatalog;
};

const GalleryPage = memo(function GalleryPage({ catalog }: GalleryPageProps) {
  const [activePhoto, setActivePhoto] = useState<PhotoAsset | null>(null);
  const handleOpenPhoto = useCallback((photo: PhotoAsset) => {
    setActivePhoto(photo);
  }, []);
  const handleClosePhoto = useCallback(() => setActivePhoto(null), []);

  return (
    <section className="page-shell photography-page gallery-page">
      <Link to="/photography" className="back-link">
        <span className="material-symbols-rounded">arrow_back</span>
        All Catalogs
      </Link>

      <div className="gallery-hero">
        <div className="page-heading photography-heading">
          <span className="page-kicker">Gallery</span>
          <h1>{catalog.name}</h1>
          <p>{catalog.description}</p>
        </div>
      </div>

      <PhotoMasonry photos={catalog.photos} onOpenPhoto={handleOpenPhoto} />
      <PhotoLightbox
        photo={activePhoto}
        onClose={handleClosePhoto}
      />
    </section>
  );
});

function CatalogNotFound() {
  return (
    <section className="page-shell photography-page">
      <Link to="/photography" className="back-link">
        <span className="material-symbols-rounded">arrow_back</span>
        All Catalogs
      </Link>

      <div className="empty-state">
        <h2>Catalog not found</h2>
        <p>This photography folder is not available yet.</p>
      </div>
    </section>
  );
}

function Photography() {
  const { catalogSlug } = useParams();
  const selectedCatalog = useMemo(() => (
    catalogSlug ? photoCatalogs.find((catalog) => catalog.slug === catalogSlug) : undefined
  ), [catalogSlug]);

  if (catalogSlug && !selectedCatalog) {
    return <CatalogNotFound />;
  }

  if (selectedCatalog) {
    return <GalleryPage catalog={selectedCatalog} key={selectedCatalog.slug} />;
  }

  return <CatalogIndex catalogs={photoCatalogs} />;
}

export default memo(Photography);
