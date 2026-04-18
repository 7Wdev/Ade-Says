import { lazy, memo, Suspense, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ArticleCardMetadata from "../components/ArticleCardMetadata";
import ViewportRender from "../components/ViewportRender";
import {
  allPostSummaries,
  pinnedPostSummaries,
  type PostSummary,
} from "../utils/postSummaries";

const DeveloperBioImage = lazy(() => import("../components/DeveloperBioImage"));
const PixelBlast = lazy(() => import("../components/PixelBlast"));

const editorialColors = [
  "mag-color-dark",
  "mag-color-yellow",
  "mag-color-green",
  "mag-color-brown",
  "mag-color-pink",
  "mag-color-blue",
  "mag-color-glass",
];
const greetingLangByLanguage: Record<string, "ar" | "he"> = {
  Arabic: "ar",
  Hebrew: "he",
};
const greetings = [
  { text: "Hello", language: "English" },
  { text: "مرحبا", language: "Arabic" },
  { text: "שלום", language: "Hebrew" },
  { text: "Hola", language: "Spanish" },
  { text: "नमस्ते", language: "Hindi" },
  { text: "你好", language: "Chinese" },
  { text: "Bonjour", language: "French" },
  { text: "Olá", language: "Portuguese" },
  { text: "Привет", language: "Russian" },
  { text: "こんにちは", language: "Japanese" },
  { text: "Hallo", language: "German" },
  { text: "안녕하세요", language: "Korean" },
  { text: "Jambo", language: "Swahili" },
];
const GREETING_INTERVAL_MS = 2000;
const greetingAriaLabel = greetings
  .map((greeting) => `${greeting.language}: ${greeting.text}`)
  .join(". ");
const postIndexById = new Map(
  allPostSummaries.map((post, index) => [post.meta.id, index]),
);
const profileImageFallback = (
  <div className="profile-image-loader" role="status" aria-live="polite">
    <m3e-loading-indicator variant="contained" aria-label="Loading portrait" />
  </div>
);
const backgroundFallback = (
  <div
    className="pixel-blast-container home-pixel-background"
    aria-hidden="true"
  />
);

type PinnedArticleCardModel = {
  colorClass: string;
  enterClass: string;
  isFeatured: boolean;
  layoutClass: string;
  post: PostSummary;
};

const pinnedArticleCards: PinnedArticleCardModel[] = pinnedPostSummaries.map(
  (post, index) => {
    const isFeatured = index === 0 || index === 3;
    const originalIndex = postIndexById.get(post.meta.id) ?? index;

    return {
      colorClass: post.meta.thumbnail
        ? "has-thumbnail"
        : editorialColors[originalIndex % editorialColors.length],
      enterClass: `home-enter-${Math.min(index + 3, 7)}`,
      isFeatured,
      layoutClass: isFeatured ? "card-featured" : "card-half",
      post,
    };
  },
);

const HomeBackground = memo(function HomeBackground() {
  return (
    <Suspense fallback={backgroundFallback}>
      <PixelBlast
        className="home-pixel-background"
        color="#B497CF"
        edgeFade={0.25}
        enableRipples
        patternDensity={1}
        patternScale={2}
        pixelSize={4}
        pixelSizeJitter={0}
        rippleIntensityScale={1.5}
        rippleSpeed={0.4}
        rippleThickness={0.12}
        speed={0.5}
        transparent
        variant="square"
      />
    </Suspense>
  );
});

const HeroSection = memo(function HeroSection() {
  const [activeGreetingIndex, setActiveGreetingIndex] = useState(0);
  const activeGreeting = greetings[activeGreetingIndex];

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setActiveGreetingIndex(
        (currentIndex) => (currentIndex + 1) % greetings.length,
      );
    }, GREETING_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <section className="hero-section home-enter home-enter-0">
      <div className="hero-text">
        <h1
          className="hero-title greeting-title"
          aria-label={greetingAriaLabel}
        >
          <span className="greeting-stack" aria-hidden="true">
            <span className="greeting-measurer" aria-hidden="true">
              {greetings.map((greeting) => (
                <span
                  className="greeting-measure-word"
                  key={greeting.language}
                  lang={greetingLangByLanguage[greeting.language]}
                >
                  {greeting.text}
                </span>
              ))}
            </span>
            <span
              className="greeting-word"
              key={activeGreeting.language}
              lang={greetingLangByLanguage[activeGreeting.language]}
            >
              {activeGreeting.text}
            </span>
          </span>
        </h1>
        <p className="hero-subtitle">
          Welcome to my notebook. No neat boxes or rigid categories here—just a
          chaotic, beautiful mix of the things I love. From the elegance of a
          clean block of code and the complexities of physics, to the abstract
          beauty of math, all the way to economics, art, and life itself.
        </p>
      </div>
    </section>
  );
});

const DeferredProfileImage = memo(function DeferredProfileImage() {
  return (
    <ViewportRender
      className="profile-image-viewport"
      initialRender={false}
      minHeight={280}
      placeholder={profileImageFallback}
      rootMargin="900px 0px"
      unmountWhenOutside={false}
    >
      <Suspense fallback={profileImageFallback}>
        <DeveloperBioImage />
      </Suspense>
    </ViewportRender>
  );
});

const ProfileBlock = memo(function ProfileBlock() {
  return (
    <div className="profile-block glass-panel home-enter home-enter-1">
      <div className="profile-image-container">
        <DeferredProfileImage />
      </div>
      <div className="profile-info">
        <h2>Ade Issawe</h2>
        <p>
          A passionate software engineer, computing polymath, creative designer,
          and lifelong technology explorer. I&apos;ve been building systems,
          apps, and websites since the age of 11, ranging from responsive UIs
          and dynamic web applications to advanced desktop platforms and
          real-time systems.
        </p>
        <p>
          Over the years, I&apos;ve fused a deep love for low-level programming
          with a creative mindset to develop digital solutions that are as
          elegant as they are efficient. Currently pursuing my B.Sc. in Computer
          Science at the Technion &ndash; Institute of Technology.
        </p>
        <div className="developer-links">
          <a href="https://www.instagram.com/adeissawe/" target="_blank" rel="noopener noreferrer" className="developer-link" aria-label="Instagram">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
              <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line>
            </svg>
          </a>
          <a href="https://github.com/7Wdev" target="_blank" rel="noopener noreferrer" className="developer-link" aria-label="GitHub">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"></path>
            </svg>
          </a>
          <a href="https://www.youtube.com/@AdeTheCoder" target="_blank" rel="noopener noreferrer" className="developer-link" aria-label="YouTube">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path>
              <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon>
            </svg>
          </a>
        </div>
        <div className="profile-socials">
          <Link
            to="/photography"
            className="photography-sign"
            aria-label="Open photography page"
          >
            <span className="photo-sticker-deco deco-blue" aria-hidden="true" />
            <span
              className="photo-sticker-deco deco-green"
              aria-hidden="true"
            />
            <span className="photo-sticker-deco deco-pink" aria-hidden="true" />
            <span
              className="photo-sticker-deco deco-yellow"
              aria-hidden="true"
            />
            <span className="photo-sticker-camera" aria-hidden="true">
              <span className="camera-lens" />
              <span className="camera-flash" />
            </span>
            <span className="photography-sign-kicker">Tiny side quest</span>
            <span className="photography-sign-title">Did u know?</span>
            <span className="photography-sign-copy">I like photography!</span>
            <span className="material-symbols-rounded" aria-hidden="true">
              arrow_forward
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
});

const PinnedArticleCard = memo(function PinnedArticleCard({
  colorClass,
  enterClass,
  isFeatured,
  layoutClass,
  post,
}: PinnedArticleCardModel) {
  return (
    <Link
      to={`/post/${post.meta.id}`}
      className={`editorial-card ${layoutClass} ${colorClass} home-enter ${enterClass}`}
    >
      {post.meta.thumbnail && (
        <img
          src={post.meta.thumbnail}
          className="card-thumbnail"
          alt=""
          loading="lazy"
          decoding="async"
        />
      )}
      <div className="post-card-content">
        <span className="card-cat">Pinned</span>
        <h3>{post.meta.title}</h3>
        {isFeatured && <p>{post.meta.excerpt}</p>}
        <ArticleCardMetadata
          isListenable={post.isListenable}
          pageCount={post.pageCount}
        />
      </div>
      <div className="card-footer">
        <span>{post.meta.date}</span>
        <span className="material-symbols-rounded" aria-hidden="true">
          arrow_forward
        </span>
      </div>
    </Link>
  );
});

const PinnedArticles = memo(function PinnedArticles() {
  return (
    <div className="articles-wrapper" id="hot">
      <div className="section-heading-row home-enter home-enter-2">
        <div>
          <span className="page-kicker">Pinned</span>
          <h2>Hot Articles</h2>
        </div>
        <Link to="/blog" className="section-link">
          All articles
        </Link>
      </div>

      {pinnedArticleCards.length > 0 ? (
        <div className="bento-grid">
          {pinnedArticleCards.map((card) => (
            <PinnedArticleCard
              key={card.post.meta.id}
              colorClass={card.colorClass}
              enterClass={card.enterClass}
              isFeatured={card.isFeatured}
              layoutClass={card.layoutClass}
              post={card.post}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>No hot articles pinned yet</h2>
          <p>
            Add <code>pinned: true</code> to a markdown post to feature it here.
          </p>
        </div>
      )}
    </div>
  );
});

function Home() {
  return (
    <div className="home-container">
      <HomeBackground />
      <HeroSection />

      <div className="editorial-grid">
        <ProfileBlock />
        <PinnedArticles />
      </div>
    </div>
  );
}

export default memo(Home);
