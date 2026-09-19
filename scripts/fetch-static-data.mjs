/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Build-time data fetcher
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `next build` with `output: 'export'` runs on YOUR machine, not on the shared
 * host. It still needs real product data so the exported HTML is not empty:
 * good for SEO, and the first paint shows content before any JS runs.
 *
 * This script talks to the PHP API (local dev server or the live site) and
 * writes plain JSON into .static-data/. The page components read those files
 * synchronously at build time — no database driver in the frontend, no
 * secrets in the bundle.
 *
 * Usage:
 *   NEXT_PUBLIC_API_BASE=http://localhost:8080 node scripts/fetch-static-data.mjs
 *   NEXT_PUBLIC_API_BASE=https://nobelkids.ir  node scripts/fetch-static-data.mjs
 *
 * If the API is unreachable the script does NOT fail the build — it writes
 * empty fallbacks and warns. The site then hydrates entirely from the live API
 * in the browser, exactly like a normal SPA.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8080').replace(/\/+$/, '');
const OUT_DIR = path.join(process.cwd(), '.static-data');

const EMPTY_LIST = { items: [], total: 0, page: 1, pageSize: 8, pages: 0 };

/** Fetch one API envelope, returning `fallback` on any failure. */
async function get(endpoint, fallback) {
  const url = `${API_BASE}/api/${endpoint}`;
  try {
    const response = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) {
      console.warn(`  ⚠ ${endpoint} → HTTP ${response.status}, using fallback`);
      return fallback;
    }
    const body = await response.json();
    if (!body?.ok) {
      console.warn(`  ⚠ ${endpoint} → ${body?.error?.code ?? 'bad envelope'}, using fallback`);
      return fallback;
    }
    return body.data;
  } catch (error) {
    console.warn(`  ⚠ ${endpoint} → ${error.message}, using fallback`);
    return fallback;
  }
}

async function save(name, data) {
  await writeFile(path.join(OUT_DIR, `${name}.json`), JSON.stringify(data), 'utf8');
}

async function main() {
  console.log(`\n▸ Fetching static build data from ${API_BASE}\n`);
  await mkdir(OUT_DIR, { recursive: true });

  // ── Homepage strips ──────────────────────────────────────────────────────
  const home = await get('home/index.php', { featured: [], newest: [], bestsellers: [] });
  await save('home', home);
  console.log(`  ✓ home         featured=${home.featured.length} newest=${home.newest.length} bestsellers=${home.bestsellers.length}`);

  // ── Catalogue first page + facets ────────────────────────────────────────
  const catalog = await get('catalog/index.php', {
    initial: EMPTY_LIST, categories: [], sizeOptions: [], collections: [],
  });
  await save('catalog', catalog);
  console.log(`  ✓ catalog      products=${catalog.initial.total} categories=${catalog.categories.length} sizes=${catalog.sizeOptions.length}`);

  // ── Shipping methods (checkout needs them before the user logs in) ───────
  const shipping = await get('checkout/shipping.php', { methods: [] });
  await save('shipping', shipping);
  console.log(`  ✓ shipping     methods=${shipping.methods?.length ?? 0}`);

  // ── Every product detail page ────────────────────────────────────────────
  // One request per product: the export needs a static HTML file for each slug.
  const slugs = [];
  let page = 1;
  for (;;) {
    const listing = await get(`products/index.php?available=false&pageSize=60&page=${page}`, EMPTY_LIST);
    for (const product of listing.items ?? []) slugs.push(product.slug);
    if (!listing.pages || page >= listing.pages) break;
    page += 1;
  }

  const details = {};
  for (const slug of slugs) {
    const detail = await get(`products/detail.php?slug=${encodeURIComponent(slug)}`, null);
    if (detail?.product) details[slug] = detail;
  }
  await save('products', details);
  console.log(`  ✓ products     ${Object.keys(details).length} detail pages`);

  // ── Site config the export bakes in ──────────────────────────────────────
  const config = await get('site/index.php', { gatewayEnabled: false, siteUrl: '' });
  await save('config', config);
  console.log(`  ✓ config       gatewayEnabled=${config.gatewayEnabled}`);

  const ok = home.newest.length > 0 && Object.keys(details).length > 0;
  console.log(
    ok
      ? '\n▸ Static data ready.\n'
      : '\n▸ Static data written with EMPTY fallbacks — the site will still work,\n'
        + '  but exported HTML will be blank until JS loads. Check that the PHP API\n'
        + `  is reachable at ${API_BASE}/api/health.php\n`,
  );
}

main().catch((error) => {
  console.error('fetch-static-data failed:', error);
  process.exit(1);
});
