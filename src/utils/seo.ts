import type { PhotoCatalog } from '../generated/photo-catalogs';
import type { Post } from './markdown';

export const SITE_ORIGIN = 'https://ade-says.vercel.app';
export const SITE_NAME = 'Ade Says';
export const SITE_AUTHOR_NAME = 'Ade Issawe';
export const DEFAULT_ROBOTS = 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1';

type StructuredData = Record<string, unknown>;
type BreadcrumbItem = {
  name: string;
  path?: string;
};

export type SeoMetadata = {
  article?: {
    author?: string;
    modifiedTime?: string;
    publishedTime?: string;
    section?: string;
    tags?: string[];
  };
  author?: string;
  canonicalPath: string;
  description: string;
  dir?: 'ltr' | 'rtl';
  image?: {
    alt?: string;
    url: string;
  };
  keywords?: string[];
  lang?: string;
  locale?: string;
  robots?: string;
  structuredData?: StructuredData | StructuredData[];
  title: string;
  type?: 'article' | 'website';
};

type PostSeoImageMeta = {
  id: string;
  thumbnail?: string;
};

function normalizePath(pathname: string) {
  if (!pathname || pathname === '/') {
    return '/';
  }

  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return normalizedPath.endsWith('/') ? normalizedPath.slice(0, -1) : normalizedPath;
}

function normalizeKeyword(keyword: string) {
  return keyword.trim().toLowerCase();
}

export function buildAbsoluteUrl(pathOrUrl: string) {
  if (/^(?:[a-z][a-z\d+.-]*:)?\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  return `${SITE_ORIGIN}${normalizePath(pathOrUrl)}`;
}

export function combineKeywords(...keywordGroups: Array<readonly string[] | undefined>) {
  const seenKeywords = new Set<string>();
  const combinedKeywords: string[] = [];

  keywordGroups.forEach((keywordGroup) => {
    keywordGroup?.forEach((keyword) => {
      const normalizedKeyword = normalizeKeyword(keyword);

      if (!normalizedKeyword || seenKeywords.has(normalizedKeyword)) {
        return;
      }

      seenKeywords.add(normalizedKeyword);
      combinedKeywords.push(keyword.trim());
    });
  });

  return combinedKeywords;
}

export function formatIsoDate(rawDate: string) {
  const parsedDate = new Date(`${rawDate} UTC`);

  if (Number.isNaN(parsedDate.getTime())) {
    return undefined;
  }

  return parsedDate.toISOString();
}

export function resolvePostSeoImage(meta: PostSeoImageMeta | undefined) {
  if (!meta) {
    return undefined;
  }

  if (!meta.thumbnail) {
    return `/og/posts/${meta.id}.webp`;
  }

  if (/^(?:[a-z][a-z\d+.-]*:)?\/\//i.test(meta.thumbnail) || meta.thumbnail.startsWith('/')) {
    return meta.thumbnail;
  }

  const thumbnailPathname = meta.thumbnail.split(/[?#]/, 1)[0];
  const extensionMatch = /\.[a-z\d]+$/i.exec(thumbnailPathname);
  const extension = extensionMatch?.[0] ?? '.webp';

  return `/og/posts/${meta.id}${extension}`;
}

function createBreadcrumbStructuredData(items: BreadcrumbItem[]) {
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

function createWebSiteStructuredData(description: string) {
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
    publisher: {
      '@type': 'Organization',
      logo: {
        '@type': 'ImageObject',
        url: buildAbsoluteUrl('/favicon.svg'),
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

function createCollectionPageStructuredData(name: string, description: string, path: string, imagePath?: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    about: name,
    description,
    image: imagePath ? buildAbsoluteUrl(imagePath) : undefined,
    name,
    url: buildAbsoluteUrl(path),
  };
}

function createImageGalleryStructuredData(catalog: PhotoCatalog) {
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

function createPostStructuredData(post: Post, lang: 'ar' | 'en', title: string, description: string, imagePath?: string) {
  const publishedTime = formatIsoDate(post.meta.date);
  const alternateHeadline = lang === 'ar' ? post.meta.title : post.meta.titleAr;

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    alternativeHeadline: alternateHeadline || undefined,
    author: {
      '@type': 'Person',
      name: post.meta.author || SITE_AUTHOR_NAME,
      url: SITE_ORIGIN,
    },
    dateModified: publishedTime,
    datePublished: publishedTime,
    description,
    headline: title,
    image: imagePath ? [buildAbsoluteUrl(imagePath)] : undefined,
    inLanguage: lang,
    isAccessibleForFree: true,
    keywords: post.meta.tags?.join(', ') || undefined,
    mainEntityOfPage: buildAbsoluteUrl(`/post/${post.meta.id}`),
    publisher: {
      '@type': 'Organization',
      logo: {
        '@type': 'ImageObject',
        url: buildAbsoluteUrl('/favicon.svg'),
      },
      name: SITE_NAME,
      url: SITE_ORIGIN,
    },
  };
}

export function buildHomeSeo(defaultImagePath?: string): SeoMetadata {
  const description = 'Personal notebook by Ade Issawe about software, experiments, physics, mathematics, design, photography, and curious ideas.';
  const keywords = combineKeywords(
    ['Ade Says', 'Ade Issawe', 'personal blog'],
    ['software engineering', 'creative coding', 'physics', 'mathematics', 'photography', 'experiments'],
  );

  return {
    author: SITE_AUTHOR_NAME,
    canonicalPath: '/',
    description,
    image: defaultImagePath ? {
      alt: 'Ade Says featured image',
      url: defaultImagePath,
    } : undefined,
    keywords,
    lang: 'en',
    locale: 'en_US',
    structuredData: [
      createWebSiteStructuredData(description),
      createPersonStructuredData(),
    ],
    title: 'Ade Says | Software, Photography, Physics, and Ideas',
    type: 'website',
  };
}

export function buildBlogSeo(defaultImagePath?: string): SeoMetadata {
  const description = 'Browse the full Ade Says archive: software notes, experiments, essays, math, physics, and curious side projects.';
  const keywords = combineKeywords(
    ['Ade Says blog', 'blog archive', 'technical writing'],
    ['software engineering', 'experiments', 'physics', 'mathematics', 'design'],
  );

  return {
    author: SITE_AUTHOR_NAME,
    canonicalPath: '/blog',
    description,
    image: defaultImagePath ? {
      alt: 'Ade Says blog archive',
      url: defaultImagePath,
    } : undefined,
    keywords,
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

export function buildPhotographySeo(defaultImagePath?: string): SeoMetadata {
  const description = 'Photography galleries by Ade Issawe: travel, streets, architecture, and small moments from life.';
  const keywords = combineKeywords(
    ['Ade Says photography', 'photography gallery'],
    ['travel photography', 'street photography', 'urban photography', 'visual journal'],
  );

  return {
    author: SITE_AUTHOR_NAME,
    canonicalPath: '/photography',
    description,
    image: defaultImagePath ? {
      alt: 'Ade Says photography galleries',
      url: defaultImagePath,
    } : undefined,
    keywords,
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

export function buildPhotographyCatalogSeo(catalog: PhotoCatalog): SeoMetadata {
  const coverPhoto = catalog.photos.find((photo) => photo.id === catalog.coverPhotoId) ?? catalog.photos[0];
  const keywords = combineKeywords(
    [catalog.name, catalog.locationLabel],
    ['photography gallery', 'travel photography', 'street photography'],
  );

  return {
    author: SITE_AUTHOR_NAME,
    canonicalPath: `/photography/${catalog.slug}`,
    description: catalog.description,
    image: coverPhoto ? {
      alt: `${catalog.name} gallery cover image`,
      url: coverPhoto.originalSrc,
    } : undefined,
    keywords,
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

export function buildPostSeo(post: Post, lang: 'ar' | 'en'): SeoMetadata {
  const title = lang === 'ar' && post.meta.titleAr ? post.meta.titleAr : post.meta.title;
  const description = lang === 'ar' && post.meta.excerptAr ? post.meta.excerptAr : post.meta.excerpt;
  const imagePath = resolvePostSeoImage(post.meta);
  const publishedTime = formatIsoDate(post.meta.date);
  const locale = lang === 'ar' ? 'ar' : 'en_US';
  const keywords = combineKeywords(
    [post.meta.title, post.meta.titleAr || ''],
    post.meta.tags,
    ['Ade Says article'],
  );

  return {
    article: {
      author: post.meta.author || SITE_AUTHOR_NAME,
      modifiedTime: publishedTime,
      publishedTime,
      section: post.meta.tags?.[0],
      tags: post.meta.tags,
    },
    author: post.meta.author || SITE_AUTHOR_NAME,
    canonicalPath: `/post/${post.meta.id}`,
    description,
    dir: lang === 'ar' ? 'rtl' : 'ltr',
    image: imagePath ? {
      alt: `${title} article cover image`,
      url: imagePath,
    } : undefined,
    keywords,
    lang,
    locale,
    structuredData: [
      createPostStructuredData(post, lang, title, description, imagePath),
      createBreadcrumbStructuredData([
        { name: 'Home', path: '/' },
        { name: 'Blog', path: '/blog' },
        { name: post.meta.title, path: `/post/${post.meta.id}` },
      ]),
    ],
    title: `${title} | Ade Says`,
    type: 'article',
  };
}

export function buildNotFoundSeo(title: string, description: string, canonicalPath: string): SeoMetadata {
  return {
    author: SITE_AUTHOR_NAME,
    canonicalPath,
    description,
    keywords: [title, SITE_NAME],
    lang: 'en',
    locale: 'en_US',
    robots: 'noindex,follow',
    title: `${title} | ${SITE_NAME}`,
    type: 'website',
  };
}
