import { lazy, memo, Suspense, useCallback, useMemo, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link } from 'react-router-dom';
import { allPosts } from '../utils/markdown';
import PageLoading from '../components/PageLoading';
import FloatingAudioPlayer, { type NarrationTrackMap } from '../components/FloatingAudioPlayer';

const ArticleRenderer = lazy(() => import('../components/ArticleRenderer'));
const articleToolbarStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '32px',
} as const;
const postBackLinkStyle = { marginBottom: 0 } as const;
const langSwitcherStyle = { display: 'flex', gap: '8px' } as const;

function PostView() {
  const { id } = useParams<{ id: string }>();
  const post = useMemo(() => allPosts.find((p) => p.meta.id === id), [id]);
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const [pageSelection, setPageSelection] = useState({
    pageIndex: 0,
    postId: '',
  });
  const [narrationProgress, setNarrationProgress] = useState({
    key: '',
    wordIndex: null as number | null,
  });
  const selectedPageIndex = post && pageSelection.postId === post.meta.id
    ? Math.min(pageSelection.pageIndex, post.pages.length - 1)
    : 0;
  const activePage = post?.pages[selectedPageIndex];

  const [enContent, arContent] = useMemo(() => {
    if (!activePage) return ['', ''];
    const parts = activePage.content.split('===AR===');
    return [parts[0]?.trim() || '', parts[1]?.trim() || ''];
  }, [activePage]);
  const activeContent = lang === 'en' ? enContent : (arContent || enContent);
  const narrationTracks = useMemo<NarrationTrackMap>(() => ({
    en: post?.meta.audioEn
      ? {
        content: enContent,
        label: 'English narration',
        src: post.meta.audioEn,
        transcriptSrc: post.meta.transcriptEn,
      }
      : undefined,
    ar: post?.meta.audioAr
      ? {
        content: arContent || enContent,
        label: 'Arabic narration',
        src: post.meta.audioAr,
        transcriptSrc: post.meta.transcriptAr,
      }
      : undefined,
  }), [arContent, enContent, post]);
  const bannerStyle = useMemo<CSSProperties | undefined>(() => (
    post?.meta.thumbnail ? { backgroundImage: `url(${post.meta.thumbnail})` } : undefined
  ), [post]);
  const showEnglish = useCallback(() => setLang('en'), []);
  const showArabic = useCallback(() => setLang('ar'), []);
  const activeNarrationTrack = narrationTracks[lang];
  const narrationKey = `${post?.meta.id ?? 'missing'}:${activePage?.id ?? 'page'}:${lang}:${activeContent.length}`;
  const activeNarrationWord = narrationProgress.key === narrationKey ? narrationProgress.wordIndex : null;
  const handleActiveNarrationWord = useCallback((wordIndex: number | null) => {
    setNarrationProgress({ key: narrationKey, wordIndex });
  }, [narrationKey]);
  const handlePageSelect = useCallback((pageIndex: number) => {
    if (!post) {
      return;
    }

    setPageSelection({
      pageIndex,
      postId: post.meta.id,
    });
  }, [post]);

  if (!post) {
    return (
      <div className="not-found">
        <h1>Post not found</h1>
        <Link to="/blog" className="back-link">Return to blog</Link>
      </div>
    );
  }

  return (
    <>
      {post.meta.thumbnail && createPortal(
        <div
          className="post-banner"
          style={bannerStyle}
        />,
        document.body
      )}
      <article className="post-view">
        <div style={articleToolbarStyle}>
        <Link to="/blog" className="back-link post-back-link" style={postBackLinkStyle}>
          <span className="material-symbols-rounded">arrow_back</span>
          Back to Blog
        </Link>
        <div className="lang-switcher" style={langSwitcherStyle}>
          <m3e-button variant={lang === 'en' ? 'filled' : 'tonal'} onClick={showEnglish}>EN</m3e-button>
          <m3e-button className="arabic-text" variant={lang === 'ar' ? 'filled' : 'tonal'} onClick={showArabic}>عر</m3e-button>
        </div>
      </div>
      
      <header className="article-header" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <h1 className="article-title">{lang === 'ar' && post.meta.titleAr ? post.meta.titleAr : post.meta.title}</h1>
        <div className="article-meta">
          <span>{post.meta.date}</span> • <span>{post.meta.author}</span>
        </div>
        {post.meta.tags && post.meta.tags.length > 0 && (
          <div className="article-tags">
            {post.meta.tags.map((tag) => (
              <span key={tag} className="article-tag">{tag}</span>
            ))}
          </div>
        )}
        {(post.meta.excerpt || post.meta.excerptAr) && (
          <p className="article-excerpt">
            {lang === 'ar' && post.meta.excerptAr ? post.meta.excerptAr : post.meta.excerpt}
          </p>
        )}
      </header>
      
      <div className="article-content" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <Suspense fallback={<PageLoading label="Loading article" />}>
          <ArticleRenderer
            content={activeContent}
            narration={{
              activeWordIndex: activeNarrationWord,
              enabled: Boolean(activeNarrationTrack?.src),
            }}
          />
        </Suspense>
      </div>
      {post.pages.length > 1 && (
        <nav className="article-page-nav" aria-label="Article pages">
          <span className="article-page-nav-label">Pages</span>
          <div className="article-page-nav-buttons">
            {post.pages.map((page, index) => (
              <button
                className={`article-page-button ${index === selectedPageIndex ? 'is-active' : ''}`}
                key={page.id}
                onClick={() => handlePageSelect(index)}
                type="button"
              >
                {lang === 'ar' && page.labelAr ? page.labelAr : page.label}
              </button>
            ))}
          </div>
        </nav>
      )}
    </article>
    <FloatingAudioPlayer
      key={narrationKey}
      lang={lang}
      onActiveWordChange={handleActiveNarrationWord}
      tracks={narrationTracks}
    />
    </>
  );
}

export default memo(PostView);
