import { memo, useEffect, useId, useRef, useState } from "react";

type PostDiscussionProps = {
  lang: "en" | "ar";
  postId: string;
};

const GISCUS_SRC = "https://giscus.app/client.js";
const GISCUS_CONFIG = {
  category: "General",
  categoryId: "DIC_kwDOSEZEs84C7iup",
  emitMetadata: "0",
  inputPosition: "top",
  loading: "lazy",
  mapping: "pathname",
  reactionsEnabled: "1",
  repo: "7Wdev/Ade-Says",
  repoId: "R_kgDOSEZEsw",
  strict: "1",
  theme: "catppuccin_mocha",
} as const;

function PostDiscussion({ lang, postId }: PostDiscussionProps) {
  const headingId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [shouldLoad, setShouldLoad] = useState(
    () => typeof window !== "undefined" && !("IntersectionObserver" in window),
  );
  const sectionTitle =
    lang === "ar"
      ? "\u0627\u0644\u062a\u0639\u0644\u064a\u0642\u0627\u062a \u0648\u0627\u0644\u062a\u0641\u0627\u0639\u0644\u0627\u062a"
      : "Comments & Reactions";
  const sectionNote =
    lang === "ar"
      ? "\u0633\u062c\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0628\u062d\u0633\u0627\u0628 GitHub \u0644\u0644\u062a\u0639\u0644\u064a\u0642 \u0623\u0648 \u0627\u0644\u062a\u0641\u0627\u0639\u0644."
      : "Sign in with GitHub to leave a comment or react.";

  useEffect(() => {
    if (shouldLoad) {
      return;
    }

    const container = containerRef.current;

    if (!container) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "640px 0px",
      },
    );

    observer.observe(container);

    return () => observer.disconnect();
  }, [shouldLoad]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container || !shouldLoad) {
      return;
    }

    container.innerHTML = "";

    const script = document.createElement("script");
    script.src = GISCUS_SRC;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.setAttribute("data-repo", GISCUS_CONFIG.repo);
    script.setAttribute("data-repo-id", GISCUS_CONFIG.repoId);
    script.setAttribute("data-category", GISCUS_CONFIG.category);
    script.setAttribute("data-category-id", GISCUS_CONFIG.categoryId);
    script.setAttribute("data-mapping", GISCUS_CONFIG.mapping);
    script.setAttribute("data-strict", GISCUS_CONFIG.strict);
    script.setAttribute(
      "data-reactions-enabled",
      GISCUS_CONFIG.reactionsEnabled,
    );
    script.setAttribute("data-emit-metadata", GISCUS_CONFIG.emitMetadata);
    script.setAttribute("data-input-position", GISCUS_CONFIG.inputPosition);
    script.setAttribute("data-theme", GISCUS_CONFIG.theme);
    script.setAttribute("data-lang", lang);
    script.setAttribute("data-loading", GISCUS_CONFIG.loading);

    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [lang, postId, shouldLoad]);

  return (
    <section className="post-discussion-shell" aria-labelledby={headingId}>
      <div
        className="post-discussion-header"
        dir={lang === "ar" ? "rtl" : "ltr"}
      >
        <h2 className="post-discussion-title" id={headingId}>
          {sectionTitle}
        </h2>
        <p className="post-discussion-note">{sectionNote}</p>
      </div>
      <div
        className="giscus post-discussion-embed"
        data-post-id={postId}
        ref={containerRef}
      />
    </section>
  );
}

export default memo(PostDiscussion);
