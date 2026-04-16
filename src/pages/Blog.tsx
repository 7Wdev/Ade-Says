import { memo, useDeferredValue, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { allPosts } from '../utils/markdown';
import { searchPosts } from '../utils/search';

const editorialColors = ['mag-color-dark', 'mag-color-yellow', 'mag-color-green', 'mag-color-brown', 'mag-color-pink', 'mag-color-blue', 'mag-color-glass'];

function Blog() {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const isSearchPending = query !== deferredQuery;

  const results = useMemo(() => searchPosts(deferredQuery, allPosts), [deferredQuery]);

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
        onChange={(event) => setQuery(event.target.value)}
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
          {results.map(({ post, originalIndex }) => {
            const colorClass = post.meta.thumbnail ? 'has-thumbnail' : editorialColors[originalIndex % editorialColors.length];

            return (
              <Link to={`/post/${post.meta.id}`} key={post.meta.id} className={`blog-result-card ${colorClass}`}>
                {post.meta.thumbnail && <img src={post.meta.thumbnail} className="card-thumbnail" alt="" loading="lazy" decoding="async" />}
                <div className="post-card-content">
                  <span className="card-cat">{post.meta.pinned ? 'Pinned' : 'Blog'}</span>
                  <h2>{post.meta.title}</h2>
                  <p>{post.meta.excerpt}</p>
                </div>
                <div className="card-footer">
                  <span>{post.meta.date}</span>
                  <span className="material-symbols-rounded">arrow_forward</span>
                </div>
              </Link>
            );
          })}
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
