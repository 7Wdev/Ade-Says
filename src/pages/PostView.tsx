import { lazy, memo, Suspense, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Link, useParams } from 'react-router-dom';

import FloatingAudioPlayer, { type NarrationTrackMap } from '../components/FloatingAudioPlayer';
import PageLoading from '../components/PageLoading';
import PostDiscussion from '../components/PostDiscussion';
import { allPosts } from '../utils/markdown';
import SeoHead from '../components/SeoHead';
import { buildNotFoundSeo, buildPostSeo } from '../utils/seo';

const ArticleRenderer = lazy(() => import('../components/ArticleRenderer'));
const ARTICLE_BOOKMARK_STORAGE_KEY = 'ade-says:article-word-bookmarks:v1';

type ArticleBookmarkStore = Record<string, {
  updatedAt: number;
  wordIndex: number;
}>;

function readArticleBookmarks(): ArticleBookmarkStore {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const rawBookmarks = window.localStorage.getItem(ARTICLE_BOOKMARK_STORAGE_KEY);
    const parsedBookmarks: unknown = rawBookmarks ? JSON.parse(rawBookmarks) : {};

    if (!parsedBookmarks || typeof parsedBookmarks !== 'object' || Array.isArray(parsedBookmarks)) {
      return {};
    }

    const bookmarks: ArticleBookmarkStore = {};

    for (const [key, value] of Object.entries(parsedBookmarks)) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        continue;
      }

      const bookmark = value as { updatedAt?: unknown; wordIndex?: unknown };
      const wordIndex = Number(bookmark.wordIndex);

      if (Number.isInteger(wordIndex) && typeof bookmark.updatedAt === 'number') {
        bookmarks[key] = {
          updatedAt: bookmark.updatedAt,
          wordIndex,
        };
      }
    }

    return bookmarks;
  } catch {
    return {};
  }
}

function writeArticleBookmarks(bookmarks: ArticleBookmarkStore) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(ARTICLE_BOOKMARK_STORAGE_KEY, JSON.stringify(bookmarks));
  } catch {
    // Browsing modes with blocked storage should not break article interactions.
  }
}

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.left = '0';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  const copied = document.execCommand('copy');
  textarea.remove();

  if (!copied) {
    throw new Error('Copy command failed');
  }
}

function PostView() {
  const { id } = useParams<{ id: string }>();
  const post = useMemo(() => allPosts.find((p) => p.meta.id === id), [id]);
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const [isAudioExpanded, setIsAudioExpanded] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const [bookmarks, setBookmarks] = useState<ArticleBookmarkStore>(readArticleBookmarks);
  const [bookmarkScrollRequest, setBookmarkScrollRequest] = useState(0);
  const [pageSelection, setPageSelection] = useState({
    pageIndex: 0,
    postId: '',
  });
  const [narrationProgress, setNarrationProgress] = useState({
    key: '',
    wordIndex: null as number | null,
  });
  const fabStackRef = useRef<HTMLDivElement | null>(null);
  const shareResetTimeoutRef = useRef<number | null>(null);

  const selectedPageIndex = post && pageSelection.postId === post.meta.id
    ? Math.min(pageSelection.pageIndex, post.pages.length - 1)
    : 0;
  const activePage = post?.pages[selectedPageIndex];

  const [enContent, arContent] = useMemo(() => {
    if (!activePage) return ['', ''];
    const parts = activePage.content.split('===AR===');
    return [parts[0]?.trim() || '', parts[1]?.trim() || ''];
  }, [activePage]);

  const activeContent = lang === 'en' ? enContent : (arContent || enContent);
  const narrationTracks = useMemo<NarrationTrackMap>(() => ({
    en: post?.meta.audioEn
      ? {
        content: enContent,
        label: 'English narration',
        src: post.meta.audioEn,
        transcriptSrc: post.meta.transcriptEn,
      }
      : undefined,
    ar: post?.meta.audioAr
      ? {
        content: arContent || enContent,
        label: 'Arabic narration',
        src: post.meta.audioAr,
        transcriptSrc: post.meta.transcriptAr,
      }
      : undefined,
  }), [arContent, enContent, post]);

  const bannerStyle = useMemo<CSSProperties | undefined>(() => (
    post?.meta.thumbnail ? { backgroundImage: `url(${post.meta.thumbnail})` } : undefined
  ), [post]);

  const activeNarrationTrack = narrationTracks[lang];
  const narrationKey = `${post?.meta.id ?? 'missing'}:${activePage?.id ?? 'page'}:${lang}:${activeContent.length}`;
  const bookmarkKey = narrationKey;
  const activeBookmarkWord = bookmarks[bookmarkKey]?.wordIndex ?? null;
  const activeNarrationWord = narrationProgress.key === narrationKey ? narrationProgress.wordIndex : null;
  const articleNarration = useMemo(() => ({
    activeWordIndex: activeNarrationWord,
    enabled: Boolean(activeNarrationTrack?.src),
  }), [activeNarrationTrack?.src, activeNarrationWord]);
  const articleBookmark = useMemo(() => ({
    activeWordIndex: activeBookmarkWord,
    onToggle: (wordIndex: number) => {
      setBookmarks((currentBookmarks) => {
        const currentBookmark = currentBookmarks[bookmarkKey];
        const nextBookmarks = { ...currentBookmarks };

        if (currentBookmark?.wordIndex === wordIndex) {
          delete nextBookmarks[bookmarkKey];
        } else {
          nextBookmarks[bookmarkKey] = {
            updatedAt: Date.now(),
            wordIndex,
          };
        }

        return nextBookmarks;
      });
    },
    scrollRequest: bookmarkScrollRequest,
  }), [activeBookmarkWord, bookmarkKey, bookmarkScrollRequest]);
  const shareMenuId = `post-share-menu-${post?.meta.id ?? 'missing'}`;
  const canUseNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const hasNarration = Boolean(activeNarrationTrack?.src);
  const isAudioExpandedVisible = hasNarration && isAudioExpanded;
  const isAudioFabMode = hasNarration && isAudioPlaying && !isAudioExpandedVisible;
  const isFabMenuVisible = isFabMenuOpen && !isAudioExpandedVisible && !isAudioFabMode;
  const articleActionsLabel = lang === 'ar'
    ? '\u062e\u064a\u0627\u0631\u0627\u062a \u0627\u0644\u0645\u0642\u0627\u0644'
    : 'Article actions';
  const shareButtonLabel = shareStatus === 'copied'
    ? (lang === 'ar' ? '\u062a\u0645 \u0627\u0644\u0646\u0633\u062e' : 'Copied')
    : shareStatus === 'error'
      ? (lang === 'ar' ? '\u0641\u0634\u0644 \u0627\u0644\u0646\u0633\u062e' : 'Copy failed')
      : (lang === 'ar' ? '\u0634\u0627\u0631\u0643 \u0627\u0644\u0645\u0642\u0627\u0644' : 'Share Article');
  const shareFabAriaLabel = shareStatus === 'idle'
    ? articleActionsLabel
    : shareButtonLabel;
  const audioFabAriaLabel = lang === 'ar'
    ? '\u0627\u0641\u062a\u062d \u0645\u0634\u063a\u0644 \u0627\u0644\u0646\u0637\u0642 \u0627\u0644\u0635\u0648\u062a\u064a'
    : 'Open narration player';
  const closeFabAriaLabel = lang === 'ar'
    ? '\u0623\u063a\u0644\u0642 \u062e\u064a\u0627\u0631\u0627\u062a \u0627\u0644\u0645\u0642\u0627\u0644'
    : 'Close article actions';
  const audioMenuLabel = lang === 'ar' ? '\u0641\u062a\u062d \u0627\u0644\u0646\u0637\u0642 \u0627\u0644\u0635\u0648\u062a\u064a' : 'Open narration';
  const bookmarkMenuLabel = lang === 'ar' ? '\u0627\u0630\u0647\u0628 \u0644\u0644\u0639\u0644\u0627\u0645\u0629' : 'Go to bookmark';
  const copyLinkLabel = lang === 'ar' ? '\u0627\u0646\u0633\u062e \u0627\u0644\u0631\u0627\u0628\u0637' : 'Copy link';
  const nativeShareLabel = lang === 'ar' ? '\u0645\u0634\u0627\u0631\u0643\u0629 \u0645\u0628\u0627\u0634\u0631\u0629' : 'Share...';
  const shareUrl = typeof window === 'undefined' ? '' : window.location.href;

  const handleLanguageChange = useCallback((nextLang: 'en' | 'ar') => {
    setLang(nextLang);
    setIsFabMenuOpen(false);

    if (!narrationTracks[nextLang]?.src) {
      setIsAudioExpanded(false);
      setIsAudioPlaying(false);
    }
  }, [narrationTracks]);

  const showEnglish = useCallback(() => {
    handleLanguageChange('en');
  }, [handleLanguageChange]);

  const showArabic = useCallback(() => {
    handleLanguageChange('ar');
  }, [handleLanguageChange]);

  const handleActiveNarrationWord = useCallback((wordIndex: number | null) => {
    setNarrationProgress({ key: narrationKey, wordIndex });
  }, [narrationKey]);

  const handleGoToBookmark = useCallback(() => {
    setIsFabMenuOpen(false);

    if (activeBookmarkWord === null) {
      return;
    }

    setBookmarkScrollRequest((request) => request + 1);
  }, [activeBookmarkWord]);

  const handlePageSelect = useCallback((pageIndex: number) => {
    if (!post) {
      return;
    }

    setPageSelection({
      pageIndex,
      postId: post.meta.id,
    });
  }, [post]);

  const handleCopyLink = useCallback(async () => {
    setIsFabMenuOpen(false);

    if (!shareUrl) {
      setShareStatus('error');
      return;
    }

    try {
      await copyTextToClipboard(shareUrl);
      setShareStatus('copied');
    } catch {
      setShareStatus('error');
    }
  }, [shareUrl]);
  const handleNativeShare = useCallback(async () => {
    setIsFabMenuOpen(false);

    if (!post || !shareUrl || typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
      setShareStatus('error');
      return;
    }

    try {
      await navigator.share({
        title: lang === 'ar' && post.meta.titleAr ? post.meta.titleAr : post.meta.title,
        text: lang === 'ar'
          ? '\u0642\u0631\u0623\u062a \u0647\u0630\u0647 \u0627\u0644\u0645\u0642\u0627\u0644\u0629 \u0639\u0644\u0649 Ade Says \u0648\u062d\u0628\u064a\u062a \u0623\u0634\u0627\u0631\u0643\u0647\u0627 \u0645\u0639\u0643'
          : 'I found this article on Ade Says and thought you might like it.',
        url: shareUrl,
      });
      setShareStatus('copied');
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      setShareStatus('error');
    }
  }, [lang, post, shareUrl]);
  const handleOpenAudio = useCallback(() => {
    setIsFabMenuOpen(false);
    setIsAudioExpanded(true);
  }, []);
  const handleToggleFabMenu = useCallback(() => {
    setIsFabMenuOpen((open) => !open);
  }, []);
  const handleAudioExpandedChange = useCallback((nextExpanded: boolean) => {
    setIsAudioExpanded(nextExpanded);

    if (nextExpanded) {
      setIsFabMenuOpen(false);
    }
  }, []);
  const handleAudioPlayingChange = useCallback((playing: boolean) => {
    setIsAudioPlaying(playing);

    if (playing) {
      setIsFabMenuOpen(false);
    }
  }, []);

  useEffect(() => {
    writeArticleBookmarks(bookmarks);
  }, [bookmarks]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === ARTICLE_BOOKMARK_STORAGE_KEY) {
        setBookmarks(readArticleBookmarks());
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    if (shareStatus === 'idle') {
      return;
    }

    if (shareResetTimeoutRef.current !== null) {
      window.clearTimeout(shareResetTimeoutRef.current);
    }

    shareResetTimeoutRef.current = window.setTimeout(() => {
      setShareStatus('idle');
      shareResetTimeoutRef.current = null;
    }, 2200);

    return () => {
      if (shareResetTimeoutRef.current !== null) {
        window.clearTimeout(shareResetTimeoutRef.current);
        shareResetTimeoutRef.current = null;
      }
    };
  }, [shareStatus]);

  useEffect(() => {
    if (!isFabMenuVisible) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (!fabStackRef.current?.contains(target)) {
        setIsFabMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsFabMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFabMenuVisible]);

  const seoMeta = useMemo(() => (
    post
      ? buildPostSeo(post, lang)
      : buildNotFoundSeo(
        'Post not found',
        'The requested article could not be found on Ade Says.',
        '/blog',
      )
  ), [lang, post]);

  if (!post) {
    return (
      <div className="not-found">
        <SeoHead meta={seoMeta} />
        <h1>Post not found</h1>
        <Link to="/blog" className="back-link">Return to blog</Link>
      </div>
    );
  }

  return (
    <>
      <SeoHead meta={seoMeta} />
      {post.meta.thumbnail && createPortal(
        <div
          className="post-banner"
          style={bannerStyle}
        />,
        document.body
      )}
      {createPortal(
        <div
          className={`article-share-stack${isAudioExpandedVisible ? ' is-hidden' : ''}`}
          data-lang={lang}
          ref={fabStackRef}
        >
          {!isAudioFabMode && (
            <div
              aria-hidden={!isFabMenuVisible}
              aria-label={articleActionsLabel}
              className={`article-share-menu${isFabMenuVisible ? ' is-open' : ''}`}
              data-open={isFabMenuVisible ? 'true' : 'false'}
              id={shareMenuId}
              role="menu"
            >
              {hasNarration && (
                <m3e-fab-menu-item
                  className="article-share-menu-item is-narration"
                  onClick={handleOpenAudio}
                  tabIndex={isFabMenuVisible ? 0 : -1}
                >
                  <span className="material-symbols-rounded" aria-hidden="true" slot="icon">headphones</span>
                  {audioMenuLabel}
                </m3e-fab-menu-item>
              )}
              <m3e-fab-menu-item
                aria-disabled={activeBookmarkWord === null ? 'true' : 'false'}
                className={`article-share-menu-item is-bookmark${activeBookmarkWord === null ? ' is-disabled' : ''}`}
                onClick={handleGoToBookmark}
                tabIndex={isFabMenuVisible && activeBookmarkWord !== null ? 0 : -1}
              >
                <span className="material-symbols-rounded" aria-hidden="true" slot="icon">bookmark</span>
                {bookmarkMenuLabel}
              </m3e-fab-menu-item>
              {canUseNativeShare && (
                <m3e-fab-menu-item
                  className="article-share-menu-item is-share"
                  onClick={handleNativeShare}
                  tabIndex={isFabMenuVisible ? 0 : -1}
                >
                  <span className="material-symbols-rounded" aria-hidden="true" slot="icon">ios_share</span>
                  {nativeShareLabel}
                </m3e-fab-menu-item>
              )}
              <m3e-fab-menu-item
                className="article-share-menu-item is-copy-link"
                onClick={handleCopyLink}
                tabIndex={isFabMenuVisible ? 0 : -1}
              >
                <span className="material-symbols-rounded" aria-hidden="true" slot="icon">link</span>
                {copyLinkLabel}
              </m3e-fab-menu-item>
            </div>
          )}
          {isAudioFabMode ? (
            <m3e-fab
              aria-label={audioFabAriaLabel}
              className="article-share-fab is-audio-mode"
              lowered
              onClick={handleOpenAudio}
              size="small"
              variant="surface"
            >
              <span className="material-symbols-rounded" aria-hidden="true">graphic_eq</span>
            </m3e-fab>
          ) : (
            <m3e-fab
              aria-controls={shareMenuId}
              aria-expanded={isFabMenuVisible ? 'true' : 'false'}
              aria-haspopup="menu"
              aria-label={isFabMenuVisible ? closeFabAriaLabel : shareFabAriaLabel}
              className={`article-share-fab ${shareStatus !== 'idle' ? `is-${shareStatus}` : ''}`}
              lowered
              onClick={handleToggleFabMenu}
              size="small"
              variant="surface"
            >
              <m3e-fab-menu-trigger>
                <span className="material-symbols-rounded" aria-hidden="true">
                  {shareStatus === 'copied' ? 'check' : shareStatus === 'error' ? 'error' : 'tune'}
                </span>
              </m3e-fab-menu-trigger>
            </m3e-fab>
          )}
        </div>,
        document.body
      )}
      <article className="post-view">
        <div className="article-toolbar">
          <Link to="/blog" className="back-link post-back-link">
            <span className="material-symbols-rounded">arrow_back</span>
            Back to Blog
          </Link>
          <div className="article-toolbar-actions">
            <div className="lang-switcher">
              <m3e-button variant={lang === 'en' ? 'filled' : 'tonal'} onClick={showEnglish}>EN</m3e-button>
              <m3e-button className="arabic-text" variant={lang === 'ar' ? 'filled' : 'tonal'} onClick={showArabic}>{'\u0639\u0631'}</m3e-button>
            </div>
          </div>
        </div>

        <header className="article-header" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          <h1 className="article-title">{lang === 'ar' && post.meta.titleAr ? post.meta.titleAr : post.meta.title}</h1>
          <div className="article-meta">
            <span>{post.meta.date}</span> {'\u2022'} <span>{post.meta.author}</span>
          </div>
          {post.meta.tags && post.meta.tags.length > 0 && (
            <div className="article-tags">
              {post.meta.tags.map((tag) => (
                <span key={tag} className="article-tag">{tag}</span>
              ))}
            </div>
          )}
          {(post.meta.excerpt || post.meta.excerptAr) && (
            <p className="article-excerpt">
              {lang === 'ar' && post.meta.excerptAr ? post.meta.excerptAr : post.meta.excerpt}
            </p>
          )}
        </header>

        <div className="article-content" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          <Suspense fallback={<PageLoading label="Loading article" />}>
            <ArticleRenderer
              bookmark={articleBookmark}
              content={activeContent}
              narration={articleNarration}
            />
          </Suspense>
        </div>
        {post.pages.length > 1 && (
          <nav className="article-page-nav" aria-label="Article pages">
            <span className="article-page-nav-label">Pages</span>
            <div className="article-page-nav-buttons">
              {post.pages.map((page, index) => (
                <button
                  className={`article-page-button ${index === selectedPageIndex ? 'is-active' : ''}`}
                  key={page.id}
                  onClick={() => handlePageSelect(index)}
                  type="button"
                >
                  {lang === 'ar' && page.labelAr ? page.labelAr : page.label}
                </button>
              ))}
            </div>
          </nav>
        )}
        <PostDiscussion
          lang={lang}
          postId={post.meta.id}
        />
      </article>
      <FloatingAudioPlayer
        expanded={isAudioExpandedVisible}
        key={narrationKey}
        lang={lang}
        onActiveWordChange={handleActiveNarrationWord}
        onExpandedChange={handleAudioExpandedChange}
        onPlayingChange={handleAudioPlayingChange}
        showLauncher={false}
        tracks={narrationTracks}
      />
    </>
  );
}

export default memo(PostView);
