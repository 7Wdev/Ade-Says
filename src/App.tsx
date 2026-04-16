import { lazy, memo, Suspense, useCallback, type MouseEvent } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import PageLoading from './components/PageLoading';

const Home = lazy(() => import('./pages/Home'));
const Blog = lazy(() => import('./pages/Blog'));
const Photography = lazy(() => import('./pages/Photography'));
const PostView = lazy(() => import('./pages/PostView'));

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
  const isHome = location.pathname === '/';
  const isBlog = location.pathname === '/blog' || location.pathname.startsWith('/post/');
  const isPhotography = location.pathname === '/photography';

  return (
    <div className="app-container">
      <nav className="navbar">
        <Link to="/" className="navbar-brand">
          Ade Says
        </Link>
        <div className="navbar-links">
          <NavButton to="/" selected={isHome}>Home</NavButton>
          <NavButton to="/blog" selected={isBlog}>Blog</NavButton>
          <NavButton to="/photography" selected={isPhotography}>Photography</NavButton>
        </div>
      </nav>

      <main>
        <Suspense fallback={<PageLoading label="Loading page" />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/photography" element={<Photography />} />
            <Route path="/post/:id" element={<PostView />} />
          </Routes>
        </Suspense>
      </main>
    </div>
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
