import path from 'node:path';
import { promises as fs } from 'node:fs';

import { applySeoToHtml, buildSeoPages, loadPhotoCatalogs, loadPosts } from './lib/seo-shared.mjs';

const projectRoot = process.cwd();
const distRoot = path.join(projectRoot, 'dist');
const templateHtml = await fs.readFile(path.join(distRoot, 'index.html'), 'utf8');
const posts = await loadPosts(projectRoot);
const catalogs = await loadPhotoCatalogs(projectRoot);
const seoPages = buildSeoPages(posts, catalogs);

for (const page of seoPages) {
  const pageHtml = applySeoToHtml(templateHtml, page.seo);
  const outputPath = page.route === '/'
    ? path.join(distRoot, 'index.html')
    : path.join(distRoot, ...page.route.split('/').filter(Boolean), 'index.html');

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, pageHtml, 'utf8');
}
