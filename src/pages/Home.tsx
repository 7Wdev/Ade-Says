import { lazy, memo, Suspense } from 'react';
import { Link } from 'react-router-dom';
import ViewportRender from '../components/ViewportRender';
import {
  allPostSummaries,
  pinnedPostSummaries,
  type PostSummary,
} from '../utils/postSummaries';

const DeveloperBioImage = lazy(() => import('../components/DeveloperBioImage'));

const editorialColors = ['mag-color-dark', 'mag-color-yellow', 'mag-color-green', 'mag-color-brown', 'mag-color-pink', 'mag-color-blue', 'mag-color-glass'];
const greetingLangByLanguage: Record<string, 'ar' | 'he'> = {
  Arabic: 'ar',
  Hebrew: 'he',
};
const greetings = [
  { text: 'Hello', language: 'English' },
  { text: 'مرحبا', language: 'Arabic' },
  { text: 'שלום', language: 'Hebrew' },
  { text: 'Hola', language: 'Spanish' },
  { text: 'नमस्ते', language: 'Hindi' },
  { text: '你好', language: 'Chinese' },
  { text: 'Bonjour', language: 'French' },
  { text: 'Olá', language: 'Portuguese' },
  { text: 'Привет', language: 'Russian' },
  { text: 'こんにちは', language: 'Japanese' },
  { text: 'Hallo', language: 'German' },
  { text: '안녕하세요', language: 'Korean' },
  { text: 'Jambo', language: 'Swahili' },
];
const greetingAriaLabel = greetings.map((greeting) => `${greeting.language}: ${greeting.text}`).join('. ');
const postIndexById = new Map(allPostSummaries.map((post, index) => [post.meta.id, index]));
const profileImageFallback = (
  <div className="profile-image-loader" role="status" aria-live="polite">
    <m3e-loading-indicator variant="contained" aria-label="Loading portrait" />
  </div>
);

type PinnedArticleCardModel = {
  colorClass: string;
  enterClass: string;
  isFeatured: boolean;
  layoutClass: string;
  post: PostSummary;
};

const pinnedArticleCards: PinnedArticleCardModel[] = pinnedPostSummaries.map((post, index) => {
  const isFeatured = index === 0 || index === 3;
  const originalIndex = postIndexById.get(post.meta.id) ?? index;

  return {
    colorClass: post.meta.thumbnail
      ? 'has-thumbnail'
      : editorialColors[originalIndex % editorialColors.length],
    enterClass: `home-enter-${Math.min(index + 3, 7)}`,
    isFeatured,
    layoutClass: isFeatured ? 'card-featured' : 'card-half',
    post,
  };
});

type BackgroundShapeProps = {
  className: string;
  src: string;
};

const BackgroundShape = memo(function BackgroundShape({ className, src }: BackgroundShapeProps) {
  return (
    <img
      src={src}
      className={`bg-shape ${className}`}
      alt=""
      aria-hidden="true"
      decoding="async"
    />
  );
});

const BackgroundShapes = memo(function BackgroundShapes() {
  return (
    <>
      <BackgroundShape src="/shape1.png" className="shape-1" />
      <BackgroundShape src="/shape3.png" className="shape-3" />
      <BackgroundShape src="/shape5.png" className="shape-5" />
      <BackgroundShape src="/shape6.png" className="shape-6" />
    </>
  );
});

const HeroSection = memo(function HeroSection() {
  return (
    <section className="hero-section home-enter home-enter-0">
      <div className="hero-text">
        <h1 className="hero-title greeting-title" aria-label={greetingAriaLabel}>
          <span className="greeting-stack" aria-hidden="true">
            {greetings.map((greeting) => (
              <span
                className="greeting-word"
                key={greeting.language}
                lang={greetingLangByLanguage[greeting.language]}
              >
                {greeting.text}
              </span>
            ))}
          </span>
        </h1>
        <p className="hero-subtitle">
          Welcome to my notebook. No neat boxes or rigid categories here—just a chaotic, beautiful mix of the things I love. From the elegance of a clean block of code and the complexities of physics, to the abstract beauty of math, all the way to economics, art, and life itself.
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
          A passionate software engineer, computing polymath, creative designer, and lifelong technology explorer. I&apos;ve been building systems, apps, and websites since the age of 11, ranging from responsive UIs and dynamic web applications to advanced desktop platforms and real-time systems.
        </p>
        <p>
          Over the years, I&apos;ve fused a deep love for low-level programming with a creative mindset to develop digital solutions that are as elegant as they are efficient. Currently pursuing my B.Sc. in Computer Science at the Technion &ndash; Israel Institute of Technology.
        </p>
        <div className="profile-socials">
          <Link to="/photography" className="photography-sign" aria-label="Open photography page">
            <span className="photo-sticker-deco deco-blue" aria-hidden="true" />
            <span className="photo-sticker-deco deco-green" aria-hidden="true" />
            <span className="photo-sticker-deco deco-pink" aria-hidden="true" />
            <span className="photo-sticker-deco deco-yellow" aria-hidden="true" />
            <span className="photo-sticker-camera" aria-hidden="true">
              <span className="camera-lens" />
              <span className="camera-flash" />
            </span>
            <span className="photography-sign-kicker">Tiny side quest</span>
            <span className="photography-sign-title">Did u know?</span>
            <span className="photography-sign-copy">I like photography!</span>
            <span className="material-symbols-rounded" aria-hidden="true">arrow_forward</span>
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
      </div>
      <div className="card-footer">
        <span>{post.meta.date}</span>
        <span className="material-symbols-rounded" aria-hidden="true">arrow_forward</span>
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
        <Link to="/blog" className="section-link">All articles</Link>
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
          <p>Add <code>pinned: true</code> to a markdown post to feature it here.</p>
        </div>
      )}
    </div>
  );
});

function Home() {
  return (
    <div className="home-container">
      <BackgroundShapes />
      <HeroSection />

      <div className="editorial-grid">
        <ProfileBlock />
        <PinnedArticles />
      </div>
    </div>
  );
}

export default memo(Home);
