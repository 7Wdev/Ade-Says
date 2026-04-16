import { lazy, memo, Suspense, useCallback, useMemo, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link } from 'react-router-dom';
import { allPosts } from '../utils/markdown';
import PageLoading from '../components/PageLoading';

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

  const [enContent, arContent] = useMemo(() => {
    if (!post) return ['', ''];
    const parts = post.content.split('===AR===');
    return [parts[0]?.trim() || '', parts[1]?.trim() || ''];
  }, [post]);
  const bannerStyle = useMemo<CSSProperties | undefined>(() => (
    post?.meta.thumbnail ? { backgroundImage: `url(${post.meta.thumbnail})` } : undefined
  ), [post]);
  const showEnglish = useCallback(() => setLang('en'), []);
  const showArabic = useCallback(() => setLang('ar'), []);

  if (!post) {
    return (
      <div className="not-found">
        <h1>Post not found</h1>
        <Link to="/blog" className="back-link">Return to blog</Link>
      </div>
    );
  }

  const activeContent = lang === 'en' ? enContent : (arContent || enContent);

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
          <ArticleRenderer content={activeContent} />
        </Suspense>
      </div>
    </article>
    </>
  );
}

export default memo(PostView);
