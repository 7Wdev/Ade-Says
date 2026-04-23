import { ensurePublicSeoAssets, loadPhotoCatalogs, loadPosts } from './lib/seo-shared.mjs';

const projectRoot = process.cwd();
const posts = await loadPosts(projectRoot);
const catalogs = await loadPhotoCatalogs(projectRoot);

await ensurePublicSeoAssets(projectRoot, posts, catalogs);
