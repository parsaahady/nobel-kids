# Nobel Kids — API Reference

Base URL: `https://your-domain.com/api`

All endpoints are plain PHP files. Dynamic segments are query parameters, not path segments, because Apache maps URLs to real files. The React app never writes these URLs by hand — `lib/api-routes.ts` translates its REST-style paths into this layout.

---

## Conventions

### Response envelope
Every endpoint returns JSON in the same shape.

```jsonc
// success
{ "success": true, "ok": true, "data": { ... }, "message": null }

// failure
{ "success": false, "ok": false,
  "error": { "code": "VALIDATION_ERROR", "message": "…", "details": { ... } } }
```

`message` is a human-readable Persian string safe to show the user. `details` appears on validation errors and maps field → reason.

### Error codes

| Code | HTTP | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 422 | input failed validation; see `details` |
| `INVALID_REQUEST` | 400 | malformed JSON or missing body |
| `UNAUTHORIZED` | 401 | no valid session |
| `FORBIDDEN` | 403 | authenticated but not allowed (includes cross-origin writes) |
| `NOT_FOUND` | 404 | resource missing, or not yours |
| `METHOD_NOT_ALLOWED` | 405 | wrong HTTP verb |
| `CONFLICT` | 409 | state conflict (illegal status change, stock below zero…) |
| `PAYLOAD_TOO_LARGE` | 413 | body over 1 MB |
| `RATE_LIMITED` | 429 | too many requests; `details.retryAfter` in seconds |
| `GATEWAY_DISABLED` | 400 | online payment requested while disabled |
| `DB_ERROR` / `INTERNAL` | 500 | server fault — details go to `storage/logs/`, never to the client |

### Identifiers
All IDs are **strings** in JSON, even though the database uses `BIGINT`. This avoids JavaScript's 53-bit integer limit. Send them back as strings.

### Money
Integer **Toman**. No decimals anywhere. `528000` means ۵۲۸٬۰۰۰ تومان.

### Authentication
Two independent server-side sessions, both HttpOnly cookies holding only an HMAC of the token:

| Cookie | Purpose | Created by |
|---|---|---|
| `nbl_session` | customer (OTP login) | `auth/verify-otp.php` |
| `nbl_admin_session` | admin (password login) | `admin-auth/login.php` |

A customer session can never reach an admin endpoint — `/api/admin/*` requires `nbl_admin_session` **and** a role of `ADMIN`/`SUPER_ADMIN`. Roles are read from the database on every request, never from the browser.

### CSRF
Unsafe methods (`POST`/`PATCH`/`DELETE`) require a same-origin `Origin` header. Cross-origin writes get `FORBIDDEN`. A cookie-bearing write with no `Origin` and no `Referer` is also refused. Cookies are `SameSite=Lax`.

### Rate limiting
Counted in the `rate_limits` table, keyed by IP and/or account. `429` responses carry a `Retry-After` header and `details.retryAfter`.

---

## Storefront (public)

### `GET /products/index.php`
Product listing with filters.

| Param | Type | Default | Notes |
|---|---|---|---|
| `q` | string | — | searches name, slug, collection, tags |
| `category` | string | — | category **name** |
| `collection` | string | — | |
| `minPrice` / `maxPrice` | int | — | Toman |
| `size` / `color` | string | — | |
| `available` | bool | `true` | `false` includes out-of-stock |
| `featured` | bool | `false` | |
| `sort` | enum | `newest` | `newest`, `cheapest`, `expensive`, `bestseller` |
| `page` | int | 1 | |
| `pageSize` | int | 12 | 1–60 |

→ `{ items: ProductListItem[], total, page, pageSize, totalPages }`

### `GET /products/detail.php?slug=<slug>`
→ `{ product: ProductDetail, related: ProductListItem[] }` · `404` if missing or not `ACTIVE`.

### `GET /categories/index.php`
→ `{ items: [{ id, name, slug, image, isActive, sortOrder, productCount }] }`

### `GET /search/index.php?q=<term>`
Quick search for the header box. Returns `{ items: [] }` when `q` is shorter than 2 characters.

### `GET /home/index.php`
→ `{ featured[], newest[], bestsellers[] }` — 4 products each. Used by the build script and the homepage.

### `GET /catalog/index.php`
→ `{ initial: ProductListResult, categories[], sizeOptions[], collections[] }` — one-request bootstrap for `/products`.

### `GET /site/index.php`
→ `{ gatewayEnabled, siteUrl, packSize }` — public, non-secret config only.

### `GET /health.php`
→ `{ status, ts, checks: { db, schema, uploads }, php, env }` · `503` when degraded.

### `POST /contact/index.php`
Body: `{ name, mobile, email?, subject?, message }` → `201`.
Limits: 5 per 10 min per IP, 5 per hour per mobile.

---

## Authentication

### `POST /auth/request-otp.php`
Body: `{ mobile }` → `{ sent: true, expiresIn: 120 }`

Limits: 5 per 10 min per mobile, 20 per 10 min per IP, 60 s resend cooldown.
In development only, the response also carries `devCode`. In production that field never exists.

### `POST /auth/verify-otp.php`
Body: `{ mobile, code }` → `{ user, wishlistIds }` and sets `nbl_session`.

The code is single-use, expires in 120 s, and allows 5 attempts. A guest cart is merged into the account on success.

### `GET /auth/me.php`
→ `{ user, wishlistIds }` or `{ user: null }`.

### `POST /auth/logout.php`
Revokes the session and clears the cookie.

### `POST /admin-auth/login.php`
Body: `{ identifier, password }` → `{ user }` and sets `nbl_admin_session`.

Limit: 5 failures per 15 min. Successes do not consume the budget. Accounts with `password_hash IS NULL` can never log in. Every attempt is written to `audit_logs`.

### `GET /admin-auth/me.php` · `POST /admin-auth/logout.php` · `POST /admin-auth/change-password.php`

---

## Cart

Works for guests (cookie-bound cart) and signed-in customers.

| Endpoint | Method | Body / Params |
|---|---|---|
| `/cart/index.php` | `GET` | — |
| `/cart/index.php` | `DELETE` | empty the cart |
| `/cart/items.php` | `POST` | `{ productId, packMode: 'assorted'\|'single', colorName, sizeLabel, packCount: 1..500 }` |
| `/cart/item.php?id=<id>` | `PATCH` | `{ packCount }` — `0` removes the line |
| `/cart/item.php?id=<id>` | `DELETE` | |

→ `{ id, items[], subtotal, baseTotal, totalPacks, totalPieces }`

Every price is recomputed server-side from the product row. Client-sent prices are ignored. Stock is validated on each mutation.

---

## Checkout & orders

### `GET /checkout/shipping.php`
→ `{ methods: [{ id, label, description, cost, note }] }`

### `POST /checkout/quote.php`
Body: `{ shippingMethod: 'freight'|'pickup', couponCode? }`
→ `{ subtotal, baseTotal, discount, shippingCost, total, coupon }`

Preview only — nothing is written.

### `POST /checkout/index.php`
```jsonc
{
  "idempotencyKey": "at-least-8-chars",
  "addressId": "1",
  "shippingMethod": "freight",
  "paymentMethod": "manual",        // or "gateway"
  "couponCode": "WELCOME10",        // optional
  "note": "…"                       // optional
}
```
→ `{ order, payment: { kind: 'manual' } }`
or `{ order, payment: { kind: 'gateway', redirectUrl } }`

**Guarantees.** The whole thing runs in one transaction: amounts are recalculated from live rows, stock is checked and decremented with `SELECT … FOR UPDATE`, an `inventory_logs` `SALE` row is written, the cart is emptied, and the order number comes from `number_counters` (`NBL-2026-000001` / `NBLQ-…` for quotations).

Replaying the same `idempotencyKey` returns the original order with `replayed: true` and does **not** touch stock.

Limits: 10 per 10 min per user, 30 per 10 min per IP.

### `GET /orders/index.php?page=&pageSize=`
### `GET /orders/detail.php?id=<id>`
Owner-scoped: another customer's order is `404`, never `403` (no existence leak).

---

## Account

| Endpoint | Method | Notes |
|---|---|---|
| `/account/profile.php` | `GET`, `PATCH` | `{ name, businessName, email }` — `role` and `status` are ignored if sent |
| `/account/addresses.php` | `GET`, `POST` | |
| `/account/address.php?id=<id>` | `PATCH`, `DELETE` | |
| `/account/address.php?id=<id>&action=default` | `POST` | make default |

## Wishlist

`GET /wishlist/index.php` → `{ items[], ids[] }`
`POST /wishlist/index.php` with `{ productId }` toggles → `{ wished, ids }`

---

## Payments

### `POST /payments/start.php`
Body: `{ orderId }` → `{ redirectUrl }`

### `GET|POST /payments/callback.php`
Called by the gateway. Verifies the transaction, matches the amount against `payment_transactions.amount` (never a client value), marks the order paid, and `303`-redirects to `/checkout/result/?status=…&order=…`.

Amount mismatches fail the payment. Repeat callbacks are idempotent.

---

## Admin

All require `nbl_admin_session` + an admin role. Every mutation writes an `audit_logs` row.

### Dashboard
`GET /admin/dashboard.php` → `{ salesToday, ordersTotal, productsTotal, usersTotal, lowStock, chart[30], recentOrders[6], activity[8], topProducts[5] }`

### Products

| Endpoint | Method | Notes |
|---|---|---|
| `/admin/products.php` | `GET`, `POST` | `201` on create |
| `/admin/product.php?id=` | `GET`, `PATCH`, `DELETE` | delete is soft |
| `/admin/product-stock.php?id=` | `POST` | `{ quantity: -1e6..1e6, reason? }` — relative adjustment |
| `/admin/product-duplicate.php?id=` | `POST` | copy as `DRAFT`, stock 0 |
| `/admin/product-inventory.php?id=` | `GET` | inventory log |

**Validation:** at least 1 colour and 1 size (max 20 each); hex colours `#RGB`–`#RRGGBBAA`; max 10 price tiers; max 10 images, same-origin paths only (`javascript:` and external URLs rejected); price 1,000–1,000,000,000; stock 0–1,000,000; slug `^[a-z0-9]+(-[a-z0-9]+)*$`.

Saving recreates colours, sizes and variants. Variant SKU: `<sku>::<color>::<size>`.

### Orders
`GET /admin/orders.php` — filters `q, status, paymentStatus, from, to, minAmount, maxAmount, page, pageSize`
`GET /admin/order.php?id=` — accepts an ID **or** an order number; returns `allowedNext`
`PATCH /admin/order.php?id=` — `{ status?, paymentStatus?, trackingCode?, adminNote? }` → `{ changed, order }`

Allowed transitions:

```
PENDING          → PAID, PROCESSING, CANCELLED
AWAITING_PAYMENT → PAID, CANCELLED
PAID             → PROCESSING, PACKED, CANCELLED, REFUNDED
PROCESSING       → PACKED, CANCELLED
PACKED           → SHIPPED, CANCELLED
SHIPPED          → DELIVERED
DELIVERED        → REFUNDED
CANCELLED, REFUNDED → (terminal)
```

Anything else is `409 CONFLICT`. Cancelling or refunding releases stock exactly once (guarded by a `RETURN` row in `inventory_logs`). Marking a gateway order `PAID` by hand is refused — only `MANUAL` orders can be settled manually.

### Other collections

| Endpoint | Methods |
|---|---|
| `/admin/categories.php` | `GET`, `POST` |
| `/admin/category.php?id=` | `PATCH`, `DELETE` (`409` if the category still has products) |
| `/admin/users.php` · `/admin/user.php?id=` | `GET` · `GET`, `PATCH` |
| `/admin/coupons.php` · `/admin/coupon.php?id=` | `GET`, `POST` · `PATCH` |
| `/admin/audit-logs.php` | `GET` |
| `/admin/contact-messages.php` | `GET`, `PATCH` |

Role changes require `SUPER_ADMIN`, and a `SUPER_ADMIN`'s own role cannot be changed by anyone.

### Uploads
`POST /admin/upload.php` — multipart, field `files`, max 8 per request
→ `201 { files: [{ url, size, mime, width, height }] }`

Accepts JPEG, PNG, WebP, GIF only. Each file must satisfy **both** `getimagesize()` and `finfo`; the extension is regenerated from the detected type; the name becomes 16 random bytes; anything containing `<?php`, `<?=`, `<script` or `<%` anywhere in the file is rejected (this catches a valid image with an appended shell). Dimensions 10–4000 px. Stored under `uploads/YYYY/MM/` with mode `0644`, in a directory where `.htaccess` disables the PHP engine.

---

## Cron

`api/cron/expire-orders.php` — cancels `AWAITING_PAYMENT` orders older than `payment.unpaid_expire_minutes` (default 60) and returns their stock. Also prunes expired OTPs, sessions and rate-limit rows.

CLI needs no token. Over HTTP it requires `?token=` matching `security.cron_token`; with no token configured, HTTP access is refused.

---

## Pricing rules (identical to the old TypeScript)

```
PACK_SIZE = 5
tiers: 3+ packs → 4% off (400 bps), 6+ packs → 8% off (800 bps)

round_money(a) = round(a / 1000) * 1000
unitPrice      = round_money(basePrice * (1 - bps / 10000))
lineTotal      = unitPrice * packSize * packCount

coupon PERCENT: round_money(subtotal * value / 100), capped by maxDiscount
coupon FIXED:   min(value, subtotal)
coupons do not apply below minOrderTotal
```

Worked example — product at 528,000 Toman:

| Packs | Unit | Line total |
|---|---|---|
| 1 | 528,000 | 2,640,000 |
| 3 | 507,000 | 7,605,000 |
| 6 | 486,000 | 14,580,000 |

`api/lib/pricing.php` is a line-by-line port of `lib/pricing.ts` and was verified against 149 generated cases.
