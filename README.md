# نوبل کیدز — فروشگاه عمده پوشاک بچگانه
# Nobel Kids — Wholesale Kids' Clothing Store

RTL Persian storefront for wholesale children's clothing: pack-based ordering, tiered discounts, quotations, OTP login, and a full admin panel.

**Architecture:** static Next.js frontend + PHP 8 / MySQL REST API.
Runs on ordinary DirectAdmin shared hosting — no Node.js, Docker, PostgreSQL or SSH in production.

---

## Quick start

### With Docker (fastest way to see it running)

```bash
docker compose up -d --build
```

Open <http://localhost:8080>. Admin: `09120000000` / `ChangeMe_Admin123`.
First boot imports the schema and demo products automatically.
Full guide: **[docs/DOCKER.md](docs/DOCKER.md)**.

### Deploying to a host
Read **[README-DEPLOYMENT.md](README-DEPLOYMENT.md)** — 22 numbered steps, DirectAdmin-specific.

```bash
npm install
npm run build      # fetch data → export static site
npm run package    # assemble release/
```
Upload the contents of `release/` to `public_html/`.

### Local development

**Option A — everything local** (one origin, mirrors production):
```bash
# 1. create the database, then import:
#    database/schema.sql  then  database/seed.sql
# 2. cp config/config.example.php config/config.php  and fill in the db block
npm run build
php -S 0.0.0.0:8080 -t . .dev-router.php
```

**Option B — Next dev server against a remote API** (hot reload):
```bash
NEXT_PUBLIC_API_BASE=https://your-domain.com npm run dev
```
Add `http://localhost:3000` to `security.allowed_origins` on the remote.

---

## Documentation

| Document | Contents |
|---|---|
| [README-DEPLOYMENT.md](README-DEPLOYMENT.md) | step-by-step DirectAdmin deployment |
| [docs/API.md](docs/API.md) | every endpoint, parameters, error codes |
| [docs/MIGRATION.md](docs/MIGRATION.md) | old → new architecture, what changed and why |
| [docs/SECURITY.md](docs/SECURITY.md) | threat-by-threat audit with verification results |
| [docs/TESTING.md](docs/TESTING.md) | 111 verified checks + your post-deploy checklist |
| [docs/FILE-CHANGES.md](docs/FILE-CHANGES.md) | complete added / modified / deleted inventory |
| [docs/DOCKER.md](docs/DOCKER.md) | running the stack in Docker |

---

## Layout

```
├── app/                  Next.js pages (static export)
├── components/           React UI — Tailwind + Framer Motion
├── lib/                  api-client, api-routes, pricing, static-data
├── api/                  ★ PHP backend
│   ├── config/             config, PDO, JSON envelope, security
│   ├── lib/                business logic
│   ├── admin/              admin endpoints
│   └── cron/               scheduled jobs
├── config/               config.example.php (real config.php is git-ignored)
├── database/             schema.sql, seed.sql
├── rescue/               emergency panel — delete after setup
├── scripts/              build-data, sitemap, packaging
├── docker/               container entrypoint
└── uploads/              user uploads (PHP execution disabled)
```

## Business rules

- Pack size **5**; orders in whole packs
- Tiered discounts: 3+ packs → 4%, 6+ packs → 8%
- Prices round to the nearest 1,000 Toman
- Assorted or single-size packs
- Quotations (`NBLQ-…`) and paid orders (`NBL-…`)
- All pricing recomputed server-side at checkout — client values are never trusted

## Stack

**Frontend:** Next.js 16 (static export), React 19, Tailwind CSS, Framer Motion, lucide-react, Vazirmatn
**Backend:** PHP 8.1+, PDO, MySQL 5.7+/MariaDB 10.3+
**Production requirements:** Apache with `mod_rewrite`. That is all.
**Optional:** Docker, for local development or self-hosting on a VPS.

## Security

Prepared statements everywhere · server-side sessions with HMAC-hashed tokens · HttpOnly/SameSite cookies · origin-checked writes · role checks in PHP on every request · rate limiting · hashed OTPs · multi-layer upload validation · PHP execution disabled in `uploads/`.

Full detail and verification results: [docs/SECURITY.md](docs/SECURITY.md).

> Before going live, work through the checklists in `README-DEPLOYMENT.md` and `docs/SECURITY.md`.
