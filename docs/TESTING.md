# Testing Checklist

Two parts: **A** — what was already verified against a live server during the migration; **B** — what you should re-run on your own host after deploying.

Test environment for Part A: PHP 8.4, MariaDB 11.8, API at `http://127.0.0.1:8080`, seeded database.

---

# Part A — Verified during migration

## A1. Database

| # | Check | Result |
|---|---|---|
| 1 | `schema.sql` imports with no errors | ✅ 24 tables + 5 views |
| 2 | All tables InnoDB + `utf8mb4_unicode_ci` | ✅ |
| 3 | `seed.sql` imports cleanly | ✅ |
| 4 | Seed is idempotent (import twice) | ✅ identical row counts |
| 5 | Counts after seed | ✅ 4 categories, 17 products, 39 images, 156 variants, 34 tiers |
| 6 | Persian text round-trips byte-perfect | ✅ incl. ZWNJ (`‌`) and en-dashes |
| 7 | Foreign keys and `ON DELETE` behaviour | ✅ |

## A2. Catalogue

| # | Check | Result |
|---|---|---|
| 8 | `GET /api/products` returns 17 | ✅ |
| 9 | Pagination (`page`, `pageSize` 1–60) | ✅ |
| 10 | Sorts: newest / cheapest / expensive / bestseller | ✅ |
| 11 | Filter by category, size, colour, price range | ✅ |
| 12 | `available=false` includes out-of-stock | ✅ |
| 13 | `GET /api/products/detail.php?slug=` | ✅ gallery, colours, sizes, tiers |
| 14 | Unknown slug | ✅ `NOT_FOUND` |
| 15 | Search (Persian, `دورس`) | ✅ 6 hits |
| 16 | Search (Latin, `Hello`) | ✅ 5 hits |
| 17 | Search shorter than 2 chars | ✅ empty |
| 18 | `GET /api/categories` with counts | ✅ 11 / 6 / 0 / 0 |
| 19 | `GET /api/health.php` | ✅ `db: up`, `schema: ok`, `uploads: writable` |

## A3. Pricing (the core business rule)

| # | Check | Result |
|---|---|---|
| 20 | Port matches `lib/pricing.ts` across 149 generated cases | ✅ 149/149 |
| 21 | 1 pack → unit 528,000, line 2,640,000 | ✅ |
| 22 | 3 packs → unit 507,000 (4% off), line 7,605,000 | ✅ |
| 23 | 6 packs → unit 486,000 (8% off), line 14,580,000 | ✅ |
| 24 | `round_money` → nearest 1,000 Toman | ✅ |
| 25 | `WELCOME10` on 7,605,000 → 761,000 off | ✅ |
| 26 | Coupon below `minOrderTotal` → no discount | ✅ |
| 27 | Invalid coupon code | ✅ rejected |

## A4. Authentication

| # | Check | Result |
|---|---|---|
| 28 | OTP request returns `devCode` in dev | ✅ |
| 29 | Wrong code rejected | ✅ |
| 30 | Correct code authenticates, creates the user | ✅ |
| 31 | **Replaying a used code** | ✅ `OTP_NOT_FOUND` |
| 32 | `nbl_session` is `HttpOnly` | ✅ |
| 33 | `GET /api/auth/me` | ✅ |
| 34 | Logout revokes the session | ✅ |
| 35 | Admin login with correct password | ✅ mints `nbl_admin_session` |
| 36 | Admin login with wrong password | ✅ `UNAUTHORIZED` |
| 37 | 6 failed admin logins | ✅ `RATE_LIMITED`, `retryAfter 899` |
| 38 | Correct password during lockout | ✅ still refused |
| 39 | Account with `password_hash IS NULL` | ✅ cannot log in |

## A5. Cart & checkout

| # | Check | Result |
|---|---|---|
| 40 | Add to cart, guest and authenticated | ✅ |
| 41 | Update pack count; `0` removes | ✅ |
| 42 | Exceeding stock | ✅ `too_large` |
| 43 | Forged size label | ✅ `INVALID_SIZE` |
| 44 | Cart DTO matches `types/index.ts` | ✅ |
| 45 | Address create / update / default / delete | ✅ |
| 46 | Quote endpoint totals | ✅ |
| 47 | Order created → `NBLQ-2026-000001` | ✅ |
| 48 | Stock 20 → 14, `inventory_logs SALE -6` | ✅ |
| 49 | Cart emptied after checkout | ✅ |
| 50 | **Idempotency replay** | ✅ same order, `replayed: true`, no second decrement |
| 51 | Another customer's order | ✅ `NOT_FOUND` |
| 52 | Unauthenticated checkout | ✅ `UNAUTHORIZED` |

## A6. Admin

| # | Check | Result |
|---|---|---|
| 53 | Customer session on an admin endpoint | ✅ `FORBIDDEN` |
| 54 | Dashboard aggregates | ✅ |
| 55 | Illegal transition `PENDING → SHIPPED` | ✅ `CONFLICT` |
| 56 | `PAID` → `CANCELLED` releases stock 14 → 20 | ✅ one `RETURN` row |
| 57 | Double cancel | ✅ no double refund |
| 58 | Stock adjust +5 | ✅ 20 → 25 |
| 59 | Stock adjust below zero | ✅ `CONFLICT` |
| 60 | Category create / delete | ✅ |
| 61 | Delete a category that still has products | ✅ `CONFLICT` with Persian count |
| 62 | Product create auto-generates variants | ✅ 1 colour × 2 sizes = 2 |
| 63 | Product duplicate | ✅ `DRAFT`, stock 0, `-copy-<hex>` slug |
| 64 | Product soft delete | ✅ |
| 65 | `javascript:` image URL | ✅ rejected |
| 66 | External image URL | ✅ rejected |
| 67 | Price below 1,000 | ✅ `too_small` |
| 68 | Users / coupons / audit / messages / inventory lists | ✅ |
| 69 | Every mutation writes an audit row | ✅ |

## A7. Security

See `docs/SECURITY.md` for detail.

| # | Check | Result |
|---|---|---|
| 70 | 4 SQL injection payloads | ✅ no leak, table intact |
| 71 | Cross-origin POST | ✅ `FORBIDDEN` |
| 72 | Cookie-bearing POST with no `Origin` | ✅ `FORBIDDEN` |
| 73 | Legitimate same-origin POST | ✅ allowed |
| 74 | Customer → self-promote to admin | ✅ `FORBIDDEN` |
| 75 | `role` injected into profile update | ✅ ignored |
| 76 | Plain admin changing roles | ✅ `CONFLICT` |
| 77 | Demoting a `SUPER_ADMIN` | ✅ `CONFLICT` |
| 78 | Upload: PHP disguised as `.jpg` | ✅ rejected |
| 79 | Upload: GIF/PHP polyglot | ✅ rejected |
| 80 | **Upload: valid PNG with appended PHP** | ✅ rejected |
| 81 | Upload: 9 files | ✅ rejected (max 8) |
| 82 | Upload unauthenticated / as customer | ✅ `UNAUTHORIZED` / `FORBIDDEN` |
| 83 | Direct request to `api/lib/*.php` | ✅ 404 via PHP guard |
| 84 | 1.1 MB payload | ✅ `PAYLOAD_TOO_LARGE` |
| 85 | Malformed JSON | ✅ `INVALID_REQUEST` |
| 86 | Wrong HTTP method | ✅ `METHOD_NOT_ALLOWED` |
| 87 | Security headers present | ✅ |

## A8. Frontend (static export, real browser)

| # | Check | Result |
|---|---|---|
| 88 | `npm run build` exports 28 pages | ✅ incl. 17 product pages |
| 89 | Homepage HTML contains Persian names and prices | ✅ pre-rendered |
| 90 | All pages return 200 | ✅ |
| 91 | CSS bundle complete (127 KB) | ✅ |
| 92 | `dir="rtl"` / `lang="fa"` | ✅ |
| 93 | Zero console errors on every page | ✅ |
| 94 | Add to cart from the product page | ✅ toast appeared |
| 95 | Cart page shows the item and total | ✅ |
| 96 | Category filter (live API) | ✅ 8 → 6 cards |
| 97 | Live search | ✅ 4 results |
| 98 | Unauthenticated `/admin/` | ✅ redirects to `/admin/login/?next=/admin` |
| 99 | Admin login → dashboard | ✅ |
| 100 | Admin tabs load real data | ✅ |
| 101 | Mobile 390×844 layout | ✅ hamburger + bottom tab bar |
| 102 | Framer Motion animations | ✅ present |
| 103 | Sitemap / robots / images | ✅ 200 |

## A9. Rescue panel & cron

| # | Check | Result |
|---|---|---|
| 104 | Disabled when no token configured | ✅ |
| 105 | Wrong token | ✅ rejected + logged |
| 106 | Health check | ✅ 22 checks; flagged dev-mode and non-HTTPS correctly |
| 107 | Password reset → promote + login | ✅ |
| 108 | Reset writes `rescue.password_reset` to audit | ✅ |
| 109 | Cron via CLI | ✅ |
| 110 | Cron over HTTP without a token | ✅ 403 |
| 111 | Cron over HTTP with the token | ✅ 200 |

---

# Part B — Run these on your own host after deploying

## B1. Smoke test (5 minutes)

- [ ] `https://your-domain.com/api/health.php` → all checks up
- [ ] Homepage loads with products and images
- [ ] `/products/` loads; filters and search work
- [ ] A product page loads
- [ ] Add to cart → the header badge increments
- [ ] `/cart/` shows the item with the right total
- [ ] `/contact/` submits successfully

## B2. Security verification (do not skip)

- [ ] `https://your-domain.com/config/config.php` → **403**
- [ ] `https://your-domain.com/api/lib/auth.php` → **403 or 404**
- [ ] `https://your-domain.com/api/config/database.php` → **403 or 404**
- [ ] `https://your-domain.com/database/seed.sql` → **403**
- [ ] `https://your-domain.com/storage/logs/` → **403**
- [ ] `https://your-domain.com/uploads/` → no directory listing
- [ ] Upload an image in the admin panel, then request it directly — it displays
- [ ] Rename a `.php` file to `.jpg` and try to upload it → rejected
- [ ] `https://` shows a valid padlock; `http://` redirects to `https://`
- [ ] `/rescue/` is gone (404) after setup

## B3. Full order flow

- [ ] Request an OTP on a real phone; the SMS arrives
- [ ] Wrong code rejected; correct code logs in
- [ ] Add an address
- [ ] Place an order → note the number (`NBLQ-…` or `NBL-…`)
- [ ] The order appears in `/account/`
- [ ] It appears in the admin panel
- [ ] Product stock decreased by the ordered amount
- [ ] Change the status; the customer view reflects it
- [ ] Cancel the order; stock returns

## B4. Admin

- [ ] Log in at `/admin/login/`
- [ ] Dashboard numbers look right
- [ ] Create a product with an image, colour, size and price → it appears on the storefront
- [ ] Edit it; adjust stock; duplicate it; delete it
- [ ] Create and delete a category
- [ ] Deleting a category that has products → refused
- [ ] Audit log shows all of the above

## B5. Mobile

On a real phone, in both portrait and landscape:

- [ ] Homepage, hero and carousel
- [ ] Products page, filter drawer
- [ ] Product detail, gallery, zoom
- [ ] Cart, checkout
- [ ] Bottom navigation bar
- [ ] Persian text renders correctly (no `?` or boxes)

## B6. Before announcing

- [ ] All of `docs/SECURITY.md` → "Pre-launch checklist"
- [ ] All of `README-DEPLOYMENT.md` → "Security checklist"
- [ ] DirectAdmin backup created
- [ ] If a payment gateway is enabled: one real low-value transaction, end to end
- [ ] `storage/logs/` reviewed for unexpected warnings

---

## Handy commands

```bash
# API health
curl -s https://your-domain.com/api/health.php | python3 -m json.tool

# Product count
curl -s "https://your-domain.com/api/products/index.php?pageSize=1" \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['total'])"

# Confirm a secret is NOT reachable (expect 403/404)
curl -s -o /dev/null -w "%{http_code}\n" https://your-domain.com/config/config.php

# Rebuild + repackage after adding products
NEXT_PUBLIC_API_BASE=https://your-domain.com npm run build && npm run package
```
