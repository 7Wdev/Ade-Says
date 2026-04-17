import { memo, useCallback, useDeferredValue, useMemo, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { allPosts } from '../utils/markdown';
import { searchPosts, type SearchResult } from '../utils/search';
import ViewportRender from '../components/ViewportRender';
import ArticleCardMetadata from '../components/ArticleCardMetadata';

const editorialColors = ['mag-color-dark', 'mag-color-yellow', 'mag-color-green', 'mag-color-brown', 'mag-color-pink', 'mag-color-blue', 'mag-color-glass'];
const BLOG_CARD_VIRTUALIZATION_THRESHOLD = 12;
const BLOG_INITIAL_CARD_COUNT = 6;

type BlogResultCardProps = Pick<SearchResult, 'originalIndex' | 'post'>;

const getBlogCardColorClass = (post: SearchResult['post'], originalIndex: number) => (
  post.meta.thumbnail ? 'has-thumbnail' : editorialColors[originalIndex % editorialColors.length]
);

type BlogResultCardSkeletonProps = {
  colorClass: string;
};

const BlogResultCardSkeleton = memo(function BlogResultCardSkeleton({ colorClass }: BlogResultCardSkeletonProps) {
  return (
    <div className={`blog-result-card blog-result-card-skeleton ${colorClass}`} aria-hidden="true">
      <div className="post-card-content">
        <span className="card-cat blog-skeleton-chip" />
        <span className="blog-skeleton-line blog-skeleton-title" />
        <span className="blog-skeleton-line" />
        <span className="blog-skeleton-line blog-skeleton-short" />
      </div>
      <div className="card-footer">
        <span className="blog-skeleton-line blog-skeleton-date" />
        <span className="blog-skeleton-circle" />
      </div>
    </div>
  );
});

const BlogResultCard = memo(function BlogResultCard({ originalIndex, post }: BlogResultCardProps) {
  const colorClass = getBlogCardColorClass(post, originalIndex);
  const isListenable = Boolean(post.meta.audioEn || post.meta.audioAr);

  return (
    <Link to={`/post/${post.meta.id}`} className={`blog-result-card ${colorClass}`}>
      {post.meta.thumbnail && <img src={post.meta.thumbnail} className="card-thumbnail" alt="" loading="lazy" decoding="async" />}
      <div className="post-card-content">
        <span className="card-cat">{post.meta.pinned ? 'Pinned' : 'Blog'}</span>
        <h2>{post.meta.title}</h2>
        <p>{post.meta.excerpt}</p>
        <ArticleCardMetadata isListenable={isListenable} pageCount={post.pages.length} />
      </div>
      <div className="card-footer">
        <span>{post.meta.date}</span>
        <span className="material-symbols-rounded" aria-hidden="true">arrow_forward</span>
      </div>
    </Link>
  );
});

type VirtualizedBlogResultCardProps = BlogResultCardProps & {
  initialRender: boolean;
};

const VirtualizedBlogResultCard = memo(function VirtualizedBlogResultCard({
  initialRender,
  originalIndex,
  post,
}: VirtualizedBlogResultCardProps) {
  const colorClass = getBlogCardColorClass(post, originalIndex);

  return (
    <ViewportRender
      className="blog-card-slot"
      initialRender={initialRender}
      minHeight={320}
      placeholder={<BlogResultCardSkeleton colorClass={colorClass} />}
      rootMargin="1000px 0px"
    >
      <BlogResultCard originalIndex={originalIndex} post={post} />
    </ViewportRender>
  );
});

function Blog() {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const isSearchPending = query !== deferredQuery;

  const results = useMemo(() => searchPosts(deferredQuery, allPosts), [deferredQuery]);
  const shouldVirtualizeCards = results.length > BLOG_CARD_VIRTUALIZATION_THRESHOLD;
  const handleQueryChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
  }, []);

  return (
    <section className="page-shell blog-page">
      <Link to="/" className="back-link">
        <span className="material-symbols-rounded">arrow_back</span>
        Back Home
      </Link>

      <div className="page-heading">
        <span className="page-kicker">Archive</span>
        <h1>All Articles</h1>
        <p>
          Browse the full trail of notes, projects, experiments, pinned picks, and thoughts from the notebook.
        </p>
      </div>

      <label className="blog-search-label" htmlFor="blog-search">
        Search the archive
      </label>
      <input
        id="blog-search"
        className="blog-search-input"
        type="search"
        value={query}
        onChange={handleQueryChange}
        placeholder="Search by idea, subject, title, tag..."
      />

      <div className="blog-results-count blog-search-status" aria-live="polite" aria-atomic="true">
        {isSearchPending ? (
          <span className="search-loading">
            <m3e-loading-indicator variant="contained" aria-label="Searching articles" />
            Searching articles
          </span>
        ) : (
          <span>
            {results.length} {results.length === 1 ? 'article' : 'articles'}
          </span>
        )}
      </div>

      {results.length > 0 ? (
        <div className="blog-results-grid">
          {results.map((result, index) => (
            shouldVirtualizeCards ? (
              <VirtualizedBlogResultCard
                key={result.post.meta.id}
                initialRender={index < BLOG_INITIAL_CARD_COUNT}
                originalIndex={result.originalIndex}
                post={result.post}
              />
            ) : (
              <BlogResultCard
                key={result.post.meta.id}
                originalIndex={result.originalIndex}
                post={result.post}
              />
            )
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>No matches yet</h2>
          <p>Try a different word, subject, title, or tag.</p>
        </div>
      )}
    </section>
  );
}

export default memo(Blog);
