/**
 * ═══════════════════════════════════════════════════════════════════════════
 * REST path  →  PHP file path
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * The React app was written against Next.js route handlers, where a folder IS
 * an endpoint and `[id]` is a path segment:
 *
 *     PATCH /api/admin/products/42/stock
 *
 * Apache on shared hosting maps URLs to real files, so the same endpoint is:
 *
 *     PATCH /api/admin/product-stock.php?id=42
 *
 * Rewriting every component would mean touching ~50 call sites and risking the
 * UI. Instead every request funnels through this one resolver, so the
 * components keep their original, readable paths and the mapping lives in a
 * single auditable file.
 *
 * This is pure string manipulation in the browser. It grants no access: the
 * PHP endpoints authenticate and authorise every request on their own.
 *
 * `NEXT_PUBLIC_API_BASE` lets the dev frontend (localhost:3000) talk to a
 * remote API; empty means same-origin, which is what production uses.
 */

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE ?? '').replace(/\/+$/, '');

/** Rules are tried in order; the first regex that matches wins. */
type Rule = { pattern: RegExp; build: (m: RegExpMatchArray) => string };

const RULES: Rule[] = [
  // ── account ───────────────────────────────────────────────────────────────
  { pattern: /^\/api\/account\/addresses\/([^/?]+)\/default$/, build: (m) => `/api/account/address.php?id=${enc(m[1])}&action=default` },
  { pattern: /^\/api\/account\/addresses\/([^/?]+)$/,          build: (m) => `/api/account/address.php?id=${enc(m[1])}` },
  { pattern: /^\/api\/account\/addresses$/,                    build: () => '/api/account/addresses.php' },
  { pattern: /^\/api\/account\/profile$/,                      build: () => '/api/account/profile.php' },

  // ── auth ──────────────────────────────────────────────────────────────────
  { pattern: /^\/api\/auth\/([a-z-]+)$/,                       build: (m) => `/api/auth/${m[1]}.php` },
  { pattern: /^\/api\/admin-auth\/([a-z-]+)$/,                 build: (m) => `/api/admin-auth/${m[1]}.php` },

  // ── admin: products ───────────────────────────────────────────────────────
  { pattern: /^\/api\/admin\/products\/([^/?]+)\/stock$/,      build: (m) => `/api/admin/product-stock.php?id=${enc(m[1])}` },
  { pattern: /^\/api\/admin\/products\/([^/?]+)\/duplicate$/,  build: (m) => `/api/admin/product-duplicate.php?id=${enc(m[1])}` },
  { pattern: /^\/api\/admin\/products\/([^/?]+)\/inventory$/,  build: (m) => `/api/admin/product-inventory.php?id=${enc(m[1])}` },
  { pattern: /^\/api\/admin\/products\/([^/?]+)$/,             build: (m) => `/api/admin/product.php?id=${enc(m[1])}` },
  { pattern: /^\/api\/admin\/products$/,                       build: () => '/api/admin/products.php' },

  // ── admin: other collections (…/42 → singular.php?id=42) ──────────────────
  { pattern: /^\/api\/admin\/categories\/([^/?]+)$/,           build: (m) => `/api/admin/category.php?id=${enc(m[1])}` },
  { pattern: /^\/api\/admin\/categories$/,                     build: () => '/api/admin/categories.php' },
  { pattern: /^\/api\/admin\/orders\/([^/?]+)$/,               build: (m) => `/api/admin/order.php?id=${enc(m[1])}` },
  { pattern: /^\/api\/admin\/orders$/,                         build: () => '/api/admin/orders.php' },
  { pattern: /^\/api\/admin\/users\/([^/?]+)$/,                build: (m) => `/api/admin/user.php?id=${enc(m[1])}` },
  { pattern: /^\/api\/admin\/users$/,                          build: () => '/api/admin/users.php' },
  { pattern: /^\/api\/admin\/coupons\/([^/?]+)$/,              build: (m) => `/api/admin/coupon.php?id=${enc(m[1])}` },
  { pattern: /^\/api\/admin\/coupons$/,                        build: () => '/api/admin/coupons.php' },
  { pattern: /^\/api\/admin\/(dashboard|audit-logs|contact-messages|upload)$/, build: (m) => `/api/admin/${m[1]}.php` },

  // ── cart ──────────────────────────────────────────────────────────────────
  { pattern: /^\/api\/cart\/items\/([^/?]+)$/,                 build: (m) => `/api/cart/item.php?id=${enc(m[1])}` },
  { pattern: /^\/api\/cart\/items$/,                           build: () => '/api/cart/items.php' },
  { pattern: /^\/api\/cart$/,                                  build: () => '/api/cart/index.php' },

  // ── checkout & orders ─────────────────────────────────────────────────────
  { pattern: /^\/api\/checkout\/quote$/,                       build: () => '/api/checkout/quote.php' },
  { pattern: /^\/api\/checkout\/shipping$/,                    build: () => '/api/checkout/shipping.php' },
  { pattern: /^\/api\/checkout$/,                              build: () => '/api/checkout/index.php' },
  { pattern: /^\/api\/orders\/([^/?]+)$/,                      build: (m) => `/api/orders/detail.php?id=${enc(m[1])}` },
  { pattern: /^\/api\/orders$/,                                build: () => '/api/orders/index.php' },

  // ── storefront ────────────────────────────────────────────────────────────
  { pattern: /^\/api\/products\/([^/?]+)$/,                    build: (m) => `/api/products/detail.php?slug=${enc(m[1])}` },
  { pattern: /^\/api\/(products|categories|search|contact|wishlist|home|catalog|site)$/, build: (m) => `/api/${m[1]}/index.php` },
  { pattern: /^\/api\/payments\/(start|callback)$/,            build: (m) => `/api/payments/${m[1]}.php` },
  { pattern: /^\/api\/health$/,                                build: () => '/api/health.php' },
];

/**
 * Cookies must be sent cross-origin only when the API lives on another origin
 * (local dev against a remote API). Production is same-origin, where the
 * stricter value is correct.
 */
export const API_CREDENTIALS: RequestCredentials = API_BASE ? 'include' : 'same-origin';

/** True when the frontend is talking to a different origin than it was served from. */
export const API_IS_REMOTE = API_BASE !== '';

function enc(value: string): string {
  return encodeURIComponent(value);
}

/**
 * Translate an application API path into the real PHP URL.
 * Unmatched paths are returned untouched (already-resolved `.php` URLs pass
 * straight through), so this is safe to apply to every request.
 */
export function resolveApiPath(path: string): string {
  if (!path.startsWith('/api/')) return API_BASE + path;

  const queryStart = path.indexOf('?');
  const pathname = queryStart === -1 ? path : path.slice(0, queryStart);
  const search = queryStart === -1 ? '' : path.slice(queryStart + 1);

  for (const rule of RULES) {
    const match = pathname.match(rule.pattern);
    if (!match) continue;
    const resolved = rule.build(match);
    if (!search) return API_BASE + resolved;
    // Merge the caller's query string with any the rule already added.
    return API_BASE + resolved + (resolved.includes('?') ? '&' : '?') + search;
  }

  return API_BASE + path;
}
