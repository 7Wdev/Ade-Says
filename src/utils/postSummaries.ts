import { allPosts } from './markdown';
import type { PostMeta } from './markdown';

export type PostSummaryMeta = Omit<PostMeta, 'tags'> & {
  readonly tags?: readonly string[];
};

export type PostSummary = {
  readonly meta: PostSummaryMeta;
};

export const allPostSummaries: PostSummary[] = allPosts.map((post) => ({ meta: post.meta }));

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
