import { memo, useMemo } from "react";
import { Link } from "react-router-dom";
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
            <Link to="/">Home</Link>
            <Link to="/blog">Blog</Link>
            <Link to="/photography">Photography</Link>
          </div>

          <div className="footer-nav-group">
            <h4>Connect</h4>
            <a href="https://www.instagram.com/adeissawe/" target="_blank" rel="noopener noreferrer">Instagram</a>
            <a href="https://github.com/7Wdev" target="_blank" rel="noopener noreferrer">GitHub</a>
            <a href="https://www.youtube.com/@AdeTheCoder" target="_blank" rel="noopener noreferrer">YouTube</a>
          </div>
        </div>

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
