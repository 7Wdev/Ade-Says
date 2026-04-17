import {
  memo,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { Link, useParams } from "react-router-dom";
import { photoCatalogs, type PhotoAsset, type PhotoCatalog } from "../generated/photo-catalogs";

const VIRTUAL_OVERSCAN = 900;

type MasonryItem = {
  readonly photo: PhotoAsset;
  readonly index: number;
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
  readonly columnIndex: number;
};

type MasonryLayout = {
  readonly height: number;
  readonly items: readonly MasonryItem[];
};

type GalleryTileStyle = CSSProperties & Record<`--${string}`, string | number>;



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

function buildMasonryLayout(photos: readonly PhotoAsset[], width: number): MasonryLayout {
  if (width <= 0) {
    return { height: 0, items: [] };
  }

  const columnCount = getColumnCount(width);
  const gap = width >= 820 ? 22 : 16;
  const columnWidth = (width - gap * (columnCount - 1)) / columnCount;
  const columnHeights = Array.from({ length: columnCount }, () => 0);
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
    return item;
  });

  return {
    height: Math.max(...columnHeights, 0),
    items,
  };
}

function useElementMetrics<TElement extends HTMLElement>() {
  const ref = useRef<TElement | null>(null);
  const [metrics, setMetrics] = useState(() => ({
    pageTop: 0,
    width: 0,
  }));

  useEffect(() => {
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
    window.addEventListener("scroll", requestMeasure, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", requestMeasure);
      window.removeEventListener("scroll", requestMeasure);

      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, []);

  return [ref, metrics] as const;
}

function useWindowMetrics() {
  const [metrics, setMetrics] = useState(() => ({
    scrollY: 0,
    viewportHeight: 0,
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
};

const CatalogCard = memo(function CatalogCard({ catalog }: CatalogCardProps) {
  const coverPhoto = getCatalogCover(catalog);

  return (
    <Link to={`/photography/${catalog.slug}`} className="photo-catalog-card">
      <span className="photo-catalog-tab" aria-hidden="true" />
      {coverPhoto ? (
        <img
          className="photo-catalog-cover"
          src={coverPhoto.thumbSrc}
          width={coverPhoto.thumbWidth}
          height={coverPhoto.thumbHeight}
          alt=""
          decoding="async"
          fetchPriority="high"
        />
      ) : null}
      <span className="photo-catalog-grain" aria-hidden="true" />
      <span className="photo-catalog-content">
        <span className="photo-catalog-kicker">{catalog.locationLabel}</span>
        <span className="photo-catalog-title">{catalog.name}</span>
        <span className="photo-catalog-meta">
          <span>{formatPhotoCount(catalog.photos.length)}</span>
          <span>Open gallery</span>
        </span>
      </span>
    </Link>
  );
});

type CatalogIndexProps = {
  readonly catalogs: readonly PhotoCatalog[];
};

const CatalogIndex = memo(function CatalogIndex({ catalogs }: CatalogIndexProps) {
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

      <div className="photo-catalog-grid" aria-label="Photography catalogs">
        {catalogs.map((catalog) => (
          <CatalogCard catalog={catalog} key={catalog.slug} />
        ))}
      </div>
    </section>
  );
});

type PhotoTileProps = {
  readonly item: MasonryItem;
  readonly onOpenPhoto: (photo: PhotoAsset) => void;
};

const PhotoTile = memo(function PhotoTile({ item, onOpenPhoto }: PhotoTileProps) {
  const [loaded, setLoaded] = useState(false);
  const handleOpen = useCallback(() => onOpenPhoto(item.photo), [item.photo, onOpenPhoto]);
  const [globalSyncDelay] = useState(() => -(Date.now() % 24000));
  const style = useMemo<GalleryTileStyle>(() => ({
    top: item.top,
    left: item.left,
    width: item.width,
    height: item.height,
    "--tile-delay": `${Math.min(item.index, 12) * 36}ms`,
    "--float-delay": `${globalSyncDelay}ms`,
  }), [item.height, item.index, item.left, item.top, item.width, globalSyncDelay]);

  const cyclicClass = item.columnIndex % 2 === 0 ? "gallery-motion-up" : "gallery-motion-down";

  return (
    <button
      className={`gallery-photo-shell ${cyclicClass}`}
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
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(true)}
        />
      </span>
    </button>
  );
});

type PhotoMasonryProps = {
  readonly photos: readonly PhotoAsset[];
  readonly onOpenPhoto: (photo: PhotoAsset) => void;
};

const PhotoMasonry = memo(function PhotoMasonry({ photos, onOpenPhoto }: PhotoMasonryProps) {
  const [containerRef, containerMetrics] = useElementMetrics<HTMLDivElement>();
  const { scrollY, viewportHeight } = useWindowMetrics();
  const layout = useMemo(() => buildMasonryLayout(photos, containerMetrics.width), [containerMetrics.width, photos]);
  
  const visibleItems = useMemo(() => {
    if (containerMetrics.width === 0 || viewportHeight === 0) {
      return layout.items.slice(0, Math.min(layout.items.length, 12));
    }

    const visibleTop = scrollY - containerMetrics.pageTop - VIRTUAL_OVERSCAN;
    const visibleBottom = scrollY + viewportHeight - containerMetrics.pageTop + VIRTUAL_OVERSCAN;

    return layout.items.filter((item) => (
      item.top + item.height >= visibleTop && item.top <= visibleBottom
    ));
  }, [containerMetrics.pageTop, containerMetrics.width, layout.items, scrollY, viewportHeight]);
  const canvasStyle = useMemo<CSSProperties>(() => ({
    height: layout.height,
  }), [layout.height]);

  return (
    <div className="photo-masonry-frame" ref={containerRef}>
      {containerMetrics.width > 0 ? (
        <div className="photo-masonry-canvas" style={canvasStyle}>
          {visibleItems.map((item) => (
            <PhotoTile
              item={item}
              key={item.photo.id}
              onOpenPhoto={onOpenPhoto}
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

  if (photo && photo !== displayedPhoto) {
    setDisplayedPhoto(photo);
    setClosing(false);
  }

  if (!photo && displayedPhoto && !closing) {
    setClosing(true);
  }

  useEffect(() => {
    if (closing && !photo) {
      const timer = setTimeout(() => {
        setDisplayedPhoto(null);
        setClosing(false);
      }, 220);
      return () => clearTimeout(timer);
    }
  }, [closing, photo]);

  const loaded = displayedPhoto ? loadedPhotoId === displayedPhoto.id : false;

  useEffect(() => {
    if (!displayedPhoto) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [displayedPhoto]);

  useEffect(() => {
    if (!displayedPhoto || closing) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closing, onClose, displayedPhoto]);

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }, [onClose]);

  const handleImageLoaded = useCallback(() => {
    if (displayedPhoto) {
      setLoadedPhotoId(displayedPhoto.id);
    }
  }, [displayedPhoto]);

  if (!displayedPhoto) {
    return null;
  }

  return createPortal(
    <div
      className={`photo-lightbox${closing ? " is-closing" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={displayedPhoto.alt}
      onMouseDown={handleMouseDown}
    >
      <div className="photo-lightbox-panel">
        <button className="photo-lightbox-close" type="button" onClick={onClose} aria-label="Close photo">
          <span className="material-symbols-rounded">close</span>
        </button>

        <figure className="photo-lightbox-stage">
          <img
            className={`photo-lightbox-image${loaded ? " is-loaded" : " is-loading"}`}
            src={displayedPhoto.originalSrc}
            width={displayedPhoto.width}
            height={displayedPhoto.height}
            alt={displayedPhoto.alt}
            decoding="async"
            loading="eager"
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
    startTransition(() => setActivePhoto(photo));
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
