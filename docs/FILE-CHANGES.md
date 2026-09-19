# File Change List

Complete inventory of what changed in this migration.
Generated from git against the pre-migration commit `71192fa`.

## Summary

| Change | Count |
|---|---|
| Added | 97 |
| Modified | 17 |
| Deleted | 87 |

## Added

- `.htaccess`
- `README-DEPLOYMENT.md`
- `api/.htaccess`
- `api/account/address.php`
- `api/account/addresses.php`
- `api/account/profile.php`
- `api/admin-auth/change-password.php`
- `api/admin-auth/login.php`
- `api/admin-auth/logout.php`
- `api/admin-auth/me.php`
- `api/admin/audit-logs.php`
- `api/admin/categories.php`
- `api/admin/category.php`
- `api/admin/contact-messages.php`
- `api/admin/coupon.php`
- `api/admin/coupons.php`
- `api/admin/dashboard.php`
- `api/admin/order.php`
- `api/admin/orders.php`
- `api/admin/product-duplicate.php`
- `api/admin/product-inventory.php`
- `api/admin/product-stock.php`
- `api/admin/product.php`
- `api/admin/products.php`
- `api/admin/upload.php`
- `api/admin/user.php`
- `api/admin/users.php`
- `api/auth/logout.php`
- `api/auth/me.php`
- `api/auth/request-otp.php`
- `api/auth/verify-otp.php`
- `api/cart/index.php`
- `api/cart/item.php`
- `api/cart/items.php`
- `api/catalog/index.php`
- `api/categories/index.php`
- `api/checkout/index.php`
- `api/checkout/quote.php`
- `api/checkout/shipping.php`
- `api/config/.htaccess`
- `api/config/app.php`
- `api/config/database.php`
- `api/config/response.php`
- `api/config/security.php`
- `api/contact/index.php`
- `api/cron/.htaccess`
- `api/cron/expire-orders.php`
- `api/health.php`
- `api/home/index.php`
- `api/lib/.htaccess`
- `api/lib/account.php`
- `api/lib/admin.php`
- `api/lib/auth.php`
- `api/lib/bootstrap.php`
- `api/lib/cart.php`
- `api/lib/catalog.php`
- `api/lib/orders.php`
- `api/lib/payments.php`
- `api/lib/pricing.php`
- `api/lib/sms.php`
- `api/lib/storage.php`
- `api/orders/detail.php`
- `api/orders/index.php`
- `api/payments/callback.php`
- `api/payments/start.php`
- `api/products/detail.php`
- `api/products/index.php`
- `api/search/index.php`
- `api/site/index.php`
- `api/wishlist/index.php`
- `components/AccountGate.tsx`
- `components/CheckoutGate.tsx`
- `components/CheckoutResultBody.tsx`
- `components/admin/AdminGate.tsx`
- `components/admin/AdminLoginGate.tsx`
- `config/.htaccess`
- `config/config.example.php`
- `database/.htaccess`
- `database/removed-legacy-files.txt`
- `database/schema.sql`
- `database/seed.sql`
- `docs/API.md`
- `docs/DOCKER.md`
- `docs/MIGRATION.md`
- `docs/SECURITY.md`
- `docs/TESTING.md`
- `Dockerfile` (new: php:8.3-apache-trixie runtime, Node confined to the build stage)
- `docker-compose.yml` (new: app + MariaDB)
- `docker/entrypoint.sh` (secret, config, DB wait, schema/seed import, admin bootstrap)
- `.dockerignore` (new)
- `config/config.docker.php` (config sourced entirely from environment variables)
- `.github/workflows/docker-smoke.yml` (rewritten: builds the stack and asserts it serves)
- `lib/api-routes.ts`
- `lib/static-data.ts`
- `public/robots.txt`
- `public/sitemap.xml`
- `rescue/.htaccess`
- `rescue/index.php`
- `scripts/fetch-static-data.mjs`
- `scripts/generate-sitemap.mjs`
- `scripts/static-data-from-seed.mjs` (offline build data parsed from seed.sql)
- `scripts/package-release.mjs`
- `storage/.htaccess`
- `storage/logs/.gitkeep`
- `uploads/.htaccess`

## Modified

These are the only pre-existing files that were touched. Every change is either
an API-integration change or a build-configuration change — none alters the
visual design.

| File | What changed |
|---|---|
| `next.config.mjs` | `output: 'standalone'` → `'export'`; `images.unoptimized`; dropped the header block (now in `.htaccess`) |
| `package.json` | removed 13 Node/Prisma deps; new `build`/`data`/`package` scripts |
| `.gitignore` | ignore `config/config.php`, `.static-data/`, `release/` |
| `app/page.tsx` | `homeSections()` → `staticHomeSections()` |
| `app/products/page.tsx` | server fetch → `staticCatalog()` |
| `app/products/[slug]/page.tsx` | added `generateStaticParams()`; reads baked data |
| `app/account/page.tsx` | server session check → `<AccountGate />` |
| `app/checkout/page.tsx` | server session check → `<CheckoutGate />` |
| `app/checkout/result/page.tsx` | split; query string now read client-side |
| `app/admin/page.tsx` | server session check → `<AdminGate />` |
| `app/admin/login/page.tsx` | `searchParams` → `<AdminLoginGate />` |
| `app/globals.css` | **appended** `.admin-boot` loading styles (nothing modified) |
| `components/CheckoutClient.tsx` | uses the shared `ShippingMethod` type |
| `components/admin/ProductForm.tsx` | dropped `image/avif` to match the server allow-list |
| `lib/api-client.ts` | routes through `resolveApiPath()`; env-aware credentials |
| `types/index.ts` | exported `ShippingMethod` |
| `database/seed.sql` | admin-bootstrap instructions aligned with the rescue panel |

### Untouched (design-critical)

`components/Hero.tsx`, `ProductCard.tsx`, `ProductCatalog.tsx`, `ProductDetailClient.tsx`,
`CartClient.tsx`, `ContactClient.tsx`, `AccountClient.tsx`, `Providers.tsx`,
`CategoryScroller.tsx`, `FeatureCards.tsx`, `Reveal.tsx`, `SectionHeader.tsx`,
`WholesaleGuide.tsx`, `components/admin/AdminPanel.tsx` and all its tabs,
`tailwind.config.ts`, `postcss.config.mjs`, `app/layout.tsx`, `data/site.ts`,
`lib/pricing.ts`, and every existing CSS rule.

- `.gitignore`
- `app/account/page.tsx`
- `app/admin/login/page.tsx`
- `app/admin/page.tsx`
- `app/checkout/page.tsx`
- `app/checkout/result/page.tsx`
- `app/globals.css`
- `app/page.tsx`
- `app/products/[slug]/page.tsx`
- `app/products/page.tsx`
- `components/CheckoutClient.tsx`
- `components/admin/ProductForm.tsx`
- `lib/api-client.ts`
- `next.config.mjs`
- `package-lock.json`
- `package.json`
- `types/index.ts`

## Deleted

> `Dockerfile`, `docker-compose.yml`, `.dockerignore` and the entrypoint appear
> in this list because the **Node/PostgreSQL** versions were deleted. Files with
> the same names exist today, rewritten for the PHP + Apache + MySQL stack — see
> the Added section and `docs/DOCKER.md`.

- `.dockerignore` (Node/Postgres version)
- `Dockerfile` (Node/Postgres version)
- `app/api/account/addresses/[id]/default/route.ts`
- `app/api/account/addresses/[id]/route.ts`
- `app/api/account/addresses/route.ts`
- `app/api/account/profile/route.ts`
- `app/api/admin-auth/change-password/route.ts`
- `app/api/admin-auth/login/route.ts`
- `app/api/admin-auth/logout/route.ts`
- `app/api/admin/audit-logs/route.ts`
- `app/api/admin/categories/[id]/route.ts`
- `app/api/admin/categories/route.ts`
- `app/api/admin/contact-messages/route.ts`
- `app/api/admin/coupons/[id]/route.ts`
- `app/api/admin/coupons/route.ts`
- `app/api/admin/dashboard/route.ts`
- `app/api/admin/orders/[id]/route.ts`
- `app/api/admin/orders/route.ts`
- `app/api/admin/products/[id]/duplicate/route.ts`
- `app/api/admin/products/[id]/inventory/route.ts`
- `app/api/admin/products/[id]/route.ts`
- `app/api/admin/products/[id]/stock/route.ts`
- `app/api/admin/products/route.ts`
- `app/api/admin/upload/route.ts`
- `app/api/admin/users/[id]/route.ts`
- `app/api/admin/users/route.ts`
- `app/api/auth/logout/route.ts`
- `app/api/auth/me/route.ts`
- `app/api/auth/request-otp/route.ts`
- `app/api/auth/verify-otp/route.ts`
- `app/api/cart/items/[id]/route.ts`
- `app/api/cart/items/route.ts`
- `app/api/cart/route.ts`
- `app/api/categories/route.ts`
- `app/api/checkout/quote/route.ts`
- `app/api/checkout/route.ts`
- `app/api/contact/route.ts`
- `app/api/health/route.ts`
- `app/api/orders/[id]/route.ts`
- `app/api/orders/route.ts`
- `app/api/payments/callback/route.ts`
- `app/api/products/[slug]/route.ts`
- `app/api/products/route.ts`
- `app/api/search/route.ts`
- `app/api/test-support/rate-reset/route.ts`
- `app/api/wishlist/route.ts`
- `app/robots.ts`
- `app/sitemap.ts`
- `app/uploads/[[...path]]/route.ts`
- `docker-compose.yml` (Node/Postgres version)
- `docker-entrypoint.sh` (Node/Postgres version)
- `prisma/migrations/20260910125851_init/migration.sql`
- `prisma/migrations/20260911100000_admin_password_auth/migration.sql`
- `prisma/migrations/migration_lock.toml`
- `prisma/schema.prisma`
- `prisma/seed.compiled.cjs`
- `prisma/seed.ts`
- `scripts/cleanup-test-data.ts`
- `server/audit.ts`
- `server/auth/crypto.ts`
- `server/auth/guards.ts`
- `server/auth/otp.ts`
- `server/auth/session.ts`
- `server/db.ts`
- `server/env.ts`
- `server/errors.ts`
- `server/http.ts`
- `server/logger.ts`
- `server/mappers.ts`
- `server/payments/index.ts`
- `server/rate-limit.ts`
- `server/services/account.ts`
- `server/services/admin.ts`
- `server/services/cart.ts`
- `server/services/catalog.ts`
- `server/services/orders.ts`
- `server/services/payments.ts`
- `server/services/wishlist.ts`
- `server/sms/index.ts`
- `server/storage/index.ts`
- `server/storage/validate.ts`
- `server/validation/schemas.ts`
- `tests/integration/rate-limit.ts`
- `tests/integration/run.ts`
- `tests/unit/pricing.test.ts`
- `tests/unit/validation.test.ts`
- `vitest.config.ts`
