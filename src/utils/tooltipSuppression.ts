const TOOLTIP_OVERLAY_SELECTORS = '[role="tooltip"], m3e-tooltip';
const SVG_TOOLTIP_TITLE_SELECTOR = 'svg title';

function removeTooltipArtifacts(root: Document | Element) {
  if (root instanceof Element) {
    if (root.hasAttribute('title')) {
      root.removeAttribute('title');
    }

    if (root.matches(TOOLTIP_OVERLAY_SELECTORS)) {
      root.remove();
      return;
    }

    if (root.localName === 'title' && root.closest('svg')) {
      root.remove();
      return;
    }
  }

  root.querySelectorAll('[title]').forEach((element) => {
    element.removeAttribute('title');
  });

  root.querySelectorAll(SVG_TOOLTIP_TITLE_SELECTOR).forEach((element) => {
    element.remove();
  });

  root.querySelectorAll(TOOLTIP_OVERLAY_SELECTORS).forEach((element) => {
    element.remove();
  });
}

function removeTooltipArtifactsFromNode(node: Node) {
  if (node instanceof Element) {
    removeTooltipArtifacts(node);
    return;
  }

  if (node instanceof DocumentFragment) {
    Array.from(node.children).forEach((child) => {
      removeTooltipArtifacts(child);
    });
  }
}

export function installTooltipSuppression(root: Document | Element = document) {
  removeTooltipArtifacts(root);

  const target = root instanceof Document ? root.documentElement : root;
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes') {
        removeTooltipArtifactsFromNode(mutation.target);
      }

      mutation.addedNodes.forEach((node) => {
        removeTooltipArtifactsFromNode(node);
      });
    }
  });

  observer.observe(target, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['title', 'role'],
  });

  return () => observer.disconnect();
}

export const tooltipSuppressionStyleText = `${TOOLTIP_OVERLAY_SELECTORS} { display: none !important; visibility: hidden !important; }`;

export function createTooltipSuppressionInlineScript() {
  return String.raw`(() => {
    const tooltipOverlaySelectors = ${JSON.stringify(TOOLTIP_OVERLAY_SELECTORS)};
    const svgTooltipTitleSelector = ${JSON.stringify(SVG_TOOLTIP_TITLE_SELECTOR)};

    const removeTooltipArtifacts = (root) => {
      if (!(root instanceof Element || root instanceof Document)) {
        return;
      }

      if (root instanceof Element) {
        if (root.hasAttribute('title')) {
          root.removeAttribute('title');
        }

        if (root.matches(tooltipOverlaySelectors)) {
          root.remove();
          return;
        }

        if (root.localName === 'title' && root.closest('svg')) {
          root.remove();
          return;
        }
      }

      root.querySelectorAll('[title]').forEach((element) => {
        element.removeAttribute('title');
      });

      root.querySelectorAll(svgTooltipTitleSelector).forEach((element) => {
        element.remove();
      });

      root.querySelectorAll(tooltipOverlaySelectors).forEach((element) => {
        element.remove();
      });
    };

    const removeTooltipArtifactsFromNode = (node) => {
      if (node instanceof Element) {
        removeTooltipArtifacts(node);
        return;
      }

      if (node instanceof DocumentFragment) {
        Array.from(node.children).forEach((child) => {
          removeTooltipArtifacts(child);
        });
      }
    };

    removeTooltipArtifacts(document);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes') {
          removeTooltipArtifactsFromNode(mutation.target);
        }

        mutation.addedNodes.forEach((node) => {
          removeTooltipArtifactsFromNode(node);
        });
      }
    });

    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['title', 'role'],
    });
  })();`;
}
