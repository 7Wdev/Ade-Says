import { articleImageMetadata } from '../generated/article-image-metadata';

export interface PostMeta {
  id: string;
  title: string;
  titleAr?: string;
  author: string;
  date: string;
  excerpt: string;
  excerptAr?: string;
  audioEn?: string;
  audioAr?: string;
  transcriptEn?: string;
  transcriptAr?: string;
  pinned?: boolean;
  pinnedRank?: number;
  thumbnail?: string;
  tags?: string[];
}

export interface PostPage {
  id: string;
  content: string;
  label: string;
  labelAr?: string;
  order: number;
  sourcePath: string;
}

export interface Post {
  meta: PostMeta;
  content: string;
  pages: PostPage[];
}

type ParsedMarkdown = {
  content: string;
  fields: Record<string, string>;
};

type ArticleMarkdownFile = {
  articleId: string;
  filename: string;
  path: string;
  rawContent: string;
};

type ArticleAssetResolution = {
  dimensions?: {
    height: number;
    width: number;
  };
  url?: string;
};

const rawPostFiles = import.meta.glob('../content/posts/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const postAssetUrls = import.meta.glob(
  '../content/posts/**/*.{avif,gif,jpeg,jpg,json,m4a,mp3,ogg,png,wav,webp}',
  {
    query: '?url',
    import: 'default',
    eager: true,
  },
) as Record<string, string>;

const assetMetaKeys = ['audioEn', 'audioAr', 'thumbnail', 'transcriptEn', 'transcriptAr'] as const;

function parseMarkdown(rawMarkdown: string): ParsedMarkdown {
  const normalizedMarkdown = rawMarkdown.replace(/^\uFEFF/, '');
  const frontmatterRegex = /^---\r?\n([\s\S]+?)\r?\n---\r?\n([\s\S]*)$/;
  const match = frontmatterRegex.exec(normalizedMarkdown);

  if (!match) {
    return {
      content: normalizedMarkdown,
      fields: {},
    };
  }

  const fields: Record<string, string> = {};

  match[1].split('\n').forEach((line) => {
    const splitIndex = line.indexOf(':');

    if (splitIndex === -1) {
      return;
    }

    const key = line.slice(0, splitIndex).trim();
    const value = line.slice(splitIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    fields[key] = value;
  });

  return {
    content: match[2],
    fields,
  };
}

function normalizeVirtualPath(path: string) {
  const segments: string[] = [];

  path.replace(/\\/g, '/').split('/').forEach((segment) => {
    if (!segment || segment === '.') {
      return;
    }

    if (segment === '..') {
      if (segments.length > 0 && segments[segments.length - 1] !== '..') {
        segments.pop();
      } else {
        segments.push(segment);
      }
      return;
    }

    segments.push(segment);
  });

  return segments.join('/');
}

function isExternalOrRootPath(value: string) {
  return /^(?:[a-z][a-z\d+.-]*:|\/|#)/i.test(value);
}

function resolveArticleAssetInfo(value: string | undefined, markdownPath: string): ArticleAssetResolution {
  if (!value || isExternalOrRootPath(value)) {
    return { url: value };
  }

  const normalizedMarkdownPath = markdownPath.replace(/\\/g, '/');
  const articleDirectory = normalizedMarkdownPath.slice(0, normalizedMarkdownPath.lastIndexOf('/') + 1);
  const assetPath = normalizeVirtualPath(`${articleDirectory}${value}`);

  return {
    dimensions: articleImageMetadata[assetPath],
    url: postAssetUrls[assetPath] ?? value,
  };
}

function resolveArticleAsset(value: string | undefined, markdownPath: string) {
  return resolveArticleAssetInfo(value, markdownPath).url;
}

function escapeHtmlAttribute(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function normalizeMarkdownImageTitle(rawTitle: string | undefined) {
  if (!rawTitle) {
    return '';
  }

  const trimmedTitle = rawTitle.trim();
  const firstCharacter = trimmedTitle[0];
  const lastCharacter = trimmedTitle[trimmedTitle.length - 1];

  if (
    (firstCharacter === '"' && lastCharacter === '"') ||
    (firstCharacter === "'" && lastCharacter === "'") ||
    (firstCharacter === '(' && lastCharacter === ')')
  ) {
    return trimmedTitle.slice(1, -1);
  }

  return trimmedTitle;
}

function formatMarkdownImageReference(
  alt: string,
  rawUrl: string,
  title: string | undefined,
  markdownPath: string,
  wasAngleWrapped: boolean,
) {
  const asset = resolveArticleAssetInfo(rawUrl, markdownPath);
  const resolvedUrl = asset.url ?? rawUrl;
  const normalizedTitle = normalizeMarkdownImageTitle(title);

  if (!asset.dimensions) {
    const formattedUrl = wasAngleWrapped ? `<${resolvedUrl}>` : resolvedUrl;
    const formattedTitle = normalizedTitle ? ` "${normalizedTitle.replace(/"/g, '\\"')}"` : '';

    return `![${alt}](${formattedUrl}${formattedTitle})`;
  }

  const titleAttribute = normalizedTitle
    ? ` title="${escapeHtmlAttribute(normalizedTitle)}"`
    : '';

  return [
    '<img',
    ` src="${escapeHtmlAttribute(resolvedUrl)}"`,
    ` alt="${escapeHtmlAttribute(alt)}"`,
    ` width="${asset.dimensions.width}"`,
    ` height="${asset.dimensions.height}"`,
    titleAttribute,
    '>',
  ].join('');
}

function formatHtmlImageReference(prefix: string, url: string, suffix: string, markdownPath: string) {
  const asset = resolveArticleAssetInfo(url, markdownPath);
  const resolvedUrl = asset.url ?? url;

  if (!asset.dimensions) {
    return `${prefix}${resolvedUrl}${suffix}`;
  }

  const tag = `${prefix}${resolvedUrl}${suffix}`;
  const widthAttribute = /\swidth\s*=/i.test(tag) ? '' : ` width="${asset.dimensions.width}"`;
  const heightAttribute = /\sheight\s*=/i.test(tag) ? '' : ` height="${asset.dimensions.height}"`;

  if (!widthAttribute && !heightAttribute) {
    return tag;
  }

  return `${prefix}${resolvedUrl}${suffix.replace(/(\s*\/?>)$/i, `${widthAttribute}${heightAttribute}$1`)}`;
}

function transformMarkdownOutsideFences(markdown: string, transform: (segment: string) => string) {
  return markdown
    .split(/(```[\s\S]*?```|~~~[\s\S]*?~~~)/g)
    .map((segment) => (
      segment.startsWith('```') || segment.startsWith('~~~')
        ? segment
        : transform(segment)
    ))
    .join('');
}

function resolveMarkdownAssetReferences(markdown: string, markdownPath: string) {
  return transformMarkdownOutsideFences(markdown, (segment) => segment
    .replace(/!\[([^\]]*)]\(\s*(<([^>]+)>|[^\s)]+)(?:\s+("[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/g, (
      _match,
      alt: string,
      wrappedUrl: string,
      angleUrl: string | undefined,
      title: string | undefined,
    ) => {
      const url = angleUrl ?? wrappedUrl;

      return formatMarkdownImageReference(alt, url, title, markdownPath, Boolean(angleUrl));
    })
    .replace(/(<img\b[^>]*\bsrc\s*=\s*["'])([^"']+)(["'][^>]*>)/gi, (
      _match,
      prefix: string,
      url: string,
      suffix: string,
    ) => formatHtmlImageReference(prefix, url, suffix, markdownPath)));
}

function getArticleFileInfo(path: string, rawContent: string): ArticleMarkdownFile {
  const normalizedPath = path.replace(/\\/g, '/');
  const relativePath = normalizedPath.replace('../content/posts/', '');
  const parts = relativePath.split('/');

  if (parts.length === 1) {
    const filename = parts[0];

    return {
      articleId: filename.replace(/\.md$/, ''),
      filename,
      path,
      rawContent,
    };
  }

  return {
    articleId: parts[0],
    filename: parts.slice(1).join('/'),
    path,
    rawContent,
  };
}

function getPageOrder(filename: string) {
  if (/^(index|main)\.md$/i.test(filename)) {
    return 0;
  }

  const numericPrefix = /^(\d+)/.exec(filename)?.[1];

  if (numericPrefix) {
    return Number(numericPrefix);
  }

  return Number.MAX_SAFE_INTEGER;
}

function getPageId(filename: string) {
  return filename.replace(/\.md$/i, '').replace(/\\/g, '/');
}

function getPageLabel(fields: Record<string, string>, pageNumber: number) {
  return fields.pageTitle || fields.title || (pageNumber === 1 ? 'Page 1' : `Page ${pageNumber}`);
}

function createPostMeta(fields: Record<string, string>, articleId: string, markdownPath: string): PostMeta {
  const meta: PostMeta = {
    id: articleId,
    title: fields.title || 'Untitled',
    author: fields.author || '',
    date: fields.date || '',
    excerpt: fields.excerpt || '',
  };

  ([
    'titleAr',
    'excerptAr',
    'audioEn',
    'audioAr',
    'transcriptEn',
    'transcriptAr',
    'thumbnail',
  ] as const).forEach((key) => {
    const value = fields[key];

    if (value) {
      meta[key] = value;
    }
  });

  assetMetaKeys.forEach((key) => {
    meta[key] = resolveArticleAsset(meta[key], markdownPath);
  });

  if (fields.pinned) {
    meta.pinned = ['true', 'yes', '1'].includes(fields.pinned.toLowerCase());
  }

  if (fields.pinnedRank) {
    const parsedRank = Number(fields.pinnedRank);

    if (Number.isFinite(parsedRank)) {
      meta.pinnedRank = parsedRank;
    }
  }

  if (fields.tags) {
    meta.tags = fields.tags.split(',').map((tag) => tag.trim()).filter(Boolean);
  }

  return meta;
}

function createPost(articleId: string, files: ArticleMarkdownFile[]): Post {
  const sortedFiles = [...files].sort((a, b) => (
    getPageOrder(a.filename) - getPageOrder(b.filename) || a.filename.localeCompare(b.filename)
  ));
  const mainFile = sortedFiles[0];
  const mainParsed = parseMarkdown(mainFile.rawContent);
  const meta = createPostMeta(mainParsed.fields, articleId, mainFile.path);

  const pages = sortedFiles.map((file, index): PostPage => {
    const parsed = file === mainFile ? mainParsed : parseMarkdown(file.rawContent);

    return {
      id: getPageId(file.filename),
      content: resolveMarkdownAssetReferences(parsed.content.trim(), file.path),
      label: getPageLabel(parsed.fields, index + 1),
      labelAr: parsed.fields.pageTitleAr || parsed.fields.titleAr,
      order: index,
      sourcePath: file.path,
    };
  });

  return {
    meta,
    content: pages.map((page) => page.content).join('\n\n'),
    pages,
  };
}

const articleFileGroups = Object.entries(rawPostFiles).reduce((groups, [path, rawContent]) => {
  const file = getArticleFileInfo(path, rawContent);
  const currentFiles = groups.get(file.articleId) ?? [];

  currentFiles.push(file);
  groups.set(file.articleId, currentFiles);

  return groups;
}, new Map<string, ArticleMarkdownFile[]>());

export const allPosts: Post[] = Array.from(articleFileGroups.entries())
  .map(([articleId, files]) => createPost(articleId, files))
  .sort((a, b) => new Date(b.meta.date).getTime() - new Date(a.meta.date).getTime());

export const pinnedPosts: Post[] = allPosts
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
