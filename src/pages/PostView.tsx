import { lazy, memo, Suspense, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link } from 'react-router-dom';
import { allPosts } from '../utils/markdown';
import PageLoading from '../components/PageLoading';

const ArticleRenderer = lazy(() => import('../components/ArticleRenderer'));

function PostView() {
  const { id } = useParams<{ id: string }>();
  const post = useMemo(() => allPosts.find((p) => p.meta.id === id), [id]);
  const [lang, setLang] = useState<'en' | 'ar'>('en');

  const [enContent, arContent] = useMemo(() => {
    if (!post) return ['', ''];
    const parts = post.content.split('===AR===');
    return [parts[0]?.trim() || '', parts[1]?.trim() || ''];
  }, [post]);

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
          style={{ backgroundImage: `url(${post.meta.thumbnail})` }}
        />,
        document.body
      )}
      <article className="post-view">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <Link to="/blog" className="back-link" style={{ marginBottom: 0 }}>
          <span className="material-symbols-rounded">arrow_back</span>
          Back to Blog
        </Link>
        <div className="lang-switcher" style={{ display: 'flex', gap: '8px' }}>
          <m3e-button variant={lang === 'en' ? 'filled' : 'tonal'} onClick={() => setLang('en')}>EN</m3e-button>
          <m3e-button className="arabic-text" variant={lang === 'ar' ? 'filled' : 'tonal'} onClick={() => setLang('ar')}>عر</m3e-button>
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
