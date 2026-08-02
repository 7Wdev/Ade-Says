import { memo } from "react";
import '@m3e/web/chips';
import '@m3e/web/icon';

type ArticleCardMetadataProps = {
  isListenable: boolean;
  pageCount: number;
};

function ArticleCardMetadata({
  isListenable,
  pageCount,
}: ArticleCardMetadataProps) {
  const normalizedPageCount = Math.max(1, pageCount);

  return (
    <m3e-chip-set className="article-card-meta" aria-label="Article metadata">
      <m3e-chip className="article-card-meta-pill" variant="elevated">
        <m3e-icon
          aria-hidden="true"
          filled
          name={isListenable ? "headphones" : "description"}
          slot="icon"
          variant="rounded"
        />
        {isListenable ? "Listenable" : "Read only"}
      </m3e-chip>
      <m3e-chip className="article-card-meta-pill" variant="elevated">
        <m3e-icon aria-hidden="true" filled name="layers" slot="icon" variant="rounded" />
        {normalizedPageCount} {normalizedPageCount === 1 ? "page" : "pages"}
      </m3e-chip>
    </m3e-chip-set>
  );
}

export default memo(ArticleCardMetadata);
