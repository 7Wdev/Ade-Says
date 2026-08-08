import { memo, useMemo, useState, type CSSProperties } from "react";
import '@m3e/web/shape';
import type { ShapeName } from '@m3e/web/shape';
import { EDITORIAL_PALETTE } from "../editorialPalette";
import "./ImmersiveGallery.css";

interface PanelStyle extends CSSProperties {
  "--panel-color": string;
}

type GalleryCategory = {
  color: string;
  hoverShape: ShapeName;
  id: string;
  src: string;
  title: string;
};

const categories: GalleryCategory[] = [
  {
    id: "photography",
    title: "Photography",
    src: "/uq/a.webp",
    color: EDITORIAL_PALETTE[0].accent,
    hoverShape: "12-sided-cookie",
  },
  {
    id: "software",
    title: "Computer Science",
    src: "/uq/b.webp",
    color: EDITORIAL_PALETTE[1].accent,
    hoverShape: "arch",
  },
  {
    id: "physics",
    title: "Physics / Mathematics",
    src: "/uq/c.webp",
    color: EDITORIAL_PALETTE[2].accent,
    hoverShape: "flower",
  },
  {
    id: "art",
    title: "Art / Design",
    src: "/uq/d.webp",
    color: EDITORIAL_PALETTE[3].accent,
    hoverShape: "pixel-circle",
  },
  {
    id: "society",
    title: "Society",
    src: "/uq/e.webp",
    color: EDITORIAL_PALETTE[4].accent,
    hoverShape: "4-leaf-clover",
  },
  {
    id: "economics",
    title: "Economics",
    src: "/uq/f.webp",
    color: EDITORIAL_PALETTE[5].accent,
    hoverShape: "pixel-triangle",
  },
  {
    id: "philosophy",
    title: "Philosophy / Life",
    src: "/uq/g.webp",
    color: EDITORIAL_PALETTE[6].accent,
    hoverShape: "square",
  },
];

type GalleryPanelProps = {
  category: GalleryCategory;
  index: number;
};

const GalleryPanel = memo(function GalleryPanel({
  category,
  index,
}: GalleryPanelProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="gallery-panel"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ "--panel-color": category.color } as PanelStyle}
    >
      <m3e-shape
        className="gallery-panel-shape"
        name={isHovered ? category.hoverShape : "square"}
      >
        <img
          src={category.src}
          alt={category.title}
          loading="lazy"
          decoding="async"
          className="gallery-img"
        />
        <span aria-hidden="true" className="gallery-image-scrim" />
      </m3e-shape>
      <div className="gallery-panel-overlay">
        <span className="gallery-panel-title-vertical">
          {category.title}
        </span>
        <div className="gallery-panel-title-wrapper">
          <span className="gallery-panel-number">0{index + 1}</span>
          <h3 className="gallery-panel-title">{category.title}</h3>
        </div>
      </div>
    </div>
  );
});

export const ImmersiveGallery = memo(function ImmersiveGallery() {
  const galleryContent = useMemo(
    () => (
      <section className="immersive-gallery-section home-enter home-enter-1">
        <div className="immersive-gallery-header">
          <div className="section-heading-row">
            <div>
              <span className="page-kicker">Explore</span>
              <h2>Topics</h2>
            </div>
          </div>
        </div>
        <div className="immersive-gallery">
          {categories.map((category, index) => (
            <GalleryPanel category={category} index={index} key={category.id} />
          ))}
        </div>
      </section>
    ),
    [],
  );

  return galleryContent;
});
