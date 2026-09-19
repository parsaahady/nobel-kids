/**
 * Writes public/sitemap.xml and public/robots.txt from the data that
 * fetch-static-data.mjs already downloaded. Runs before `next build`, so the
 * files land in out/ as plain static assets — no Node needed in production.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (name, fallback) => {
  try { return JSON.parse(readFileSync(path.join(root, '.static-data', `${name}.json`), 'utf8')); }
  catch { return fallback; }
};

const config = read('config', {});
const baked = (config.siteUrl || '').replace(/\/+$/, '');
const usableBaked = baked && !/localhost|127\.0\.0\.1/.test(baked) ? baked : '';
const base = (process.env.NEXT_PUBLIC_SITE_URL || usableBaked || 'https://nobelkids.ir').replace(/\/+$/, '');
const products = read('products', {});
const catalog = read('catalog', { categories: [] });
const today = new Date().toISOString().slice(0, 10);

const urls = [
  { loc: base + '/', priority: '1.0', freq: 'daily' },
  { loc: base + '/products/', priority: '0.9', freq: 'daily' },
  { loc: base + '/contact/', priority: '0.4', freq: 'monthly' },
  ...catalog.categories.map((c) => ({
    loc: `${base}/products/?category=${encodeURIComponent(c.name)}`, priority: '0.7', freq: 'weekly',
  })),
  ...Object.keys(products).map((slug) => ({
    loc: `${base}/products/${slug}/`, priority: '0.8', freq: 'weekly',
  })),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${u.loc.replace(/&/g, '&amp;')}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.freq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;

const robots = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin
Disallow: /account
Disallow: /cart
Disallow: /checkout
Disallow: /rescue

Sitemap: ${base}/sitemap.xml
`;

mkdirSync(path.join(root, 'public'), { recursive: true });
writeFileSync(path.join(root, 'public', 'sitemap.xml'), xml, 'utf8');
writeFileSync(path.join(root, 'public', 'robots.txt'), robots, 'utf8');
console.log(`  ✓ sitemap.xml  ${urls.length} urls`);
console.log(`  ✓ robots.txt   base=${base}`);
