import { allPosts } from './markdown';
import type { PostMeta } from './markdown';

export type PostSummaryMeta = Omit<PostMeta, 'tags'> & {
  readonly tags?: readonly string[];
};

export type PostSummary = {
  readonly isListenable: boolean;
  readonly meta: PostSummaryMeta;
  readonly pageCount: number;
};

export const allPostSummaries: PostSummary[] = allPosts.map((post) => ({
  isListenable: Boolean(post.meta.audioEn || post.meta.audioAr),
  meta: post.meta,
  pageCount: post.pages.length,
}));

export const pinnedPostSummaries: PostSummary[] = allPostSummaries
  .filter((post) => post.meta.pinned)
  .sort((a, b) => {
    const rankA = a.meta.pinnedRank ?? Number.MAX_SAFE_INTEGER;
    const rankB = b.meta.pinnedRank ?? Number.MAX_SAFE_INTEGER;

    if (rankA !== rankB) {
      return rankA - rankB;
    }

    return new Date(b.meta.date).getTime() - new Date(a.meta.date).getTime();
  })
  .slice(0, 5);
