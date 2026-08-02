import { memo, useMemo } from "react";
import '@m3e/web/divider';
import M3eRouterButton from './M3eRouterButton';
import "./HomeFooter.css";

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
          </div>

          <div className="footer-nav-group">
            <h4>Navigate</h4>
            <M3eRouterButton to="/" size="small" variant="text">Home</M3eRouterButton>
            <M3eRouterButton to="/blog" size="small" variant="text">Blog</M3eRouterButton>
            <M3eRouterButton to="/photography" size="small" variant="text">Photography</M3eRouterButton>
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
