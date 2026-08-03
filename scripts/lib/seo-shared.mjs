import path from 'node:path';
import { promises as fs } from 'node:fs';

export const SITE_ORIGIN = 'https://ade-says.vercel.app';
export const SITE_NAME = 'Ade Says';
export const SITE_ALTERNATE_NAME = 'Ade Says Blog';
export const SITE_AUTHOR_NAME = 'Ade Issawe';
export const SITE_LOGO_PATH = '/assets/dev.webp';
export const DEFAULT_ROBOTS = 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1';
const POST_CARD_COLOR_SEQUENCE = [
  'mag-color-dark',
  'mag-color-yellow',
  'mag-color-green',
  'mag-color-orange',
  'mag-color-brown',
  'mag-color-lilac',
  'mag-color-red',
  'mag-color-pink',
  'mag-color-blue',
  'mag-color-teal',
  'mag-color-glass',
];

function normalizePath(pathname) {
  if (!pathname || pathname === '/') {
    return '/';
  }

  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return normalizedPath.endsWith('/') ? normalizedPath.slice(0, -1) : normalizedPath;
}

function buildAbsoluteUrl(pathOrUrl) {
  if (/^(?:[a-z][a-z\d+.-]*:)?\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  return `${SITE_ORIGIN}${normalizePath(pathOrUrl)}`;
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function escapeXml(value) {
  return escapeHtml(value).replaceAll("'", '&apos;');
}

function parseFrontmatter(rawMarkdown) {
  const normalizedMarkdown = rawMarkdown.replace(/^\uFEFF/, '');
  const match = /^---\r?\n([\s\S]+?)\r?\n---\r?\n([\s\S]*)$/.exec(normalizedMarkdown);

  if (!match) {
    return {};
  }

  return match[1].split('\n').reduce((fields, line) => {
    const separatorIndex = line.indexOf(':');

    if (separatorIndex === -1) {
      return fields;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    fields[key] = value;
    return fields;
  }, {});
}

function formatIsoDate(rawDate) {
  const parsedDate = new Date(`${rawDate} UTC`);

  if (Number.isNaN(parsedDate.getTime())) {
    return undefined;
  }

  return parsedDate.toISOString();
}

function combineKeywords(...keywordGroups) {
  const seenKeywords = new Set();
  const keywords = [];

  keywordGroups.forEach((keywordGroup) => {
    keywordGroup?.forEach((keyword) => {
      const normalizedKeyword = keyword.trim().toLowerCase();

      if (!normalizedKeyword || seenKeywords.has(normalizedKeyword)) {
        return;
      }

      seenKeywords.add(normalizedKeyword);
      keywords.push(keyword.trim());
    });
  });

  return keywords;
}

function resolvePostOgImagePath(post) {
  if (!post.thumbnail) {
    return `/og/posts/${post.id}.webp`;
  }

  if (/^(?:[a-z][a-z\d+.-]*:)?\/\//i.test(post.thumbnail) || post.thumbnail.startsWith('/')) {
    return post.thumbnail;
  }

  const thumbnailPathname = post.thumbnail.split(/[?#]/, 1)[0];
  const extensionMatch = /\.[a-z\d]+$/i.exec(thumbnailPathname);
  const extension = extensionMatch?.[0] ?? '.webp';

  return `/og/posts/${post.id}${extension}`;
}

function getPostCardColorClass(postIndex) {
  return POST_CARD_COLOR_SEQUENCE[postIndex % POST_CARD_COLOR_SEQUENCE.length];
}

function createBreadcrumbStructuredData(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      item: item.path ? buildAbsoluteUrl(item.path) : undefined,
      name: item.name,
      position: index + 1,
    })),
  };
}

function createWebSiteStructuredData(description) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    author: {
      '@type': 'Person',
      name: SITE_AUTHOR_NAME,
      url: SITE_ORIGIN,
    },
    description,
    inLanguage: 'en',
    name: SITE_NAME,
    alternateName: SITE_ALTERNATE_NAME,
    publisher: {
      '@type': 'Organization',
      logo: {
        '@type': 'ImageObject',
        url: buildAbsoluteUrl(SITE_LOGO_PATH),
      },
      name: SITE_NAME,
      url: SITE_ORIGIN,
    },
    url: SITE_ORIGIN,
  };
}

function createPersonStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: SITE_AUTHOR_NAME,
    sameAs: [
      'https://github.com/7Wdev',
      'https://www.instagram.com/adeissawe/',
      'https://www.youtube.com/@AdeTheCoder',
    ],
    url: SITE_ORIGIN,
  };
}

function createCollectionPageStructuredData(name, description, pathName, imagePath) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    about: name,
    description,
    image: imagePath ? buildAbsoluteUrl(imagePath) : undefined,
    name,
    url: buildAbsoluteUrl(pathName),
  };
}

function createImageGalleryStructuredData(catalog) {
  const coverPhoto = catalog.photos.find((photo) => photo.id === catalog.coverPhotoId) ?? catalog.photos[0];

  return {
    '@context': 'https://schema.org',
    '@type': 'ImageGallery',
    description: catalog.description,
    image: coverPhoto ? buildAbsoluteUrl(coverPhoto.originalSrc) : undefined,
    name: catalog.name,
    numberOfItems: catalog.photos.length,
    url: buildAbsoluteUrl(`/photography/${catalog.slug}`),
  };
}

function createPostStructuredData(post) {
  const imagePath = resolvePostOgImagePath(post);
  const publishedTime = formatIsoDate(post.date);

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    alternativeHeadline: post.titleAr || undefined,
    author: {
      '@type': 'Person',
      name: post.author || SITE_AUTHOR_NAME,
      url: SITE_ORIGIN,
    },
    dateModified: publishedTime,
    datePublished: publishedTime,
    description: post.excerpt,
    headline: post.title,
    image: imagePath ? [buildAbsoluteUrl(imagePath)] : undefined,
    inLanguage: 'en',
    isAccessibleForFree: true,
    keywords: post.tags?.join(', ') || undefined,
    mainEntityOfPage: buildAbsoluteUrl(`/post/${post.id}`),
    publisher: {
      '@type': 'Organization',
      logo: {
        '@type': 'ImageObject',
        url: buildAbsoluteUrl(SITE_LOGO_PATH),
      },
      name: SITE_NAME,
      url: SITE_ORIGIN,
    },
  };
}

function buildHomeSeo(posts) {
  const defaultImagePath = resolvePostOgImagePath(posts[0]);
  const description = 'Personal notebook by Ade Issawe about software, experiments, physics, mathematics, design, photography, and curious ideas.';

  return {
    author: SITE_AUTHOR_NAME,
    canonicalPath: '/',
    description,
    image: defaultImagePath ? {
      alt: 'Ade Says featured image',
      url: defaultImagePath,
    } : undefined,
    keywords: combineKeywords(
      ['Ade Says', 'Ade Issawe', 'personal blog'],
      ['software engineering', 'creative coding', 'physics', 'mathematics', 'photography', 'experiments'],
    ),
    lang: 'en',
    locale: 'en_US',
    structuredData: [
      createWebSiteStructuredData(description),
      createPersonStructuredData(),
    ],
    title: 'Ade Says',
    type: 'website',
  };
}

function buildBlogSeo(posts) {
  const defaultImagePath = resolvePostOgImagePath(posts[0]);
  const description = 'Browse the full Ade Says archive: software notes, experiments, essays, math, physics, and curious side projects.';

  return {
    author: SITE_AUTHOR_NAME,
    canonicalPath: '/blog',
    description,
    image: defaultImagePath ? {
      alt: 'Ade Says blog archive',
      url: defaultImagePath,
    } : undefined,
    keywords: combineKeywords(
      ['Ade Says blog', 'blog archive', 'technical writing'],
      ['software engineering', 'experiments', 'physics', 'mathematics', 'design'],
    ),
    lang: 'en',
    locale: 'en_US',
    structuredData: [
      createCollectionPageStructuredData('Ade Says Blog Archive', description, '/blog', defaultImagePath),
      createBreadcrumbStructuredData([
        { name: 'Home', path: '/' },
        { name: 'Blog', path: '/blog' },
      ]),
    ],
    title: 'Blog Archive | Ade Says',
    type: 'website',
  };
}

function buildPhotographySeo(catalogs) {
  const coverPhoto = catalogs[0]
    ? (catalogs[0].photos.find((photo) => photo.id === catalogs[0].coverPhotoId) ?? catalogs[0].photos[0])
    : undefined;
  const defaultImagePath = coverPhoto?.originalSrc;
  const description = 'Photography galleries by Ade Issawe: travel, streets, architecture, and small moments from life.';

  return {
    author: SITE_AUTHOR_NAME,
    canonicalPath: '/photography',
    description,
    image: defaultImagePath ? {
      alt: 'Ade Says photography galleries',
      url: defaultImagePath,
    } : undefined,
    keywords: combineKeywords(
      ['Ade Says photography', 'photography gallery'],
      ['travel photography', 'street photography', 'urban photography', 'visual journal'],
    ),
    lang: 'en',
    locale: 'en_US',
    structuredData: [
      createCollectionPageStructuredData('Ade Says Photography', description, '/photography', defaultImagePath),
      createBreadcrumbStructuredData([
        { name: 'Home', path: '/' },
        { name: 'Photography', path: '/photography' },
      ]),
    ],
    title: 'Photography | Ade Says',
    type: 'website',
  };
}

function buildPhotographyCatalogSeo(catalog) {
  const coverPhoto = catalog.photos.find((photo) => photo.id === catalog.coverPhotoId) ?? catalog.photos[0];

  return {
    author: SITE_AUTHOR_NAME,
    canonicalPath: `/photography/${catalog.slug}`,
    description: catalog.description,
    image: coverPhoto ? {
      alt: `${catalog.name} gallery cover image`,
      url: coverPhoto.originalSrc,
    } : undefined,
    keywords: combineKeywords(
      [catalog.name, catalog.locationLabel],
      ['photography gallery', 'travel photography', 'street photography'],
    ),
    lang: 'en',
    locale: 'en_US',
    structuredData: [
      createImageGalleryStructuredData(catalog),
      createBreadcrumbStructuredData([
        { name: 'Home', path: '/' },
        { name: 'Photography', path: '/photography' },
        { name: catalog.name, path: `/photography/${catalog.slug}` },
      ]),
    ],
    title: `${catalog.name} | Photography | Ade Says`,
    type: 'website',
  };
}

function buildPostSeo(post) {
  const imagePath = resolvePostOgImagePath(post);
  const publishedTime = formatIsoDate(post.date);

  return {
    article: {
      author: post.author || SITE_AUTHOR_NAME,
      modifiedTime: publishedTime,
      publishedTime,
      section: post.tags?.[0],
      tags: post.tags,
    },
    author: post.author || SITE_AUTHOR_NAME,
    canonicalPath: `/post/${post.id}`,
    description: post.excerpt,
    dir: 'ltr',
    image: imagePath ? {
      alt: `${post.title} article cover image`,
      url: imagePath,
    } : undefined,
    keywords: combineKeywords(
      [post.title, post.titleAr || ''],
      post.tags,
      ['Ade Says article'],
    ),
    lang: 'en',
    locale: 'en_US',
    structuredData: [
      createPostStructuredData(post),
      createBreadcrumbStructuredData([
        { name: 'Home', path: '/' },
        { name: 'Blog', path: '/blog' },
        { name: post.title, path: `/post/${post.id}` },
      ]),
    ],
    title: `${post.title} | Ade Says`,
    type: 'article',
  };
}

export async function loadPosts(projectRoot) {
  const postsRoot = path.join(projectRoot, 'src', 'content', 'posts');
  const entries = await fs.readdir(postsRoot, { withFileTypes: true });
  const posts = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const articleId = entry.name;
    const markdownPath = path.join(postsRoot, articleId, 'index.md');

    try {
      const rawMarkdown = await fs.readFile(markdownPath, 'utf8');
      const fields = parseFrontmatter(rawMarkdown);

      posts.push({
        author: fields.author || SITE_AUTHOR_NAME,
        date: fields.date || '',
        excerpt: fields.excerpt || '',
        excerptAr: fields.excerptAr || '',
        id: articleId,
        markdownPath,
        tags: fields.tags
          ? fields.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
          : [],
        thumbnail: fields.thumbnail,
        thumbnailSourcePath: fields.thumbnail && !fields.thumbnail.startsWith('/') && !/^(?:[a-z][a-z\d+.-]*:)?\/\//i.test(fields.thumbnail)
          ? path.resolve(path.dirname(markdownPath), fields.thumbnail)
          : undefined,
        title: fields.title || articleId,
        titleAr: fields.titleAr || '',
      });
    } catch {
      // Ignore incomplete post folders so the build keeps moving.
    }
  }

  return posts.sort((firstPost, secondPost) => new Date(secondPost.date).getTime() - new Date(firstPost.date).getTime());
}

export async function loadPhotoCatalogs(projectRoot) {
  const generatedCatalogPath = path.join(projectRoot, 'src', 'generated', 'photo-catalogs.ts');
  const fileContents = await fs.readFile(generatedCatalogPath, 'utf8');
  const match = /export const photoCatalogs = (\[[\s\S]*\]) as const satisfies readonly PhotoCatalog\[\];/.exec(fileContents);

  if (!match) {
    throw new Error('Could not parse generated photo catalogs.');
  }

  return Function(`"use strict"; return (${match[1]});`)();
}

export async function ensurePublicSeoAssets(projectRoot, posts, catalogs) {
  const publicRoot = path.join(projectRoot, 'public');
  const ogPostsRoot = path.join(publicRoot, 'og', 'posts');

  await fs.mkdir(ogPostsRoot, { recursive: true });

  await Promise.all(posts.map(async (post, index) => {
    const resolvedOgImagePath = resolvePostOgImagePath(post);

    if (!resolvedOgImagePath || /^(?:[a-z][a-z\d+.-]*:)?\/\//i.test(resolvedOgImagePath) || !resolvedOgImagePath.startsWith('/og/posts/')) {
      return;
    }

    const targetPath = path.join(publicRoot, normalizePath(resolvedOgImagePath).slice(1));
    await fs.mkdir(path.dirname(targetPath), { recursive: true });

    if (post.thumbnailSourcePath) {
      await fs.copyFile(post.thumbnailSourcePath, targetPath);
      return;
    }

    const fallbackPalettePath = path.join(
      publicRoot,
      'og',
      'palette',
      `${getPostCardColorClass(index)}.webp`,
    );

    await fs.copyFile(fallbackPalettePath, targetPath);
  }));

  const robotsContents = buildRobotsTxt();
  await fs.writeFile(path.join(publicRoot, 'robots.txt'), robotsContents, 'utf8');

  const sitemapEntries = buildSitemapEntries(posts, catalogs);
  await fs.writeFile(path.join(publicRoot, 'sitemap.xml'), buildSitemapXml(sitemapEntries), 'utf8');
}

export function buildSitemapEntries(posts, catalogs) {
  const generatedAt = new Date().toISOString();

  return [
    { path: '/', lastModified: generatedAt },
    { path: '/blog', lastModified: generatedAt },
    { path: '/photography', lastModified: generatedAt },
    ...posts.map((post) => ({
      path: `/post/${post.id}`,
      lastModified: formatIsoDate(post.date) ?? generatedAt,
    })),
    ...catalogs.map((catalog) => ({
      path: `/photography/${catalog.slug}`,
      lastModified: generatedAt,
    })),
  ];
}

export function buildRobotsTxt() {
  return [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${SITE_ORIGIN}/sitemap.xml`,
    '',
  ].join('\n');
}

export function buildSitemapXml(entries) {
  const urlEntries = entries.map((entry) => [
    '  <url>',
    `    <loc>${escapeXml(buildAbsoluteUrl(entry.path))}</loc>`,
    entry.lastModified ? `    <lastmod>${escapeXml(entry.lastModified)}</lastmod>` : '',
    '  </url>',
  ].filter(Boolean).join('\n'));

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urlEntries,
    '</urlset>',
    '',
  ].join('\n');
}

function renderManagedMetaTag({ key, attributeName, attributeValue, content }) {
  if (!content) {
    return '';
  }

  return `<meta data-ade-seo="${escapeHtml(key)}" ${attributeName}="${escapeHtml(attributeValue)}" content="${escapeHtml(content)}" />`;
}

function renderManagedLinkTag({ key, rel, href }) {
  if (!href) {
    return '';
  }

  return `<link data-ade-seo="${escapeHtml(key)}" rel="${escapeHtml(rel)}" href="${escapeHtml(href)}" />`;
}

export function renderSeoHeadMarkup(meta) {
  const canonicalUrl = buildAbsoluteUrl(meta.canonicalPath);
  const imageUrl = meta.image ? buildAbsoluteUrl(meta.image.url) : undefined;
  const keywordContent = meta.keywords?.join(', ');
  const robotsContent = meta.robots ?? DEFAULT_ROBOTS;
  const twitterCard = imageUrl ? 'summary_large_image' : 'summary';
  const structuredDataEntries = meta.structuredData
    ? (Array.isArray(meta.structuredData) ? meta.structuredData : [meta.structuredData])
    : [];

  const headLines = [
    `<title>${escapeHtml(meta.title)}</title>`,
    renderManagedMetaTag({ key: 'author', attributeName: 'name', attributeValue: 'author', content: meta.author }),
    renderManagedMetaTag({ key: 'application-name', attributeName: 'name', attributeValue: 'application-name', content: SITE_NAME }),
    renderManagedMetaTag({ key: 'description', attributeName: 'name', attributeValue: 'description', content: meta.description }),
    renderManagedMetaTag({ key: 'keywords', attributeName: 'name', attributeValue: 'keywords', content: keywordContent }),
    renderManagedMetaTag({ key: 'robots', attributeName: 'name', attributeValue: 'robots', content: robotsContent }),
    renderManagedLinkTag({ key: 'canonical', href: canonicalUrl, rel: 'canonical' }),
    renderManagedMetaTag({ key: 'og:site_name', attributeName: 'property', attributeValue: 'og:site_name', content: SITE_NAME }),
    renderManagedMetaTag({ key: 'og:type', attributeName: 'property', attributeValue: 'og:type', content: meta.type ?? 'website' }),
    renderManagedMetaTag({ key: 'og:title', attributeName: 'property', attributeValue: 'og:title', content: meta.title }),
    renderManagedMetaTag({ key: 'og:description', attributeName: 'property', attributeValue: 'og:description', content: meta.description }),
    renderManagedMetaTag({ key: 'og:url', attributeName: 'property', attributeValue: 'og:url', content: canonicalUrl }),
    renderManagedMetaTag({ key: 'og:locale', attributeName: 'property', attributeValue: 'og:locale', content: meta.locale ?? 'en_US' }),
    renderManagedMetaTag({ key: 'og:image', attributeName: 'property', attributeValue: 'og:image', content: imageUrl }),
    renderManagedMetaTag({ key: 'og:image:secure_url', attributeName: 'property', attributeValue: 'og:image:secure_url', content: imageUrl }),
    renderManagedMetaTag({ key: 'og:image:alt', attributeName: 'property', attributeValue: 'og:image:alt', content: meta.image?.alt }),
    renderManagedMetaTag({ key: 'twitter:card', attributeName: 'name', attributeValue: 'twitter:card', content: twitterCard }),
    renderManagedMetaTag({ key: 'twitter:title', attributeName: 'name', attributeValue: 'twitter:title', content: meta.title }),
    renderManagedMetaTag({ key: 'twitter:description', attributeName: 'name', attributeValue: 'twitter:description', content: meta.description }),
    renderManagedMetaTag({ key: 'twitter:image', attributeName: 'name', attributeValue: 'twitter:image', content: imageUrl }),
    renderManagedMetaTag({ key: 'twitter:image:alt', attributeName: 'name', attributeValue: 'twitter:image:alt', content: meta.image?.alt }),
    renderManagedMetaTag({ key: 'article:published_time', attributeName: 'property', attributeValue: 'article:published_time', content: meta.article?.publishedTime }),
    renderManagedMetaTag({ key: 'article:modified_time', attributeName: 'property', attributeValue: 'article:modified_time', content: meta.article?.modifiedTime }),
    renderManagedMetaTag({ key: 'article:author', attributeName: 'property', attributeValue: 'article:author', content: meta.article?.author }),
    renderManagedMetaTag({ key: 'article:section', attributeName: 'property', attributeValue: 'article:section', content: meta.article?.section }),
    ...meta.article?.tags?.map((tag, index) => renderManagedMetaTag({
      key: `article:tag:${index}`,
      attributeName: 'property',
      attributeValue: 'article:tag',
      content: tag,
    })) ?? [],
    ...structuredDataEntries.map((entry) => (
      `<script data-ade-seo-json-ld="true" type="application/ld+json">${JSON.stringify(entry).replace(/</g, '\\u003c')}</script>`
    )),
  ];

  return [
    '<!-- SEO_HEAD_START -->',
    ...headLines.filter(Boolean),
    '<!-- SEO_HEAD_END -->',
  ].join('\n');
}

export function applySeoToHtml(html, meta) {
  const openingHtmlTag = `<html lang="${escapeHtml(meta.lang ?? 'en')}"${meta.dir ? ` dir="${escapeHtml(meta.dir)}"` : ''}>`;

  return html
    .replace(/<html\b[^>]*>/i, openingHtmlTag)
    .replace(/<!-- SEO_HEAD_START -->[\s\S]*?<!-- SEO_HEAD_END -->/i, renderSeoHeadMarkup(meta));
}

export function buildSeoPages(posts, catalogs) {
  return [
    { route: '/', seo: buildHomeSeo(posts) },
    { route: '/blog', seo: buildBlogSeo(posts) },
    { route: '/photography', seo: buildPhotographySeo(catalogs) },
    ...catalogs.map((catalog) => ({
      route: `/photography/${catalog.slug}`,
      seo: buildPhotographyCatalogSeo(catalog),
    })),
    ...posts.map((post) => ({
      route: `/post/${post.id}`,
      seo: buildPostSeo(post),
    })),
  ];
}
