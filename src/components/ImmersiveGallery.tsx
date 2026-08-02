import { memo, useMemo, type CSSProperties } from "react";
import "./ImmersiveGallery.css";

interface PanelStyle extends CSSProperties {
  "--panel-color": string;
}

const categories = [
  {
    id: "photography",
    title: "Photography",
    src: "/uq/a.webp",
    color: "var(--mag-accent-blue)",
  },
  {
    id: "software",
    title: "Computer Science",
    src: "/uq/b.webp",
    color: "var(--mag-accent-lilac)",
  },
  {
    id: "physics",
    title: "Physics / Mathematics",
    src: "/uq/c.webp",
    color: "var(--mag-accent-teal)",
  },
  {
    id: "art",
    title: "Art / Design",
    src: "/uq/d.webp",
    color: "var(--mag-accent-green)",
  },
  {
    id: "society",
    title: "Society",
    src: "/uq/e.webp",
    color: "var(--mag-accent-pink)",
  },
  {
    id: "economics",
    title: "Economics",
    src: "/uq/f.webp",
    color: "var(--mag-accent-yellow)",
  },
  {
    id: "philosophy",
    title: "Philosophy / Life",
    src: "/uq/g.webp",
    color: "var(--mag-accent-orange)",
  },
];

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
          {categories.map((cat, index) => (
            <div
              key={cat.id}
              className="gallery-panel"
              style={{ "--panel-color": cat.color } as PanelStyle}
            >
              <img
                src={cat.src}
                alt={cat.title}
                loading="lazy"
                decoding="async"
                className="gallery-img"
              />
              <div className="gallery-panel-overlay">
                <span className="gallery-panel-title-vertical">
                  {cat.title}
                </span>
                <div className="gallery-panel-title-wrapper">
                  <span className="gallery-panel-number">0{index + 1}</span>
                  <h3 className="gallery-panel-title">{cat.title}</h3>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    ),
    [],
  );

  return galleryContent;
});
