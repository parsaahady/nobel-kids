# Migration: Next.js + Prisma + PostgreSQL → Static Next.js + PHP/MySQL

What changed, why, and what stayed exactly the same.

---

## 1. The problem

The original application needed a **running Node.js process**:

| Requirement | Why it existed |
|---|---|
| Node 20 server | `output: 'standalone'`, all pages `force-dynamic` |
| PostgreSQL | Prisma datasource |
| Prisma engine | native binary + generated client |
| Docker | `Dockerfile` + `docker-compose.yml` |
| Shell access | `prisma migrate deploy`, process manager |

DirectAdmin shared hosting provides **Apache + PHP + MySQL**, FTP and phpMyAdmin. No Node, no Postgres, no SSH, no Docker. Every one of those requirements had to go.

> Docker is still available as an **optional** path for local development and VPS self-hosting, but it was rebuilt around PHP + Apache + MySQL so it mirrors shared hosting rather than replacing it. Production on DirectAdmin never touches it. See `docs/DOCKER.md`.

## 2. The approach

Split the app along the line it already had — **rendering** vs **data**.

```
BEFORE                                  AFTER

┌───────────────────────────┐          ┌──────────────────────────┐
│  Node.js (always running) │          │ Apache (shared hosting)  │
│                           │          │                          │
│  Next.js SSR              │          │  out/  static HTML/CSS/JS│
│    ↓                      │          │    ↓  fetch()            │
│  app/api/*/route.ts       │   ───▶   │  api/**.php              │
│    ↓                      │          │    ↓  PDO                │
│  server/services/*.ts     │          │  MySQL                   │
│    ↓ Prisma               │          │                          │
│  PostgreSQL               │          └──────────────────────────┘
└───────────────────────────┘
```

The React components were **not rewritten**. They already fetched from `/api/...` through `lib/api-client.ts`; only the thing answering those calls changed.

## 3. What was removed

| Removed | Replaced by |
|---|---|
| `app/api/**/route.ts` (44 routes) | `api/**.php` (48 endpoints) |
| `server/services/*.ts` | `api/lib/*.php` |
| `server/auth/*`, `server/db.ts`, `server/env.ts` | `api/lib/auth.php`, `api/config/database.php`, `api/config/app.php` |
| `prisma/` (schema, migrations, seed) | `database/schema.sql`, `database/seed.sql` |
| `Dockerfile`, `docker-compose.yml`, `docker-entrypoint.sh` (Node + Postgres) | rewritten for PHP + Apache + MySQL — optional, see `docs/DOCKER.md` |
| `app/uploads/[[...path]]/route.ts` | Apache serves `/uploads` directly |
| `app/sitemap.ts`, `app/robots.ts` | `scripts/generate-sitemap.mjs` → static files |
| `tests/` (Prisma-bound integration tests) | manual + curl suite, see `docs/TESTING.md` |

Full list: `database/removed-legacy-files.txt`.

### Dependencies dropped

`@prisma/client`, `prisma`, `pg`, `bcryptjs`, `@types/bcryptjs`, `jose`, `zod`, `@aws-sdk/client-s3`, `sharp`, `tsx`, `ts-prune`, `vitest`, `@vitest/coverage-v8` — **133 packages removed**.

Their PHP equivalents are all built in: PDO, `password_hash()`, `hash_hmac()`, `getimagesize()`, `finfo`.

### Dependencies kept

`next`, `react`, `react-dom`, **`framer-motion`**, **`lucide-react`**, **`tailwindcss`**, `@fontsource/vazirmatn`, `postcss`, `autoprefixer`, `typescript`.

No UI library was swapped. Tailwind and Framer Motion are untouched.

## 4. What was added

| Path | Purpose |
|---|---|
| `database/schema.sql` | 24 tables + 5 compatibility views, InnoDB/utf8mb4 |
| `database/seed.sql` | idempotent catalogue import (17 products, 156 variants) |
| `api/config/*.php` | config loader, PDO factory, JSON envelope, security primitives |
| `api/lib/*.php` | business logic, ported service by service |
| `api/**/*.php` | 48 endpoints |
| `api/cron/expire-orders.php` | stock release for abandoned payments |
| `config/config.example.php` | template; real `config.php` is git-ignored |
| `rescue/index.php` | emergency password reset + health check |
| `lib/api-routes.ts` | REST path → PHP file translation |
| `lib/static-data.ts` | reads build-time JSON |
| `scripts/fetch-static-data.mjs` | pulls data from the API before the build |
| `scripts/generate-sitemap.mjs` | static `sitemap.xml` / `robots.txt` |
| `scripts/package-release.mjs` | assembles `release/` |
| `.htaccess` × 8 | routing, security headers, upload lockdown |

## 5. Database port: PostgreSQL → MySQL

| Postgres / Prisma | MySQL |
|---|---|
| `text` | `VARCHAR(n)` with explicit lengths (index limits) |
| `@id @default(cuid())` | `BIGINT UNSIGNED AUTO_INCREMENT` |
| `enum` types | `ENUM(...)` columns |
| `Json` | `JSON` |
| `timestamptz` | `DATETIME` (app is single-timezone) |
| `@@index` | `INDEX` in `CREATE TABLE` |
| Prisma relations | real `FOREIGN KEY` with explicit `ON DELETE` |
| `ILIKE` | `LIKE` on a `utf8mb4_unicode_ci` column (already case-insensitive) |

**IDs are serialized as strings** in JSON so JavaScript's 53-bit integer limit can never corrupt one.

**Five views** (`admins`, `customers`, `inventory`, `quotations`, `quotation_items`) preserve the reporting shapes the old Prisma queries produced.

## 6. Business logic parity

`lib/pricing.ts` was ported to `api/lib/pricing.php` **line by line** and checked against 149 generated cases — all identical.

| Rule | Status |
|---|---|
| Pack size 5, multiples of 5 | preserved |
| Tier discounts (3 packs → 4%, 6 → 8%) | preserved |
| `round_money` to nearest 1,000 Toman | preserved |
| Assorted vs single-size packs | preserved |
| Coupons (PERCENT with cap, FIXED, min order) | preserved |
| Quotation (`NBLQ-…`) vs order (`NBL-…`) numbering | preserved |
| Wishlist, cart merge on login | preserved |
| Order status machine | preserved |
| Inventory logs (`SALE`/`RETURN`/`RESTOCK`) | preserved |

**Nothing is trusted from the browser.** Prices, discounts, stock and totals are recomputed from live database rows inside a transaction at checkout.

## 7. Frontend changes

The rule was: *change the minimum needed to talk to PHP, change nothing that affects appearance.*

| File | Change | Visual impact |
|---|---|---|
| `next.config.mjs` | `output: 'standalone'` → `'export'`, `images.unoptimized` | none — images were already WebP |
| `app/page.tsx` | `homeSections()` → `staticHomeSections()` | none |
| `app/products/page.tsx` | server fetch → baked data | none |
| `app/products/[slug]/page.tsx` | added `generateStaticParams()` | none |
| `app/account/page.tsx` | server session check → `AccountGate` | none |
| `app/checkout/page.tsx` | server session check → `CheckoutGate` | none |
| `app/admin/page.tsx` | server session check → `AdminGate` | none |
| `app/admin/login/page.tsx` | `searchParams` → `useSearchParams` | none |
| `app/checkout/result/page.tsx` | split into a client body | none |
| `lib/api-client.ts` | routes through `resolveApiPath()` | none |
| `app/globals.css` | **appended** `.admin-boot` loading state | new state only |
| `components/admin/ProductForm.tsx` | dropped `image/avif` from `accept` | none |
| `types/index.ts` | exported `ShippingMethod` | none |

**Not touched:** `Hero`, `ProductCard`, `ProductCatalog`, `ProductDetailClient`, `CartClient`, `ContactClient`, `AccountClient`, `AdminPanel` and every other presentational component; `tailwind.config.ts`; all existing CSS.

### The auth-gate pattern

`getSessionUser()` ran on the server and branched. A static host has no request context, so the branch moved into the browser:

```tsx
// before (server component)
const user = await getSessionUser();
if (!user) redirect('/account?next=/checkout');

// after (client gate)
const { user } = useStore();          // StoreProvider already calls /api/auth/me
useEffect(() => {
  if (checked && !user) router.replace('/account?next=/checkout');
}, [checked, user]);
```

**This is not a security downgrade.** It never was the security boundary — it only decided what to render. Authorisation has always lived server-side, and still does: every `/api/admin/*` call validates `nbl_admin_session` against the `sessions` table and re-reads the role from the database. Someone who edits the JavaScript to force the admin panel open sees an empty shell and gets `401`/`403` on every request.

### URL translation

Components still use readable REST paths. `lib/api-routes.ts` maps them:

| Component writes | Apache serves |
|---|---|
| `/api/products` | `/api/products/index.php` |
| `/api/products/blue-hoodie` | `/api/products/detail.php?slug=blue-hoodie` |
| `/api/cart/items/12` | `/api/cart/item.php?id=12` |
| `/api/admin/products/42/stock` | `/api/admin/product-stock.php?id=42` |

One file to audit instead of ~50 edited call sites.

## 8. The static-export problem — and how it was solved

Static export means no server-side data fetching. Three things needed answers.

**Product pages.** `scripts/fetch-static-data.mjs` calls the PHP API at build time and writes `.static-data/*.json`; `generateStaticParams()` emits one HTML file per slug. Exported HTML contains real Persian names and prices, so SEO and first paint are intact. The browser then refreshes from the live API, so stock is never stale.

**Filters, search, pagination.** Already client-side in `ProductCatalog` — it fetches `/api/products` on every change. Nothing to do.

**Session-dependent pages.** The gate pattern above.

If the API is unreachable at build time the script writes empty fallbacks and warns instead of failing. The site still works; the HTML is just empty until JS loads.

## 9. Local development

Two modes, switched by one variable.

**Everything local** — PHP serves the API *and* the static export, one origin, no CORS:
```bash
npm run build
php -S 0.0.0.0:8080 -t . .dev-router.php
```
`.dev-router.php` emulates the production `.htaccess`.

**Next dev server + remote API** — hot reload against live data:
```bash
NEXT_PUBLIC_API_BASE=https://your-domain.com npm run dev
```
`API_CREDENTIALS` switches to `include`, and the remote must list `http://localhost:3000` in `security.allowed_origins`.

## 10. Known limitations

1. **New products need a rebuild for SEO.** They appear instantly on the live site (the catalogue is fetched client-side), but their dedicated `/products/<slug>/` HTML file only exists after `npm run build`. Until then that URL 404s.
2. **`next/image` optimization is off.** Source images are pre-sized WebP, so this is not noticeable — but new uploads are served at their original size. Compress before uploading.
3. **No ISR / on-demand revalidation.** Those need a Node server.
4. **Search is `LIKE`-based.** Fine for hundreds of products; a catalogue in the tens of thousands would want FULLTEXT.
5. **Rate limits live in MySQL**, not Redis. Slightly more DB writes; correct and durable, and no extra service.
6. **Cron depends on the host.** No cron → use the token-protected HTTP endpoint with an external scheduler.
7. **Sessions are DB-backed.** Old rows are pruned by the cron job.
8. **Uploads go to local disk.** No S3. Back them up with DirectAdmin's Home Directory backup.
9. **One timezone.** `DATETIME`, not `timestamptz`.
10. **The rescue panel is a deliberate back door.** Delete it after setup (README step 16).
