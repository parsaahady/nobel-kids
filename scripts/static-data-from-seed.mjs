/**
 * static-data-from-seed.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Build the `.static-data/*.json` bundle straight from `database/seed.sql`,
 * with no database and no PHP API involved.
 *
 * WHY THIS EXISTS
 * Inside `docker build` there is no running API, so fetch-static-data.mjs
 * writes empty fallbacks. Next.js then fails hard, because
 * `generateStaticParams()` for /products/[slug] returns [] and `output:
 * 'export'` refuses to emit zero routes:
 *
 *     Error: Page "/products/[slug]" returned an empty array from
 *     "generateStaticParams()". With "output: export", at least one route
 *     must be generated.
 *
 * Parsing the shipped seed data gives the build the same 17 products the
 * database would have, so the image builds offline and the exported HTML
 * contains real content for search engines.
 *
 * This is a FALLBACK. When a live API is reachable, fetch-static-data.mjs
 * runs first and its (authoritative, possibly newer) output wins.
 *
 * Usage:
 *     node scripts/static-data-from-seed.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const SEED = path.join(root, 'database', 'seed.sql');
const OUT_DIR = path.join(root, '.static-data');

if (!existsSync(SEED)) {
  console.error(`✗ ${SEED} not found — cannot build fallback data.`);
  process.exit(1);
}

const sql = readFileSync(SEED, 'utf8');

/* ── tiny SQL-literal tokeniser ───────────────────────────────────────────────
 * Splits one VALUES row into fields, honouring '' escapes and nested parens
 * (the seed uses `(SELECT id FROM categories WHERE slug = 'girls')`).
 */
function splitRow(row) {
  const out = [];
  let buf = '';
  let depth = 0;
  let inStr = false;

  for (let i = 0; i < row.length; i += 1) {
    const c = row[i];

    if (inStr) {
      if (c === "'") {
        if (row[i + 1] === "'") { buf += "'"; i += 1; }
        else { inStr = false; }
      } else {
        buf += c;
      }
      continue;
    }

    if (c === "'") { inStr = true; continue; }
    if (c === '(') { depth += 1; buf += c; continue; }
    if (c === ')') { depth -= 1; buf += c; continue; }
    if (c === ',' && depth === 0) { out.push(buf.trim()); buf = ''; continue; }
    buf += c;
  }
  if (buf.trim() !== '') out.push(buf.trim());
  return out;
}

/** Extract the rows of one `INSERT INTO <table> ... VALUES ...;` statement. */
function rowsOf(table) {
  const re = new RegExp(`INSERT INTO ${table}\\b([\\s\\S]*?);\\s*(?:\\n|$)`, 'i');
  const m = sql.match(re);
  if (!m) return [];

  const body = m[1];
  const vIdx = body.search(/\bVALUES\b/i);
  if (vIdx === -1) return [];
  let valuesPart = body.slice(vIdx + 6);

  // Stop at ON DUPLICATE KEY UPDATE. Its `VALUES(col)` calls look exactly like
  // data rows to the paren-walker below and would be parsed as bogus records.
  const dupIdx = valuesPart.search(/\bON\s+DUPLICATE\s+KEY\s+UPDATE\b/i);
  if (dupIdx !== -1) valuesPart = valuesPart.slice(0, dupIdx);

  // Walk the top level, collecting each (...) group.
  const rows = [];
  let depth = 0;
  let start = -1;
  let inStr = false;

  for (let i = 0; i < valuesPart.length; i += 1) {
    const c = valuesPart[i];
    if (inStr) {
      if (c === "'") {
        if (valuesPart[i + 1] === "'") i += 1;
        else inStr = false;
      }
      continue;
    }
    if (c === "'") { inStr = true; continue; }
    if (c === '(') { if (depth === 0) start = i + 1; depth += 1; continue; }
    if (c === ')') {
      depth -= 1;
      if (depth === 0 && start !== -1) { rows.push(valuesPart.slice(start, i)); start = -1; }
    }
  }
  return rows.map(splitRow);
}

/**
 * `(SELECT id FROM products WHERE slug = 'x')` → `x`
 *
 * splitRow() has already stripped the surrounding quotes from string literals,
 * so by the time a subquery reaches here it reads
 *   (SELECT id FROM products WHERE slug = x)
 * Match the unquoted form first and keep the quoted one as a fallback for
 * callers that pass raw SQL.
 */
function slugFromSubquery(expr) {
  const s = String(expr ?? '');
  const quoted = s.match(/slug\s*=\s*'((?:[^']|'')*)'/i);
  if (quoted) return quoted[1].replace(/''/g, "'");
  const bare = s.match(/slug\s*=\s*([^)\s,]+)\s*\)?/i);
  return bare ? bare[1].trim() : null;
}

const nullish = (v) => v === undefined || v === null || /^null$/i.test(String(v).trim());
const num = (v) => (nullish(v) ? null : Number(String(v).trim()));
const str = (v) => (nullish(v) ? null : String(v));
const bool = (v) => String(v).trim() === '1';

/* ── categories ───────────────────────────────────────────────────────────── */
// (name, slug, description, is_active, sort_order, created_at, updated_at)
const categories = [];
rowsOf('categories').forEach((r, i) => {
  categories.push({
    id: String(i + 1),
    name: str(r[0]),
    slug: str(r[1]),
    description: str(r[2]),
    sortOrder: num(r[4]) ?? i,
    productCount: 0,
  });
});
const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));

/* ── products ─────────────────────────────────────────────────────────────── */
// (slug, name, short_name, description, short_description, sku, category_id,
//  price, compare_price, stock, pack_size, min_packs, status, featured,
//  is_new, is_best_seller, gender, material, collection, seo_title,
//  seo_description, tags, created_at, updated_at)
const products = [];
rowsOf('products').forEach((r, i) => {
  const catSlug = slugFromSubquery(r[6] ?? '');
  const cat = catSlug ? categoryBySlug.get(catSlug) : null;
  let tags = [];
  const rawTags = str(r[21]);
  if (rawTags) {
    try { tags = JSON.parse(rawTags); }
    catch { tags = rawTags.split(',').map((t) => t.trim()).filter(Boolean); }
  }
  products.push({
    id: String(i + 1),
    slug: str(r[0]),
    name: str(r[1]),
    shortName: str(r[2]),
    description: str(r[3]),
    shortDescription: str(r[4]),
    sku: str(r[5]),
    category: cat ? { id: cat.id, name: cat.name, slug: cat.slug } : null,
    price: num(r[7]),
    comparePrice: num(r[8]),
    stock: num(r[9]),
    packSize: num(r[10]),
    minPacks: num(r[11]),
    status: str(r[12]),
    featured: bool(r[13]),
    isNew: bool(r[14]),
    isBestSeller: bool(r[15]),
    gender: str(r[16]),
    material: str(r[17]),
    collection: str(r[18]),
    seoTitle: str(r[19]),
    seoDescription: str(r[20]),
    tags,
    colors: [],
    sizes: [],
    gallery: [],
    tiers: [],
    image: null,
  });
});
const bySlug = new Map(products.map((p) => [p.slug, p]));

if (products.length === 0) {
  console.error('✗ no products parsed from seed.sql — refusing to write empty data.');
  process.exit(1);
}

/* ── child tables ─────────────────────────────────────────────────────────── */
let idc = 0;

// product_images (product_id, url, alt, sort_order, is_primary)
rowsOf('product_images').forEach((r) => {
  const p = bySlug.get(slugFromSubquery(r[0] ?? ''));
  if (!p) return;
  idc += 1;
  const img = { id: String(idc), url: str(r[1]), alt: str(r[2]), sortOrder: num(r[3]) ?? 0, isPrimary: bool(r[4]) };
  p.gallery.push(img);
  if (img.isPrimary || !p.image) p.image = img.url;
});

// product_colors (product_id, name, hex, sort_order)
rowsOf('product_colors').forEach((r) => {
  const p = bySlug.get(slugFromSubquery(r[0] ?? ''));
  if (!p) return;
  idc += 1;
  p.colors.push({ id: String(idc), name: str(r[1]), hex: str(r[2]) });
});

// product_sizes (product_id, label, sort_order)
rowsOf('product_sizes').forEach((r) => {
  const p = bySlug.get(slugFromSubquery(r[0] ?? ''));
  if (!p) return;
  idc += 1;
  p.sizes.push({ id: String(idc), label: str(r[1]) });
});

// price_tiers (product_id, min_packs, discount_bps)
rowsOf('price_tiers').forEach((r) => {
  const p = bySlug.get(slugFromSubquery(r[0] ?? ''));
  if (!p) return;
  p.tiers.push({ minPacks: num(r[1]), discountBps: num(r[2]) });
});

for (const p of products) {
  p.gallery.sort((a, b) => a.sortOrder - b.sortOrder);
  p.tiers.sort((a, b) => a.minPacks - b.minPacks);
  if (!p.image && p.gallery[0]) p.image = p.gallery[0].url;
}

// category counts
for (const p of products) {
  if (!p.category) continue;
  const c = categoryBySlug.get(p.category.slug);
  if (c) c.productCount += 1;
}

/* ── shape the bundles exactly like the API responses ─────────────────────── */
const listItem = (p) => ({
  id: p.id,
  slug: p.slug,
  name: p.name,
  shortName: p.shortName,
  price: p.price,
  comparePrice: p.comparePrice,
  stock: p.stock,
  packSize: p.packSize,
  status: p.status,
  featured: p.featured,
  isNew: p.isNew,
  isBestSeller: p.isBestSeller,
  category: p.category,
  collection: p.collection,
  gender: p.gender,
  image: p.image,
  colors: p.colors,
  sizes: p.sizes,
  tiers: p.tiers,
});

const active = products.filter((p) => p.status === 'ACTIVE');
const list = active.map(listItem);

const home = {
  featured: list.filter((p) => p.featured).slice(0, 8),
  newest: (list.filter((p) => p.isNew).length ? list.filter((p) => p.isNew) : list).slice(0, 8),
  bestsellers: list.filter((p) => p.isBestSeller).slice(0, 8),
};

const sizeOptions = [...new Set(products.flatMap((p) => p.sizes.map((s) => s.label)))];
const collections = [...new Set(products.map((p) => p.collection).filter(Boolean))];

const catalog = {
  initial: { items: list, total: list.length, page: 1, pages: 1, pageSize: list.length || 1 },
  categories: categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug, productCount: c.productCount })),
  sizeOptions,
  collections,
};

const details = {};
for (const p of active) {
  const related = active
    .filter((o) => o.slug !== p.slug && o.category?.slug === p.category?.slug)
    .slice(0, 4)
    .map(listItem);
  details[p.slug] = { product: { ...p }, related };
}

// Shipping methods come from the settings table; a static export only needs
// them to render the checkout summary before login. Keep it empty and let the
// live API fill it in — checkout always re-quotes server-side anyway.
const shipping = { methods: [] };
const config = { gatewayEnabled: false, siteUrl: process.env.NEXT_PUBLIC_SITE_URL || '', packSize: products[0]?.packSize ?? 5 };

mkdirSync(OUT_DIR, { recursive: true });
const save = (name, data) => writeFileSync(path.join(OUT_DIR, `${name}.json`), JSON.stringify(data), 'utf8');

save('home', home);
save('catalog', catalog);
save('shipping', shipping);
save('products', details);
save('config', config);

console.log('\n▸ Static data rebuilt from database/seed.sql (offline fallback)\n');
console.log(`  ✓ products     ${Object.keys(details).length} detail pages`);
console.log(`  ✓ catalog      products=${list.length} categories=${categories.length} sizes=${sizeOptions.length}`);
console.log(`  ✓ home         featured=${home.featured.length} newest=${home.newest.length} bestsellers=${home.bestsellers.length}`);
console.log('\n  Note: prices and stock come from the seed file, not a live database.');
console.log('  Rebuild against a running API for up-to-date HTML (see docs/DOCKER.md).\n');
