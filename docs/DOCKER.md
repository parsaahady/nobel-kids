# اجرای پروژه با داکر
# Running Nobel Kids with Docker

Two containers: **app** (PHP 8.3 + Apache serving the static site and the API) and **db** (MariaDB 11). The image is built in two stages, so the final image contains **no Node.js** — only the compiled static site and the PHP backend, exactly like the shared-hosting deployment.

---

## شروع سریع / Quick start

```bash
docker compose up -d --build
```

First boot takes a few minutes (Node builds the frontend). Watch it:

```bash
docker compose logs -f app
```

You should see:

```
[nobel] generated a new app.secret (stored in the storage volume)
[nobel] created config/config.php from the Docker template (reads env vars)
[nobel] waiting for MySQL at db:3306 ...
[nobel] database is up
[nobel] database looks empty (0 tables) — importing schema.sql
[nobel] schema imported
[nobel] importing seed.sql (products, categories, settings)
[nobel] seed imported
[nobel] admin password set for 09120000000
[nobel] ready — starting apache2-foreground
```

Then open:

| URL | What |
|---|---|
| http://localhost:8080 | storefront |
| http://localhost:8080/admin/login/ | admin panel |
| http://localhost:8080/api/health.php | health check |

**Default admin:** `09120000000` / `ChangeMe_Admin123` — change it in `docker-compose.yml` before doing anything real.

---

## دستورات روزمره / Everyday commands

```bash
docker compose up -d --build     # build and start
docker compose logs -f app       # follow app logs
docker compose logs -f db        # follow database logs
docker compose ps                # status + health
docker compose restart app       # restart just the app
docker compose down              # stop, KEEP data
docker compose down -v           # stop and DELETE all data (fresh start)
docker compose exec app bash     # shell inside the app container
docker compose exec db mariadb -unobel -pnobel_db_password nobel_kids   # SQL shell
```

---

## What happens on boot

The entrypoint (`docker/entrypoint.sh`) runs before Apache, every time:

1. **Persistent secret.** `app.secret` signs sessions and hashes OTP codes. It is generated once into the `storage` volume and reused, so **restarting does not log everybody out**. Set `APP_SECRET` explicitly to control it yourself.
2. **Config.** Writes `config/config.php` from `config/config.docker.php`, which reads every value from environment variables. A bind-mounted `config/config.php` is always respected instead.
3. **Wait for MySQL.** Polls for up to 60 s; fails loudly with a useful message rather than crash-looping.
4. **Import.** Counts real tables. Fewer than 20 → imports `schema.sql`, then `seed.sql`. Otherwise skips. **Restarting never re-seeds or wipes data.**
5. **Admin bootstrap.** If `ADMIN_MOBILE` + `ADMIN_PASSWORD` are set *and* that account has no password yet, sets it. An existing password is never overwritten.
6. **Permissions.** Fixes ownership on the `uploads` and `storage` volumes for `www-data`.

---

## متغیرهای محیطی / Environment variables

Set these in `docker-compose.yml` under `app.environment`.

### Database
| Variable | Default | Notes |
|---|---|---|
| `DB_HOST` | `db` | the compose **service name**, not `localhost` |
| `DB_PORT` | `3306` | |
| `DB_NAME` | `nobel_kids` | |
| `DB_USER` | `nobel` | |
| `DB_PASSWORD` | `nobel` | must match the `db` service |

### Application
| Variable | Default | Notes |
|---|---|---|
| `APP_URL` | `http://localhost:8080` | used for canonical links, callbacks, cookie `Secure` |
| `APP_ENV` | `production` | `development` enables dev OTP codes |
| `APP_SECRET` | auto-generated | 64 hex chars; **set it explicitly in production** |
| `APP_TIMEZONE` | `Asia/Tehran` | |

### First-boot admin
| Variable | Notes |
|---|---|
| `ADMIN_MOBILE` | e.g. `09120000000` |
| `ADMIN_PASSWORD` | 8+ characters; ignored if the account already has one |

### OTP / SMS
| Variable | Default | Notes |
|---|---|---|
| `OTP_EXPOSE_DEV_CODE` | `false` | returns the code in the API response; **forced off when `APP_ENV=production`** |
| `SMS_PROVIDER` | `console` | `console` \| `kavenegar` \| `ghasedak` |
| `SMS_API_KEY`, `SMS_SENDER`, `SMS_TEMPLATE` | | for real providers |

### Payments
| Variable | Default |
|---|---|
| `PAYMENT_PROVIDER` | `manual` (`zarinpal` \| `idpay`) |
| `PAYMENT_GATEWAY_ENABLED` | `false` |
| `PAYMENT_MERCHANT_ID`, `PAYMENT_CALLBACK_URL`, `PAYMENT_SANDBOX` | |

### Other
| Variable | Notes |
|---|---|
| `RESCUE_TOKEN` | enables `/rescue/`; empty = disabled |
| `CRON_TOKEN` | allows triggering cron over HTTP |
| `ALLOWED_ORIGINS` | comma-separated extra CORS origins |
| `SKIP_SEED=1` | import schema but no demo products |
| `SKIP_DB_WAIT=1` | skip the readiness probe (external database) |

---

## ورود با OTP در داکر / Logging in without an SMS provider

With the defaults (`APP_ENV=development`, `OTP_EXPOSE_DEV_CODE=true`) the OTP is returned by the API, so you can log in as a customer with no SMS account:

```bash
curl -s -X POST http://localhost:8080/api/auth/request-otp.php \
  -H 'Content-Type: application/json' -H 'Origin: http://localhost:8080' \
  -d '{"mobile":"09121234567"}'
# → {"ok":true,"data":{"sent":true,"expiresIn":120,"devCode":"123456"}}
```

The code also appears in `docker compose logs app`.

> Set `APP_ENV=production` for anything public. The dev code is then hard-disabled regardless of `OTP_EXPOSE_DEV_CODE`.

---

## داده‌ها و پشتیبان‌گیری / Data and backups

Three named volumes:

| Volume | Contents |
|---|---|
| `db_data` | the MySQL database |
| `uploads_data` | uploaded product images |
| `storage_data` | logs and the generated `app.secret` |

`docker compose down` keeps them. `docker compose down -v` **deletes** them.

**Backup:**
```bash
docker compose exec db mariadb-dump -unobel -pnobel_db_password \
  --default-character-set=utf8mb4 nobel_kids > backup.sql

docker run --rm -v nobel-kids_uploads_data:/data -v "$PWD":/out \
  alpine tar czf /out/uploads-backup.tar.gz -C /data .
```

**Restore:**
```bash
docker compose exec -T db mariadb -unobel -pnobel_db_password nobel_kids < backup.sql
```

---

## داده‌ای که در HTML پخته می‌شود / How the build gets its data

The image tries three sources, in order:

1. **A pre-built `out/`** — if you comment `out` out of `.dockerignore` and run
   `npm run build` yourself first, the image copies that folder verbatim and
   skips the Node build entirely. Fastest, and the HTML is exactly what you
   tested.
2. **The live API** — set `--build-arg NEXT_PUBLIC_API_BASE=...` (see below).
   Freshest prices and stock.
3. **`database/seed.sql`** — the automatic offline fallback. No API and no
   database needed; the export still contains all 17 products.

Tier 3 is what happens on a plain `docker compose up -d --build`, so the build
always succeeds. Prices and stock then come from the seed file, which is fine
for a first look but goes stale once you edit products — the live site is always
correct either way, because the browser re-fetches from the API.

## SEO: baking live product data into the HTML

By default the image builds from the seed file. For a public site you usually
want the HTML to carry your real, current catalogue.

Once the stack is running, rebuild against it so the HTML contains real product names and prices:

```bash
# 1. start normally
docker compose up -d --build

# 2. rebuild the frontend against the now-live API
docker compose build --build-arg NEXT_PUBLIC_API_BASE=http://host.docker.internal:8080 app
docker compose up -d app
```

On Linux, use your host IP instead of `host.docker.internal`, or run
`npm run build && npm run package` on the host and mount `out/`.

Repeat this whenever you add products and want them in the static HTML. Products always appear on the live site immediately either way.

---

## زمان‌بندی / Scheduled jobs

Only needed when an online payment gateway is enabled. It cancels abandoned payments and returns their stock every 15 minutes:

```bash
docker compose --profile cron up -d
```

---

## عیب‌یابی / Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `app` restarts in a loop | database not ready or wrong credentials | `docker compose logs app`; check `DB_*` match the `db` service |
| `CONFIG_MISSING` in the browser | entrypoint did not run | make sure you did not override `entrypoint` |
| Empty product pages | built without live data | see the SEO section above |
| Build fails: `returned an empty array from generateStaticParams()` | old Dockerfile with no seed fallback | update to the current Dockerfile — it falls back to `database/seed.sql` |
| Images upload but 404 | `uploads` volume permissions | `docker compose exec app chown -R www-data:www-data /var/www/html/uploads` |
| Persian text shows as `?` | database not utf8mb4 | `docker compose down -v` and start again (compose sets it correctly) |
| Port 8080 in use | something else is bound | change `ports:` to e.g. `"9090:80"` |
| Build fails: `Unable to locate package libfreetype6-dev` | you edited the Dockerfile back to the old package names | use `libfreetype-dev` / `libjpeg-dev` — the `6`/`62-turbo` names were removed in Debian trixie |
| Uploads rejected as "not a valid image" | gd lost a codec | the build asserts this; rebuild with `--no-cache` |
| Logged out after every restart | `app.secret` not persisted | keep the `storage_data` volume, or set `APP_SECRET` explicitly |
| Cannot log in as admin | the account already had a password | set `RESCUE_TOKEN` and use `/rescue/`, or reset via SQL |

**Logs:**
```bash
docker compose logs -f app                                     # boot + Apache
docker compose exec app tail -f /var/www/html/storage/logs/*.log   # application errors
```

---

## رفتن به محیط واقعی / Production notes

This compose file is tuned for local use. Before exposing it publicly:

1. **Change every password** — `MARIADB_PASSWORD`, `MARIADB_ROOT_PASSWORD`, `ADMIN_PASSWORD`.
2. **Set `APP_ENV=production`** and remove `OTP_EXPOSE_DEV_CODE`.
3. **Set `APP_SECRET`** explicitly (64 hex chars) and keep it safe.
4. **Set `APP_URL`** to your real `https://` domain — this is what turns on the `Secure` cookie flag.
5. **Put a TLS terminator in front** (nginx, Traefik, Caddy, or Cloudflare). The container speaks plain HTTP on port 80.
6. **Remove `ADMIN_MOBILE`/`ADMIN_PASSWORD`** after the first login.
7. **Do not publish the database port.**
8. **Configure a real SMS provider**, otherwise customers cannot log in.
9. Work through the checklist in `docs/SECURITY.md`.

The container honours every `.htaccess` in the project (`AllowOverride All`), including `uploads/.htaccess`, which disables PHP execution in the upload directory. What you test here behaves the same on DirectAdmin.

---

## چرا تصویر پایه پین شده است / Why the base image is pinned

The runtime stage uses `php:8.3-apache-trixie`, not the bare `php:8.3-apache`.

The unqualified tag follows Debian's current stable release, and in 2025 it moved
from **bookworm** to **trixie**. That rename broke a package this image installs:

| bookworm | trixie |
|---|---|
| `libfreetype6-dev` | `libfreetype-dev` |
| `libjpeg62-turbo-dev` | `libjpeg-dev` |

Builds that had worked for months suddenly failed with
`E: Unable to locate package libfreetype6-dev` (apt exit code 100).

Two protections are now in place:

1. **The suite is pinned**, so the base image cannot change underneath you.
2. **The package names used are valid on both suites**, so moving the pin
   forward to a future Debian release will not reintroduce the problem.

The build also **asserts its own result** — it fails immediately if `pdo_mysql`,
`mysqli` or `gd` is missing, or if gd was built without JPEG, PNG, WebP or
FreeType support. A broken image can no longer reach production silently.
