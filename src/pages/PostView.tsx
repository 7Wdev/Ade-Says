import {
  lazy,
  memo,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';
import '@m3e/web/chips';
import '@m3e/web/divider';
import '@m3e/web/fab';
import '@m3e/web/fab-menu';
import '@m3e/web/segmented-button';
import '@m3e/web/toc';
import { M3eSnackbar } from '@m3e/web/snackbar';

import FloatingAudioPlayer, { type NarrationTrackMap } from '../components/FloatingAudioPlayer';
import M3eRouterButton from '../components/M3eRouterButton';
import PageLoading from '../components/PageLoading';
import PostDiscussion from '../components/PostDiscussion';
import { allPosts } from '../utils/markdown';
import SeoHead from '../components/SeoHead';
import { buildNotFoundSeo, buildPostSeo } from '../utils/seo';
import SubscribeButton from '../components/SubscribeBanner';

const ArticleRenderer = lazy(() => import('../components/ArticleRenderer'));
const ARTICLE_BOOKMARK_STORAGE_KEY = 'ade-says:article-word-bookmarks:v1';

type ArticleBookmarkStore = Record<string, {
  updatedAt: number;
  wordIndex: number;
}>;

type M3eTocItemWithNode = HTMLElement & {
  node?: {
    element?: HTMLElement;
  };
};

type ArticleTocDragState = {
  currentTranslate: number;
  moved: boolean;
  pointerId: number;
  startOpen: boolean;
  startTime: number;
  startTranslate: number;
  startX: number;
  width: number;
};

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
  const [bookmarkGuideMode, setBookmarkGuideMode] = useState<'click' | 'tap'>('tap');
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [isTocHandleArmed, setIsTocHandleArmed] = useState(false);
  const shareResetTimeoutRef = useRef<number | null>(null);
  const shareStackRef = useRef<HTMLDivElement | null>(null);
  const tocDragRef = useRef<ArticleTocDragState | null>(null);
  const tocRef = useRef<HTMLElement | null>(null);
  const tocToggleSuppressedRef = useRef(false);

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

  useEffect(() => {
    const toc = tocRef.current;
    const tocRoot = toc?.shadowRoot;

    if (!tocRoot) {
      return undefined;
    }

    let syncFrame = 0;

    const syncLabels = () => {
      syncFrame = 0;

      tocRoot.querySelectorAll<M3eTocItemWithNode>('m3e-toc-item').forEach((item) => {
        const label = item.node?.element?.textContent?.replace(/\s+/g, ' ').trim();

        if (label && item.textContent !== label) {
          item.textContent = label;
        }
      });
    };

    const scheduleLabelSync = () => {
      if (!syncFrame) {
        syncFrame = window.requestAnimationFrame(syncLabels);
      }
    };

    const observer = new MutationObserver(scheduleLabelSync);
    observer.observe(tocRoot, { childList: true, subtree: true });
    scheduleLabelSync();

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(syncFrame);
    };
  }, [narrationKey]);

  const handleTocToggle = useCallback(() => {
    if (tocToggleSuppressedRef.current) {
      return;
    }

    if (isTocOpen) {
      setIsTocOpen(false);
      setIsTocHandleArmed(false);
      return;
    }

    if (!isTocHandleArmed) {
      setIsTocHandleArmed(true);
      return;
    }

    setIsTocHandleArmed(false);
    setIsTocOpen(true);
  }, [isTocHandleArmed, isTocOpen]);

  const handleFabMenuToggle = useCallback(() => {
    setIsFabMenuOpen((currentOpen) => !currentOpen);
  }, []);

  const handleTocPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    const drawer = event.currentTarget;
    const width = drawer.getBoundingClientRect().width;

    if (width <= 0) {
      return;
    }

    const startTranslate = isTocOpen ? 0 : (lang === 'ar' ? width : -width);
    tocDragRef.current = {
      currentTranslate: startTranslate,
      moved: false,
      pointerId: event.pointerId,
      startOpen: isTocOpen,
      startTime: performance.now(),
      startTranslate,
      startX: event.clientX,
      width,
    };

    drawer.classList.add('is-dragging');
  }, [isTocOpen, lang]);

  const handleTocPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const drag = tocDragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - drag.startX;
    const minTranslate = lang === 'ar' ? 0 : -drag.width;
    const maxTranslate = lang === 'ar' ? drag.width : 0;
    const nextTranslate = Math.min(
      maxTranslate,
      Math.max(minTranslate, drag.startTranslate + deltaX)
    );

    drag.currentTranslate = nextTranslate;

    if (!drag.moved && Math.abs(deltaX) > 4) {
      drag.moved = true;
      setIsTocHandleArmed(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    event.currentTarget.style.transform = `translate3d(${nextTranslate}px, 0, 0)`;
  }, [lang]);

  const finishTocDrag = useCallback((event: ReactPointerEvent<HTMLElement>, cancelled: boolean) => {
    const drag = tocDragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const drawer = event.currentTarget;
    const deltaX = event.clientX - drag.startX;
    const elapsed = performance.now() - drag.startTime;
    let nextOpen = drag.startOpen;

    if (!cancelled && drag.moved) {
      nextOpen = 1 - Math.abs(drag.currentTranslate) / drag.width >= 0.5;

      if (elapsed < 360 && Math.abs(deltaX) > 28) {
        nextOpen = lang === 'ar' ? deltaX < 0 : deltaX > 0;
      }
    }

    if (drawer.hasPointerCapture(event.pointerId)) {
      drawer.releasePointerCapture(event.pointerId);
    }

    tocDragRef.current = null;
    tocToggleSuppressedRef.current = drag.moved;
    setIsTocHandleArmed(false);
    setIsTocOpen(nextOpen);
    drawer.classList.remove('is-dragging');

    window.requestAnimationFrame(() => {
      drawer.style.removeProperty('transform');
      window.setTimeout(() => {
        tocToggleSuppressedRef.current = false;
      }, 0);
    });
  }, [lang]);
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
  const bookmarkGuideLabel = lang === 'ar'
    ? (bookmarkGuideMode === 'tap'
      ? '\u0627\u0636\u063a\u0637 \u062b\u0644\u0627\u062b \u0645\u0631\u0627\u062a \u0639\u0644\u0649 \u0643\u0644\u0645\u0629 \u0644\u0648\u0636\u0639 \u0639\u0644\u0627\u0645\u0629'
      : '\u0627\u0646\u0642\u0631 \u062b\u0644\u0627\u062b \u0645\u0631\u0627\u062a \u0639\u0644\u0649 \u0643\u0644\u0645\u0629 \u0644\u0648\u0636\u0639 \u0639\u0644\u0627\u0645\u0629')
    : (bookmarkGuideMode === 'tap'
      ? 'Triple-tap a word to bookmark'
      : 'Triple-click a word to bookmark');
  const bookmarkGuideDemoWord = lang === 'ar'
    ? '\u0643\u0644\u0645\u0629'
    : 'word';
  const copyLinkLabel = lang === 'ar' ? '\u0627\u0646\u0633\u062e \u0627\u0644\u0631\u0627\u0628\u0637' : 'Copy link';
  const nativeShareLabel = lang === 'ar' ? '\u0645\u0634\u0627\u0631\u0643\u0629 \u0645\u0628\u0627\u0634\u0631\u0629' : 'Share...';
  const shareUrl = typeof window === 'undefined' ? '' : window.location.href;

  const handleLanguageChange = useCallback((nextLang: 'en' | 'ar') => {
    setLang(nextLang);
    setIsFabMenuOpen(false);
    setIsTocOpen(false);
    setIsTocHandleArmed(false);

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
      M3eSnackbar.open(
        lang === 'ar' ? '\u062a\u0645 \u0646\u0633\u062e \u0627\u0644\u0631\u0627\u0628\u0637' : 'Link copied',
        { duration: 2200 },
      );
    } catch {
      setShareStatus('error');
      M3eSnackbar.open(
        lang === 'ar' ? '\u062a\u0639\u0630\u0651\u0631 \u0646\u0633\u062e \u0627\u0644\u0631\u0627\u0628\u0637' : 'Could not copy the link',
        true,
        { duration: 3600 },
      );
    }
  }, [lang, shareUrl]);
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
      M3eSnackbar.open(
        lang === 'ar' ? '\u062a\u0645\u0651\u062a \u0645\u0634\u0627\u0631\u0643\u0629 \u0627\u0644\u0645\u0642\u0627\u0644' : 'Article shared',
        { duration: 2200 },
      );
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      setShareStatus('error');
      M3eSnackbar.open(
        lang === 'ar' ? '\u062a\u0639\u0630\u0651\u0631\u062a \u0645\u0634\u0627\u0631\u0643\u0629 \u0627\u0644\u0645\u0642\u0627\u0644' : 'Could not share the article',
        true,
        { duration: 3600 },
      );
    }
  }, [lang, post, shareUrl]);
  const handleOpenAudio = useCallback(() => {
    setIsFabMenuOpen(false);
    setIsAudioExpanded(true);
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
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(pointer: coarse)');
    const updateBookmarkGuideMode = () => {
      const prefersTap = mediaQuery.matches || navigator.maxTouchPoints > 0;
      setBookmarkGuideMode(prefersTap ? 'tap' : 'click');
    };

    updateBookmarkGuideMode();
    mediaQuery.addEventListener?.('change', updateBookmarkGuideMode);

    return () => mediaQuery.removeEventListener?.('change', updateBookmarkGuideMode);
  }, []);

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
      return undefined;
    }

    const closeMenu = () => setIsFabMenuOpen(false);
    const handleOutsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !shareStackRef.current?.contains(event.target)) {
        closeMenu();
      }
    };
    const handleMenuKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu();
      }
    };

    document.addEventListener('pointerdown', handleOutsidePointer, true);
    document.addEventListener('keydown', handleMenuKeyDown);
    window.addEventListener('resize', closeMenu);

    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointer, true);
      document.removeEventListener('keydown', handleMenuKeyDown);
      window.removeEventListener('resize', closeMenu);
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
        <M3eRouterButton to="/blog" className="back-link" size="extra-small" variant="tonal">
          Return to blog
        </M3eRouterButton>
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
        <div className="article-floating-actions">
          <div
            className="article-bookmark-toast"
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
            key={post.meta.id}
            role="note"
          >
            <span aria-hidden="true" className="article-bookmark-toast-gesture">
              <span className="article-bookmark-toast-rings">
                <span className="article-bookmark-toast-ring" />
                <span className="article-bookmark-toast-ring" />
                <span className="article-bookmark-toast-ring" />
              </span>
              <m3e-icon
                aria-hidden="true"
                className="article-bookmark-toast-hand"
                filled
                name={bookmarkGuideMode === 'tap' ? 'touch_app' : 'mouse'}
                variant="rounded"
              />
            </span>
            <span className="article-bookmark-toast-label">{bookmarkGuideLabel}</span>
            <span aria-hidden="true" className="article-bookmark-toast-preview">
              <span className="article-bookmark-toast-word">{bookmarkGuideDemoWord}</span>
              <m3e-icon
                aria-hidden="true"
                className="article-bookmark-toast-icon"
                filled
                name="bookmark"
                variant="rounded"
              />
            </span>
          </div>
          <div
            className={`article-share-stack${isAudioExpandedVisible ? ' is-hidden' : ''}`}
            data-lang={lang}
            ref={shareStackRef}
          >
            {!isAudioFabMode && (
              <div
                aria-hidden={isFabMenuVisible ? undefined : 'true'}
                aria-label={articleActionsLabel}
                className={`article-share-menu${isFabMenuVisible ? ' is-open' : ''}`}
                id={shareMenuId}
                onClick={() => setIsFabMenuOpen(false)}
                role="menu"
              >
                {hasNarration && (
                  <m3e-fab-menu-item
                    className="article-share-menu-item is-narration"
                    onClick={handleOpenAudio}
                  >
                    <m3e-icon aria-hidden="true" filled name="headphones" slot="icon" variant="rounded" />
                    {audioMenuLabel}
                  </m3e-fab-menu-item>
                )}
                <SubscribeButton variant="fab-item" lang={lang as "en" | "ar"} />
                <m3e-fab-menu-item
                  aria-disabled={activeBookmarkWord === null ? 'true' : 'false'}
                  className={`article-share-menu-item is-bookmark${activeBookmarkWord === null ? ' is-disabled' : ''}`}
                  disabled={activeBookmarkWord === null}
                  onClick={handleGoToBookmark}
                >
                  <m3e-icon aria-hidden="true" filled name="bookmark" slot="icon" variant="rounded" />
                  {bookmarkMenuLabel}
                </m3e-fab-menu-item>
                {canUseNativeShare && (
                  <m3e-fab-menu-item
                    className="article-share-menu-item is-share"
                    onClick={handleNativeShare}
                  >
                    <m3e-icon aria-hidden="true" filled name="ios_share" slot="icon" variant="rounded" />
                    {nativeShareLabel}
                  </m3e-fab-menu-item>
                )}
                <m3e-fab-menu-item
                  className="article-share-menu-item is-copy-link"
                  onClick={handleCopyLink}
                >
                  <m3e-icon aria-hidden="true" filled name="link" slot="icon" variant="rounded" />
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
                variant="primary"
              >
                <m3e-icon aria-hidden="true" filled name="graphic_eq" variant="rounded" />
              </m3e-fab>
            ) : (
              <m3e-fab
                aria-controls={shareMenuId}
                aria-expanded={isFabMenuVisible ? 'true' : 'false'}
                aria-haspopup="menu"
                aria-label={isFabMenuVisible ? closeFabAriaLabel : shareFabAriaLabel}
                className={`article-share-fab ${shareStatus !== 'idle' ? `is-${shareStatus}` : ''}`}
                lowered
                onClick={handleFabMenuToggle}
                size="small"
                variant={shareStatus === 'error' ? 'tertiary' : 'primary'}
              >
                <m3e-icon
                  aria-hidden="true"
                  filled
                  name={shareStatus === 'copied'
                    ? 'check'
                    : shareStatus === 'error'
                      ? 'error'
                      : isFabMenuVisible
                        ? 'close'
                        : 'tune'}
                  variant="rounded"
                />
              </m3e-fab>
            )}
          </div>
        </div>,
        document.body
      )}
      {createPortal(
        <>
          <div
            aria-hidden="true"
            className={`article-toc-scrim${isTocOpen ? ' is-open' : ''}`}
            onPointerDown={() => {
              setIsTocOpen(false);
              setIsTocHandleArmed(false);
            }}
          />
          <aside
            aria-label={lang === 'ar' ? 'جدول محتويات المقال' : 'Article table of contents'}
            className={`article-toc-rail${isTocOpen ? ' is-open' : ''}`}
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
            onPointerCancel={(event) => finishTocDrag(event, true)}
            onPointerDown={handleTocPointerDown}
            onPointerMove={handleTocPointerMove}
            onPointerUp={(event) => finishTocDrag(event, false)}
          >
            <div className={`article-toc-toggle-shell${isTocHandleArmed ? ' is-armed' : ''}`}>
              <m3e-icon-button
                aria-controls="article-toc-navigation"
                aria-expanded={isTocOpen ? 'true' : 'false'}
                aria-label={isTocOpen
                  ? 'Close table of contents'
                  : isTocHandleArmed
                    ? 'Open table of contents'
                    : 'Pull out table of contents handle'}
                className="article-toc-toggle"
                onClick={handleTocToggle}
                size="small"
                variant="tonal"
              >
                <m3e-icon
                  aria-hidden="true"
                  filled
                  name={lang === 'ar'
                    ? (isTocOpen ? 'chevron_right' : 'chevron_left')
                    : (isTocOpen ? 'chevron_left' : 'chevron_right')}
                  variant="rounded"
                />
              </m3e-icon-button>
            </div>
            <m3e-toc
              aria-label={lang === 'ar' ? 'جدول محتويات المقال' : 'Article table of contents'}
              className="article-toc"
              for="article-page-content"
              id="article-toc-navigation"
              key={`toc:${narrationKey}`}
              max-depth={3}
              onClick={() => {
                setIsTocOpen(false);
                setIsTocHandleArmed(false);
              }}
              ref={tocRef}
            >
              <span slot="overline">{lang === 'ar' ? 'في هذه الصفحة' : 'On this page'}</span>
              <span slot="title">{lang === 'ar' ? 'المحتويات' : 'Contents'}</span>
            </m3e-toc>
          </aside>
        </>,
        document.body
      )}
      <article className="post-view">
        <div className="article-toolbar">
          <M3eRouterButton to="/blog" className="back-link post-back-link" size="extra-small" variant="filled">
            <m3e-icon filled name="arrow_back" slot="icon" variant="rounded" />
            Back to Blog
          </M3eRouterButton>
          <div className="article-toolbar-actions">
            <m3e-segmented-button aria-label="Article language" className="lang-switcher">
              <m3e-button-segment checked={lang === 'en'} onClick={showEnglish} value="en">EN</m3e-button-segment>
              <m3e-button-segment checked={lang === 'ar'} className="arabic-text" onClick={showArabic} value="ar">{'\u0639\u0631'}</m3e-button-segment>
            </m3e-segmented-button>
          </div>
        </div>

        <header className="article-header" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          <h1 className="article-title">{lang === 'ar' && post.meta.titleAr ? post.meta.titleAr : post.meta.title}</h1>
          <div className="article-meta">
            <span>{post.meta.date}</span> {'\u2022'} <span>{post.meta.author}</span>
          </div>
          {post.meta.tags && post.meta.tags.length > 0 && (
            <m3e-chip-set aria-label="Article tags" className="article-tags">
              {post.meta.tags.map((tag) => (
                <m3e-chip key={tag} variant="outlined">{tag}</m3e-chip>
              ))}
            </m3e-chip-set>
          )}
          {(post.meta.excerpt || post.meta.excerptAr) && (
            <p className="article-excerpt">
              {lang === 'ar' && post.meta.excerptAr ? post.meta.excerptAr : post.meta.excerpt}
            </p>
          )}
          <m3e-divider className="article-header-divider" />
        </header>

        <div className="article-reading-layout" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          <div className="article-content" dir={lang === 'ar' ? 'rtl' : 'ltr'} id="article-page-content">
            <Suspense fallback={<PageLoading label="Loading article" />}>
              <ArticleRenderer
                bookmark={articleBookmark}
                content={activeContent}
                narration={articleNarration}
              />
            </Suspense>
          </div>
        </div>
        {post.pages.length > 1 && (
          <>
            <m3e-divider className="article-page-divider" />
            <nav className="article-page-nav" aria-label="Article pages">
              <span className="article-page-nav-label">Pages</span>
              <div className="article-page-nav-buttons">
                {post.pages.map((page, index) => (
                  <m3e-button
                    aria-current={index === selectedPageIndex ? 'page' : undefined}
                    key={page.id}
                    onClick={() => handlePageSelect(index)}
                    selected={index === selectedPageIndex}
                    shape="square"
                    size="extra-small"
                    toggle
                    type="button"
                    variant="tonal"
                  >
                    {lang === 'ar' && page.labelAr ? page.labelAr : page.label}
                  </m3e-button>
                ))}
              </div>
            </nav>
          </>
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
