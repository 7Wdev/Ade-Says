import { memo, useEffect } from 'react';

import { buildAbsoluteUrl, DEFAULT_ROBOTS, SITE_NAME, type SeoMetadata } from '../utils/seo';

const MANAGED_SEO_SELECTOR = '[data-ade-seo]';
const MANAGED_JSON_LD_SELECTOR = 'script[data-ade-seo-json-ld="true"]';

function upsertHeadElement<TagName extends 'link' | 'meta'>(
  tagName: TagName,
  key: string,
  attributes: Record<string, string> | null,
) {
  const existingElement = document.head.querySelector<HTMLElement>(`${tagName}[data-ade-seo="${key}"]`);

  if (!attributes) {
    existingElement?.remove();
    return;
  }

  const element = existingElement ?? document.createElement(tagName);
  element.setAttribute('data-ade-seo', key);

  Object.entries(attributes).forEach(([attributeName, attributeValue]) => {
    element.setAttribute(attributeName, attributeValue);
  });

  if (!existingElement) {
    document.head.appendChild(element);
  }
}

function upsertMetaTag(
  key: string,
  attributeName: 'name' | 'property',
  attributeValue: string,
  content: string | undefined,
) {
  upsertHeadElement('meta', key, content
    ? {
      [attributeName]: attributeValue,
      content,
    }
    : null);
}

function upsertLinkTag(key: string, rel: string, href: string | undefined) {
  upsertHeadElement('link', key, href
    ? {
      href,
      rel,
    }
    : null);
}

function clearManagedJsonLd() {
  document.head.querySelectorAll(MANAGED_JSON_LD_SELECTOR).forEach((script) => {
    script.remove();
  });
}

function SeoHead({ meta }: { meta: SeoMetadata }) {
  useEffect(() => {
    const canonicalUrl = buildAbsoluteUrl(meta.canonicalPath);
    const imageUrl = meta.image ? buildAbsoluteUrl(meta.image.url) : undefined;
    const twitterCard = meta.image ? 'summary_large_image' : 'summary';
    const robotsContent = meta.robots ?? DEFAULT_ROBOTS;
    const keywordContent = meta.keywords?.join(', ') || undefined;

    document.title = meta.title;
    document.documentElement.lang = meta.lang ?? 'en';
    document.documentElement.removeAttribute('dir');

    upsertMetaTag('author', 'name', 'author', meta.author ?? undefined);
    upsertMetaTag('application-name', 'name', 'application-name', SITE_NAME);
    upsertMetaTag('description', 'name', 'description', meta.description);
    upsertMetaTag('keywords', 'name', 'keywords', keywordContent);
    upsertMetaTag('robots', 'name', 'robots', robotsContent);
    upsertLinkTag('canonical', 'canonical', canonicalUrl);

    upsertMetaTag('og:site_name', 'property', 'og:site_name', SITE_NAME);
    upsertMetaTag('og:type', 'property', 'og:type', meta.type ?? 'website');
    upsertMetaTag('og:title', 'property', 'og:title', meta.title);
    upsertMetaTag('og:description', 'property', 'og:description', meta.description);
    upsertMetaTag('og:url', 'property', 'og:url', canonicalUrl);
    upsertMetaTag('og:locale', 'property', 'og:locale', meta.locale ?? 'en_US');
    upsertMetaTag('og:image', 'property', 'og:image', imageUrl);
    upsertMetaTag('og:image:secure_url', 'property', 'og:image:secure_url', imageUrl);
    upsertMetaTag('og:image:alt', 'property', 'og:image:alt', meta.image?.alt);

    upsertMetaTag('twitter:card', 'name', 'twitter:card', twitterCard);
    upsertMetaTag('twitter:title', 'name', 'twitter:title', meta.title);
    upsertMetaTag('twitter:description', 'name', 'twitter:description', meta.description);
    upsertMetaTag('twitter:image', 'name', 'twitter:image', imageUrl);
    upsertMetaTag('twitter:image:alt', 'name', 'twitter:image:alt', meta.image?.alt);

    upsertMetaTag('article:published_time', 'property', 'article:published_time', meta.article?.publishedTime);
    upsertMetaTag('article:modified_time', 'property', 'article:modified_time', meta.article?.modifiedTime);
    upsertMetaTag('article:author', 'property', 'article:author', meta.article?.author);
    upsertMetaTag('article:section', 'property', 'article:section', meta.article?.section);

    const managedArticleTagElements = document.head.querySelectorAll(`${MANAGED_SEO_SELECTOR}[data-ade-seo^="article:tag:"]`);
    managedArticleTagElements.forEach((element) => {
      element.remove();
    });
    meta.article?.tags?.forEach((tag, index) => {
      upsertMetaTag(`article:tag:${index}`, 'property', 'article:tag', tag);
    });

    clearManagedJsonLd();

    const structuredDataEntries = meta.structuredData
      ? (Array.isArray(meta.structuredData) ? meta.structuredData : [meta.structuredData])
      : [];

    structuredDataEntries.forEach((entry) => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-ade-seo-json-ld', 'true');
      script.textContent = JSON.stringify(entry);
      document.head.appendChild(script);
    });
  }, [meta]);

  return null;
}

export default memo(SeoHead);
