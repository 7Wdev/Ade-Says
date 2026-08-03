import { memo, useMemo } from "react";
import '@m3e/web/divider';
import '@m3e/web/shape';
import type { ShapeName } from '@m3e/web/shape';
import M3eRouterButton from './M3eRouterButton';
import "./HomeFooter.css";

const footerShapes: readonly ShapeName[] = [
  '4-leaf-clover',
  '4-sided-cookie',
  '6-sided-cookie',
  '7-sided-cookie',
  '8-leaf-clover',
  '9-sided-cookie',
  '12-sided-cookie',
  'arch',
  'arrow',
  'boom',
  'bun',
  'burst',
  'circle',
  'diamond',
  'fan',
  'flower',
  'gem',
  'ghost-ish',
  'heart',
  'hexagon',
  'oval',
  'pentagon',
  'pill',
  'pixel-circle',
  'pixel-triangle',
  'puffy',
  'puffy-diamond',
  'semicircle',
  'slanted',
  'soft-boom',
  'soft-burst',
  'square',
  'sunny',
  'triangle',
  'very-sunny',
];

export const HomeFooter = memo(function HomeFooter() {
  const year = useMemo(() => new Date().getFullYear(), []);

  return (
    <footer className="home-footer">
      <div className="home-footer-inner">
        <div className="footer-top">
          <div className="footer-brand">
            <span className="footer-logo">Ade Says</span>
            <p className="footer-tagline">
              A chaotic, beautiful mix of code, physics, math, art &amp; life.
            </p>
            <div className="footer-shape-gallery" aria-hidden="true">
              {footerShapes.map((shape) => (
                <m3e-shape className="footer-shape" key={shape} name={shape} />
              ))}
            </div>
          </div>

          <div className="footer-nav-group">
            <h4>Navigate</h4>
            <M3eRouterButton to="/" size="small" variant="text">Home</M3eRouterButton>
            <M3eRouterButton to="/blog" size="small" variant="text">Blog</M3eRouterButton>
            <M3eRouterButton to="/photography" size="small" variant="text">Photography</M3eRouterButton>
            <M3eRouterButton to="/portfolio" size="small" variant="text">Portfolio</M3eRouterButton>
          </div>

          <div className="footer-nav-group">
            <h4>Connect</h4>
            <m3e-button href="https://www.instagram.com/adeissawe/" size="small" target="_blank" rel="noopener noreferrer" variant="text">Instagram</m3e-button>
            <m3e-button href="https://github.com/7Wdev" size="small" target="_blank" rel="noopener noreferrer" variant="text">GitHub</m3e-button>
            <m3e-button href="https://www.youtube.com/@AdeTheCoder" size="small" target="_blank" rel="noopener noreferrer" variant="text">YouTube</m3e-button>
          </div>
        </div>

        <m3e-divider className="footer-divider" />

        <div className="footer-bottom">
          <span>&copy; {year} Ade Issawe. All rights reserved.</span>
          <span className="footer-made-with">
            Crafted with passion &amp; pixels
          </span>
        </div>
      </div>
    </footer>
  );
});
