import { memo } from 'react';

type ArticleCardMetadataProps = {
  isListenable: boolean;
  pageCount: number;
};

function ArticleCardMetadata({ isListenable, pageCount }: ArticleCardMetadataProps) {
  const normalizedPageCount = Math.max(1, pageCount);

  return (
    <div className="article-card-meta" aria-label="Article metadata">
      <span className="article-card-meta-pill">
        <span className="material-symbols-rounded" aria-hidden="true">
          {isListenable ? 'headphones' : 'description'}
        </span>
        {isListenable ? 'Listenable' : 'Text only'}
      </span>
      <span className="article-card-meta-pill">
        <span className="material-symbols-rounded" aria-hidden="true">layers</span>
        {normalizedPageCount} {normalizedPageCount === 1 ? 'page' : 'pages'}
      </span>
    </div>
  );
}

export default memo(ArticleCardMetadata);
