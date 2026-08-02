import { lazy, memo, Suspense, useLayoutEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import M3eRouterButton from './components/M3eRouterButton';
import PageLoading from './components/PageLoading';

const Home = lazy(() => import('./pages/Home'));
const Blog = lazy(() => import('./pages/Blog'));
const Photography = lazy(() => import('./pages/Photography'));
const PostView = lazy(() => import('./pages/PostView'));
const Portfolio = lazy(() => import('./pages/Portfolio'));

type NavButtonProps = {
  children: string;
  selected?: boolean;
  size?: 'small' | 'medium';
  to: string;
};

const NavButton = memo(function NavButton({ children, selected = false, size = 'small', to }: NavButtonProps) {
  return (
    <M3eRouterButton
      className="nav-button"
      current={selected}
      variant="tonal"
      shape="rounded"
      size={size}
      to={to}
      toggle
    >
      {children}
    </M3eRouterButton>
  );
});

function AppShell() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [prevPath, setPrevPath] = useState(location.pathname);
  
  if (location.pathname !== prevPath) {
    setIsMobileMenuOpen(false);
    setPrevPath(location.pathname);
  }
  
  const isHome = location.pathname === '/';
  const isBlog = location.pathname === '/blog' || location.pathname.startsWith('/post/');
  const isPhotography = location.pathname.startsWith('/photography');
  const isPortfolio = location.pathname.startsWith('/portfolio');

  useLayoutEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration;

    window.history.scrollRestoration = 'manual';

    return () => {
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, []);

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname]);

  return (
    <>
      <div className="app-container">
        <nav className="navbar">
          <Link to="/" className="navbar-brand">
            Ade Says
          </Link>

          <m3e-icon-button
            aria-controls="mobile-navigation"
            aria-expanded={isMobileMenuOpen ? 'true' : 'false'}
            className="navbar-toggle"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle navigation menu"
            size="small"
            variant="tonal"
          >
            <m3e-icon
              filled
              name={isMobileMenuOpen ? 'close' : 'menu'}
              variant="rounded"
            />
          </m3e-icon-button>

          <m3e-button-group
            aria-label="Primary navigation"
            className="navbar-links desktop-only"
            size="small"
            variant="standard"
          >
            <NavButton to="/" selected={isHome}>Home</NavButton>
            <NavButton to="/blog" selected={isBlog}>Blog</NavButton>
            <NavButton to="/photography" selected={isPhotography}>Photography</NavButton>
            <NavButton to="/portfolio" selected={isPortfolio}>Portfolio</NavButton>
          </m3e-button-group>
        </nav>

        <main>
          <Suspense fallback={<PageLoading label="Loading page" />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/photography" element={<Photography />} />
              <Route path="/photography/:catalogSlug" element={<Photography />} />
              <Route path="/post/:id" element={<PostView key={location.pathname} />} />
              <Route path="/portfolio" element={<Portfolio />} />
            </Routes>
          </Suspense>
        </main>
      </div>

      <div id="mobile-navigation" className={`mobile-menu-overlay ${isMobileMenuOpen ? 'is-open' : ''}`}>
        <m3e-icon-button
          className="mobile-close-btn"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-label="Close menu"
          shape="rounded"
          size="medium"
          variant="outlined"
        >
          <m3e-icon filled name="close" variant="rounded" />
        </m3e-icon-button>
        <div className="mobile-links-container">
          <NavButton size="medium" to="/" selected={isHome}>Home</NavButton>
          <NavButton size="medium" to="/blog" selected={isBlog}>Blog</NavButton>
          <NavButton size="medium" to="/photography" selected={isPhotography}>Photography</NavButton>
          <NavButton size="medium" to="/portfolio" selected={isPortfolio}>Portfolio</NavButton>
        </div>
      </div>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppShell />
    </Router>
  );
}

export default App;
