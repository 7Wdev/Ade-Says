import { lazy, memo, Suspense, useCallback, useEffect, useState, type MouseEvent } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import PageLoading from './components/PageLoading';

const Home = lazy(() => import('./pages/Home'));
const Blog = lazy(() => import('./pages/Blog'));
const Photography = lazy(() => import('./pages/Photography'));
const PostView = lazy(() => import('./pages/PostView'));
const Portfolio = lazy(() => import('./pages/Portfolio'));

type NavButtonProps = {
  children: string;
  selected?: boolean;
  to: string;
};

const NavButton = memo(function NavButton({ children, selected = false, to }: NavButtonProps) {
  const navigate = useNavigate();

  const handleClick = useCallback((event: MouseEvent<HTMLElement>) => {
    if (selected) {
      event.preventDefault();
      return;
    }

    if (event.defaultPrevented || event.button !== 0) {
      return;
    }

    event.preventDefault();

    navigate(to);
  }, [navigate, selected, to]);

  return (
    <m3e-button
      className="nav-button"
      variant={selected ? 'filled' : 'tonal'}
      shape="rounded"
      size="small"
      aria-current={selected ? 'page' : undefined}
      onClick={handleClick}
    >
      {children}
    </m3e-button>
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

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animationFrame = window.requestAnimationFrame(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      });
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [location.pathname]);

  return (
    <>
      <div className="app-container">
        <nav className="navbar">
          <Link to="/" className="navbar-brand">
            Ade Says
          </Link>

          <button 
            className="navbar-toggle"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            <span className="material-symbols-rounded">
              {isMobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>

          <div className="navbar-links desktop-only">
            <NavButton to="/" selected={isHome}>Home</NavButton>
            <NavButton to="/blog" selected={isBlog}>Blog</NavButton>
            <NavButton to="/photography" selected={isPhotography}>Photography</NavButton>
            <NavButton to="/portfolio" selected={isPortfolio}>Portfolio</NavButton>
          </div>
        </nav>

        <main>
          <Suspense fallback={<PageLoading label="Loading page" />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/photography" element={<Photography />} />
              <Route path="/photography/:catalogSlug" element={<Photography />} />
              <Route path="/post/:id" element={<PostView />} />
              <Route path="/portfolio" element={<Portfolio />} />
            </Routes>
          </Suspense>
        </main>
      </div>

      <div className={`mobile-menu-overlay ${isMobileMenuOpen ? 'is-open' : ''}`}>
        <button 
          className="mobile-close-btn"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-label="Close menu"
        >
          <span className="material-symbols-rounded">close</span>
        </button>
        <div className="mobile-links-container">
          <NavButton to="/" selected={isHome}>Home</NavButton>
          <NavButton to="/blog" selected={isBlog}>Blog</NavButton>
          <NavButton to="/photography" selected={isPhotography}>Photography</NavButton>
          <NavButton to="/portfolio" selected={isPortfolio}>Portfolio</NavButton>
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
