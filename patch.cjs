const fs = require('fs');
let css = fs.readFileSync('src/index.css', 'utf-8');

css = css.replace(
  `--article-bookmark-plate-inset: -0.12em -0.22em -0.14em;`,
  `--article-bookmark-plate-inset: auto 0 -0.1em 0;`
);

css = css.replace(
  `--article-bookmark-plate-inset: -0.015em -0.14em -0.055em;`,
  `--article-bookmark-plate-inset: auto 0 -0.1em 0;`
);

css = css.replace(
  `inset: var(--article-bookmark-plate-inset);\n  z-index: -1;\n  border-radius: 7px;\n  background: var(--mag-accent-orange);\n  box-shadow:\n    inset 0 1px 0 rgba(255, 255, 255, 0.28),\n    inset 0 -1px 0 rgba(16, 15, 19, 0.16),\n    0 0 0 1px rgba(80, 42, 18, 0.34);`,
  `inset: var(--article-bookmark-plate-inset);\n  height: 3px;\n  z-index: -1;\n  border-radius: 2px;\n  background: var(--mag-accent-orange);`
);

css = css.replace(
  `.narration-word[data-bookmark-state="entering"],\n.narration-word[data-bookmark-state="active"] {\n  color: #100f13;\n}`,
  `.narration-word[data-bookmark-state="entering"],\n.narration-word[data-bookmark-state="active"] {\n  /* color: #100f13; */\n}`
);

fs.writeFileSync('src/index.css', css);
