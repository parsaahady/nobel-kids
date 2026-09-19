# Security Audit Summary

Threat-by-threat account of what the PHP backend does, and how each control was verified. Everything below was exercised against a running server, not just read.

---

## 1. SQL injection — mitigated

**Control.** Every query goes through `db_query()` in `api/config/database.php`, which uses `PDO::prepare()` with bound parameters. `PDO::ATTR_EMULATE_PREPARES` is **false**, so statements are prepared by MySQL itself and values are never interpolated into SQL. There is no string concatenation of user input anywhere in the codebase.

Identifier-ish inputs (`sort`, `status`) are mapped through PHP `match`/allow-list expressions to fixed SQL fragments — a value outside the list falls back to the default.

**Wrinkle found and fixed.** With emulation off, MySQL placeholders are positional, so a named parameter cannot legally repeat. `db_expand_repeated_params()` rewrites `:q` into `:q__r1`, `:q__r2`, … and fans the bound value out. It uses a word-boundary regex so `:q` never matches `:qexact`. Every statement stays a true prepared statement.

**Verified.** `1 OR 1=1`, `' OR '1'='1`, `1; DROP TABLE products--`, and a URL-encoded `UNION SELECT password_hash FROM users--` all returned 0 results and left the table intact (17 products before and after). Injection through `sort` and `slug` returned normal results / `NOT_FOUND`.

## 2. Cross-site scripting (XSS) — mitigated

**Control.** The API returns JSON with `Content-Type: application/json; charset=utf-8` and `X-Content-Type-Options: nosniff`. React escapes all interpolated text. The only `dangerouslySetInnerHTML` uses are `JSON.stringify()`-generated JSON-LD blocks built from typed values.

Server-rendered HTML in `rescue/index.php` passes every dynamic value through `e()` (`htmlspecialchars` with `ENT_QUOTES | ENT_SUBSTITUTE`).

Product image URLs are validated against `^/[A-Za-z0-9._\-/%]+$` — same-origin paths only.

**Verified.** `javascript:alert(1)` and `https://evil.com/x.png` were both rejected by the product endpoint.

## 3. Cross-site request forgery (CSRF) — mitigated

**Control.** `assert_same_origin()` runs before every `POST`/`PATCH`/`DELETE`:

1. `Origin` present → must equal the site origin or an entry in `security.allowed_origins`.
2. No `Origin` but `Referer` present → host must match.
3. Neither header, **but the request carries one of our auth cookies** → rejected. A cookie-authenticated write must prove its origin.
4. Neither header and no cookies → allowed (gateway callbacks, cron, curl).

Session cookies are `SameSite=Lax`, which blocks cross-site form posts independently.

**Hardened during the audit.** Case 3 originally fell through to "allow". Now refused.

**Verified.** A `POST` with `Origin: https://evil.example.com` → `FORBIDDEN`. The same request with no `Origin` but a valid session cookie → `FORBIDDEN`. A legitimate same-origin request → `200`. An anonymous callback-style request with no cookies → `200`.

## 4. Session security — mitigated

| Property | Implementation |
|---|---|
| Storage | server-side `sessions` table |
| Cookie contents | opaque random token only |
| Database contents | HMAC-SHA256 of the token, never the token itself |
| Flags | `HttpOnly`, `SameSite=Lax`, `Secure` when `app.url` is HTTPS, `Path=/` |
| Fixation | a fresh token is minted on every login; the pre-login session is never reused |
| Expiry | absolute `expires_at` + explicit `revoked_at` |
| Separation | `purpose ENUM('CUSTOMER','ADMIN')` — a customer cookie is invalid on admin endpoints |
| Cleanup | cron prunes expired and revoked rows |

A stolen database gives an attacker hashes, not usable session tokens.

**Verified.** `Set-Cookie` on both `nbl_session` and `nbl_admin_session` carries `HttpOnly`. A customer session sent to `/api/admin/*` returns `FORBIDDEN`.

## 5. Privilege escalation — mitigated

**Control.** Roles are read from the `users` table on every request. Nothing about identity or role comes from the browser. `require_admin()` checks the admin session **and** re-reads the role. Role changes require `SUPER_ADMIN`, and a `SUPER_ADMIN`'s role cannot be changed by anyone — including another super admin.

`/api/account/profile.php` accepts only `name`, `businessName` and `email`; `role` and `status` in the payload are ignored by construction (fields are read individually, never mass-assigned).

**Verified.**

| Attempt | Result |
|---|---|
| Customer → `PATCH /admin/user.php {role: SUPER_ADMIN}` | `FORBIDDEN` |
| Customer → `PATCH /account/profile.php {role: SUPER_ADMIN}` | 200, role unchanged (`CUSTOMER`) |
| Plain `ADMIN` → change any role | `CONFLICT` — super admin only |
| `SUPER_ADMIN` → demote another `SUPER_ADMIN` | `CONFLICT` — not permitted |
| `SUPER_ADMIN` → promote a customer | allowed (correct) |
| Unauthenticated → any admin endpoint | `UNAUTHORIZED` |

## 6. Brute force — mitigated

| Action | Limit |
|---|---|
| Admin login | 5 failures / 15 min per identifier+IP |
| OTP request | 5 / 10 min per mobile, 20 / 10 min per IP |
| OTP verify | 5 attempts per code, then the code dies |
| OTP resend | 60 s cooldown |
| Checkout | 10 / 10 min per user, 30 / 10 min per IP |
| Contact form | 5 / 10 min per IP, 5 / hour per mobile |
| Rescue panel | 5 / 15 min per IP |

Successful admin logins do **not** consume the failure budget, so a legitimate user is never locked out by their own activity. Failures are audited. `password_verify()` runs against a dummy hash when the account does not exist, equalizing response time so the endpoint cannot be used to enumerate accounts.

**Verified.** Attempts 1–5 → `UNAUTHORIZED`; attempt 6 → `RATE_LIMITED` with `retryAfter: 899`. The **correct** password during lockout was also refused — the lock is on the identifier, not on the guess.

## 7. Price and stock manipulation — mitigated

**Control.** The client's cart is a list of product IDs and pack counts. Prices are never accepted from the browser. At checkout, inside a single transaction:

1. Rows are re-read with `SELECT … FOR UPDATE`.
2. Unit prices, tier discounts, coupon value, shipping and total are recomputed by `api/lib/pricing.php`.
3. Stock is checked, then decremented.
4. An `inventory_logs` row is written.
5. The order number is issued from `number_counters`.

Coupons are re-validated server-side (active, in date, usage cap, minimum order). Payment amounts are always read from `payment_transactions.amount`; a gateway callback whose amount disagrees fails the payment instead of settling it.

**Verified.** Tier pricing at 1/3/6 packs matched `lib/pricing.ts` exactly (528,000 → 507,000 → 486,000 per unit). Ordering 6 packs moved stock 20 → 14 and wrote `SALE -6`. `packCount: 999` against 20 in stock → `too_large`. A forged size → `INVALID_SIZE`. Cancelling released stock 14 → 20 with exactly one `RETURN` row; a second cancel added nothing. An admin stock adjustment below zero → `CONFLICT`.

**Idempotency.** Replaying a checkout with the same `idempotencyKey` returned the original order with `replayed: true` and did not decrement stock again.

## 8. File upload attacks — mitigated

Layered, because this is the highest-risk surface.

**Application layer** (`api/lib/storage.php`):
1. Admin session required.
2. Explicit `UPLOAD_ERR_*` handling; `is_uploaded_file()`.
3. Size cap (`uploads.max_bytes`, default 5 MB); max 8 files per request.
4. `getimagesize()` **and** `finfo` must agree on the MIME type.
5. Allow-list JPEG / PNG / WebP / GIF; the extension is regenerated from the detected type, never taken from the filename.
6. **Whole-file** scan for `<?php`, `<?=`, `<script`, `<%`.
7. Dimensions 10–4000 px.
8. Filename replaced with `bin2hex(random_bytes(16))`; stored under `uploads/YYYY/MM/`; file `0644`, directories `0755`.

**Web-server layer** (`uploads/.htaccess`):
- `php_flag engine off` for mod_php.
- `RemoveHandler` / `RemoveType` for every script extension — this is what stops LiteSpeed and CGI/FPM, which ignore `php_flag`.
- A `mod_rewrite` rule returning `403` for any script-like filename in any subdirectory.
- Only real image extensions are servable; everything else is denied.
- `X-Content-Type-Options: nosniff` and a restrictive CSP (neutralises SVG).
- `Options -Indexes -ExecCGI`.

**Verified.**

| File | Result |
|---|---|
| Valid PNG | stored as `/uploads/2026/09/<32 hex>.png` |
| `shell.php.jpg` (PHP source, image extension) | rejected — not a valid image |
| `polyglot.gif` (`GIF89a` + PHP) | rejected — content not allowed |
| **`trojan.png`** (valid PNG with PHP appended — passes `getimagesize()`) | **rejected** |
| `fake.png` (plain text) | rejected |
| 9 files at once | rejected — max 8 |
| Unauthenticated | `UNAUTHORIZED` |
| Customer session | `FORBIDDEN` |

The trojan case is the one that matters: it is a genuinely valid image, so type checks alone pass it. The full-file content scan catches it.

## 9. Sensitive file exposure — mitigated

**Two independent layers.**

*Apache* — eight `.htaccess` files deny `config/`, `database/`, `storage/`, `api/config/`, `api/lib/`, all dotfiles, and every `.sql`/`.md`/`.log`/`.ts` file.

*PHP* — because a host with `AllowOverride None` would silently ignore all of the above, all 15 library files in `api/lib/` and `api/config/` begin with a direct-access guard:

```php
if (isset($_SERVER['SCRIPT_FILENAME']) && realpath($_SERVER['SCRIPT_FILENAME']) === realpath(__FILE__)) {
    http_response_code(404);
    exit;
}
```

Included normally: no effect. Requested directly: `404`.

**Verified.** With `.htaccess` deliberately not in play (PHP's built-in server ignores it), `/api/lib/auth.php`, `/api/config/database.php`, `/api/lib/pricing.php` and `/api/config/security.php` all returned **404**, while every real endpoint continued to work.

**Credentials.** `config/config.php` is git-ignored, documented as `chmod 600`, and `scripts/package-release.mjs` aborts if it ever appears in the release bundle. No secret is ever sent to JavaScript — `/api/site/index.php` exposes only `gatewayEnabled`, `siteUrl` and `packSize`.

## 10. Information disclosure — mitigated

Internal exceptions are caught, logged to `storage/logs/` with context, and returned to the client as a generic `DB_ERROR`/`INTERNAL` message in Persian. Stack traces, SQL and file paths never reach the browser. `display_errors` is forced off when `app.env` is `production`.

Another customer's order returns `404`, not `403`, so the API does not confirm that the record exists.

**Verified.** A foreign order ID → `NOT_FOUND`. A malformed body → `INVALID_REQUEST`. A 1.1 MB payload → `PAYLOAD_TOO_LARGE` (413).

## 11. Security headers

Sent by PHP on every API response and by Apache on every static response:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY            (SAMEORIGIN for pages)
Referrer-Policy: strict-origin-when-cross-origin
Cache-Control: no-store          (API only)
Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=()
```

HSTS is present but commented out in `.htaccess`, to be enabled after the certificate is confirmed working (README step 13).

## 12. OTP handling

Codes are stored as `HMAC-SHA256(code, app.secret + mobile + purpose)` — never in plaintext. TTL 120 s, 5 attempts, single-use via `consumed_at`. The attempt counter increments **before** the comparison, and the comparison uses `hash_equals()`.

`devCode` is returned only when `app.env !== 'production'` **and** `otp.expose_dev_code` is true. Both conditions are required, so the production default cannot leak a code.

**Verified.** A wrong code was rejected; the correct code authenticated; **replaying the same code returned `OTP_NOT_FOUND`**.

---

## Residual risks

1. **Shared hosting is shared.** Another compromised account on the same server may be able to read your files. This is inherent to the hosting tier.
2. **No WAF.** Consider Cloudflare's free tier in front of the domain.
3. **The rescue panel is a back door by design.** It is token-gated, rate-limited and audited — but delete it after setup.
4. **No 2FA for admins.** Password + rate limiting only. Use a long, unique password.
5. **Rate limits are per-IP.** A distributed attack from many addresses dilutes them.
6. **Audit logs are not tamper-proof.** An attacker with database write access could edit them. Back up regularly.
7. **`.htaccess` depends on `AllowOverride`.** If the host disables it, the PHP guards still protect library files, but the static-file rules (including the uploads lockdown) would not apply. Verify the checklist in README step 18 on the live host.

## Pre-launch checklist

- [ ] `app.env = 'production'`, `app.debug = false`
- [ ] `app.secret` unique, 32+ characters
- [ ] `otp.expose_dev_code = false`
- [ ] `config/config.php` is `chmod 600`
- [ ] `rescue/` deleted, `rescue_token` emptied
- [ ] HTTPS forced, HSTS considered
- [ ] `/config/config.php`, `/api/lib/auth.php`, `/database/seed.sql` all return 403/404 **on the live host**
- [ ] `/uploads/` shows no directory listing
- [ ] Admin password 10+ characters, not reused
- [ ] Backups configured
