export interface PostMeta {
  id: string;
  title: string;
  titleAr?: string;
  author: string;
  date: string;
  excerpt: string;
  excerptAr?: string;
  pinned?: boolean;
  pinnedRank?: number;
  thumbnail?: string;
  tags?: string[];
}

export interface Post {
  meta: PostMeta;
  content: string;
}

export function parseFrontmatter(rawMarkdown: string, id: string): Post {
  const frontmatterRegex = /^---\r?\n([\s\S]+?)\r?\n---\r?\n([\s\S]*)$/;
  const match = frontmatterRegex.exec(rawMarkdown);
  const defaultMeta: PostMeta = {
    id,
    title: 'Untitled',
    author: '',
    date: '',
    excerpt: '',
  };

  if (!match) {
    return {
      meta: defaultMeta,
      content: rawMarkdown,
    };
  }

  const frontmatterStr = match[1];
  const content = match[2];

  const meta: PostMeta = { ...defaultMeta };
  frontmatterStr.split('\n').forEach(line => {
    const splitIndex = line.indexOf(':');
    if (splitIndex > -1) {
      const key = line.slice(0, splitIndex).trim();
      const value = line.slice(splitIndex + 1).trim().replace(/^['"]|['"]$/g, '');

      switch (key) {
        case 'title':
        case 'titleAr':
        case 'author':
        case 'date':
        case 'excerpt':
        case 'excerptAr':
        case 'thumbnail':
          meta[key] = value;
          break;
        case 'pinned':
          meta.pinned = ['true', 'yes', '1'].includes(value.toLowerCase());
          break;
        case 'pinnedRank': {
          const parsedRank = Number(value);
          if (Number.isFinite(parsedRank)) {
            meta.pinnedRank = parsedRank;
          }
          break;
        }
        case 'tags':
          meta.tags = value.split(',').map(tag => tag.trim()).filter(Boolean);
          break;
        default:
          break;
      }
    }
  });

  return { meta, content };
}

// Vite glob import for all markdown files
const rawPosts = import.meta.glob('../content/posts/*.md', { query: '?raw', import: 'default', eager: true });

export const allPosts: Post[] = Object.entries(rawPosts).map(([path, rawContent]) => {
  const filename = path.split('/').pop()?.replace('.md', '') || 'unknown';
  return parseFrontmatter(rawContent as string, filename);
}).sort((a, b) => new Date(b.meta.date).getTime() - new Date(a.meta.date).getTime());

export const pinnedPosts: Post[] = allPosts
  .filter(post => post.meta.pinned)
  .sort((a, b) => {
    const rankA = a.meta.pinnedRank ?? Number.MAX_SAFE_INTEGER;
    const rankB = b.meta.pinnedRank ?? Number.MAX_SAFE_INTEGER;

    if (rankA !== rankB) {
      return rankA - rankB;
    }

    return new Date(b.meta.date).getTime() - new Date(a.meta.date).getTime();
  })
  .slice(0, 5);
