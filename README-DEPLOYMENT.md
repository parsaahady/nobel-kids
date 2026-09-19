# راهنمای استقرار نوبل کیدز روی هاست دایرکت‌ادمین
# Nobel Kids — DirectAdmin Deployment Guide

> **What you need:** a DirectAdmin account with PHP 8.1+ and MySQL/MariaDB, FTP or File Manager access, and phpMyAdmin.
> **What you do NOT need:** SSH, Node.js on the server, Docker, PostgreSQL, Redis, Vercel, or any paid external service.

The site is a **static frontend + PHP API**. The browser downloads plain HTML/CSS/JS, then talks to `/api/*.php` on the same domain. Nothing else runs on the server.

---

## Part 0 — Before you start (on your own computer)

You only need Node.js locally to *build* the site. The output is static files.

```bash
npm install
npm run build      # fetches data from the API, then exports to out/
npm run package    # assembles release/ — exactly what goes on the server
```

`release/` is now a mirror of what `public_html/` should contain.

> **First deployment, chicken-and-egg:** the build wants a live API for product data, but there is no server yet. That is fine — run the build anyway. It prints warnings and writes empty fallbacks; the exported pages will fill themselves in from the live API in the browser. After step 14, re-run `npm run build && npm run package` and re-upload `out/`'s contents so the HTML is pre-filled for search engines.

---

## Part 1 — Database

### Step 1 — Create the database
DirectAdmin → **Account Manager → MySQL Management → Create new Database**.

- Database Name: `nobelkids` (DirectAdmin prefixes it, e.g. `myuser_nobelkids`)
- Database User: `nobel` (becomes `myuser_nobel`)
- Password: press **Random** and copy it somewhere safe.

Write down all three values — you need them in step 9.

### Step 2 — Open phpMyAdmin
DirectAdmin → **MySQL Management → phpMyAdmin**, then select your new database in the left sidebar.

### Step 3 — Set the connection charset
In phpMyAdmin click the **SQL** tab and run:

```sql
ALTER DATABASE `myuser_nobelkids` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Replace the name with your real database name. This guarantees Persian text and emoji store correctly.

### Step 4 — Import the schema
**Import** tab → **Choose File** → `database/schema.sql` → **Go**.

Expect: *Import has been successfully finished, 29 queries executed.* You should now see **24 tables and 5 views**.

> If you get `#1046 - No database selected`, you did not select the database in the sidebar first.

### Step 5 — Edit the admin mobile number
Open `database/seed.sql` in a text editor. Near the bottom find:

```sql
VALUES ('09120000000', 'مدیر نوبل', 'SUPER_ADMIN', 'ACTIVE', NULL, 1, NOW(), NOW())
```

Change `09120000000` to **your** mobile number. Save.

> The password is deliberately `NULL`. A password committed to a repository is a password everybody knows. You will set a real one in step 15, privately.

### Step 6 — Import the seed data
**Import** tab → `database/seed.sql` → **Go**.

This loads 4 categories, 17 products, images, colours, sizes, 156 variants, price tiers and shipping settings. It is **idempotent** — importing it twice changes nothing and never duplicates rows.

### Step 7 — Verify
Run this in the **SQL** tab:

```sql
SELECT
  (SELECT COUNT(*) FROM products)   AS products,
  (SELECT COUNT(*) FROM categories) AS categories,
  (SELECT COUNT(*) FROM product_variants) AS variants,
  (SELECT COUNT(*) FROM users WHERE role IN ('ADMIN','SUPER_ADMIN')) AS admins;
```

Expected: `products = 17`, `categories = 4`, `variants = 156`, `admins = 1`.

---

## Part 2 — Files

### Step 8 — Upload
DirectAdmin → **File Manager**, enter `public_html`, and upload **the contents of `release/`** (not the folder itself).

Fastest route: zip the *contents* of `release/`, upload the single `.zip`, then use File Manager's **Extract** action.

When finished, `public_html/` looks like this:

```
public_html/
├── .htaccess
├── index.html          ← homepage
├── 404.html
├── sitemap.xml
├── robots.txt
├── _next/              ← CSS and JS bundles
├── products/           ← one folder per product + photos
├── cart/  checkout/  contact/  account/  admin/
├── api/                ← PHP backend
├── config/             ← config.example.php (+ .htaccess)
├── database/           ← the .sql files
├── rescue/             ← emergency panel (deleted in step 16)
├── uploads/            ← writable, product photos land here
└── storage/logs/       ← writable, error log
```

### Step 9 — Create the real config file
In File Manager open `config/`, copy `config.example.php` to **`config.php`**, then edit it:

```php
'db' => [
    'host'     => 'localhost',
    'name'     => 'myuser_nobelkids',   // from step 1
    'user'     => 'myuser_nobel',
    'password' => 'THE_PASSWORD_YOU_SAVED',
    'charset'  => 'utf8mb4',
],

'app' => [
    'env'    => 'production',           // ← MUST be production on the live site
    'url'    => 'https://your-domain.com',
    'secret' => 'PASTE_64_RANDOM_CHARACTERS_HERE',
    'debug'  => false,
],
```

**`app.secret` matters.** It signs sessions and hashes OTP codes. Generate a unique value — never reuse the example:

- DirectAdmin has a password generator on the MySQL page (set length to 64), or
- use any password manager, or
- locally: `php -r "echo bin2hex(random_bytes(32));"`

### Step 10 — Set permissions
In File Manager, select each item and use **Change Permissions**:

| Path | Permission | Why |
|---|---|---|
| `uploads/` | `755` | PHP writes product photos here |
| `storage/` and `storage/logs/` | `755` | error log |
| `config/config.php` | `600` | contains the database password |
| all other folders | `755` | standard |
| all other files | `644` | standard |

> If `755` on `uploads/` does not work on your host, try `775`. Never use `777`.

### Step 11 — Confirm the `.htaccess` files arrived
Enable **Show hidden files** in File Manager (⚙ icon). You must see `.htaccess` in **all** of:

`public_html/` · `api/` · `api/config/` · `api/lib/` · `config/` · `database/` · `storage/` · `uploads/` · `rescue/`

These are the file-level security controls. If any is missing, re-upload it — FTP clients often skip dotfiles by default.

### Step 12 — Set the PHP version
DirectAdmin → **Account Manager → Select PHP Version** → choose **PHP 8.1 or newer** (8.2/8.3 recommended).

Required extensions (normally on by default): `pdo_mysql`, `mbstring`, `json`, `gd`, `curl`, `openssl`, `fileinfo`.

### Step 13 — Install the SSL certificate
DirectAdmin → **Account Manager → SSL Certificates** → *Free & automatic certificate from Let's Encrypt* → include both `domain.com` and `www.domain.com` → **Save**.

Then force HTTPS by editing `public_html/.htaccess` and **uncommenting** this block:

```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteCond %{HTTPS} !=on
    RewriteCond %{HTTP:X-Forwarded-Proto} !https
    RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
</IfModule>
```

> Do this **after** the certificate is issued. Forcing HTTPS first can lock you out of your own site.
> Session cookies are only marked `Secure` when `app.url` starts with `https://` — so this step is what makes logins safe.

---

## Part 3 — Verify and open the admin panel

### Step 14 — Health check
Visit **`https://your-domain.com/api/health.php`**. You want:

```json
{"ok":true,"data":{"status":"ok","checks":{"db":"up","schema":"ok","uploads":"writable"}}}
```

| Problem | Fix |
|---|---|
| `"db":"down"` | wrong credentials in `config.php` (step 9) — remember the DirectAdmin prefix |
| `"schema":"incomplete"` | `schema.sql` did not import fully (step 4) |
| `"uploads":"not writable"` | permissions (step 10) |
| Blank page or HTTP 500 | check `storage/logs/` in File Manager |
| PHP source shown as text | PHP is disabled for the domain (step 12) |

Then open **`https://your-domain.com/`** — the homepage with products should appear.

### Step 15 — Set the admin password
The admin account exists but cannot log in yet (no password). Set one through the rescue panel:

1. Edit `config/config.php` and put a long random value in the rescue token:
   ```php
   'security' => [
       'allowed_origins' => [],
       'rescue_token' => 'PASTE_A_LONG_RANDOM_STRING_HERE',
       'cron_token'   => '',
   ],
   ```
2. Open **`https://your-domain.com/rescue/`**
3. Enter that token.
4. In **تعیین رمز عبور مدیر** enter the mobile number from step 5 and a strong password (10+ characters). Submit.
5. Optionally press **اجرای بررسی** for a full system health report.

### Step 16 — Remove the rescue panel
This is a deliberate back door. Once you can log in:

1. Set `'rescue_token' => ''` in `config/config.php`, **and**
2. Delete the `rescue/` folder in File Manager.

Either alone disables it; do both.

### Step 17 — Log in
Go to **`https://your-domain.com/admin/login/`** and sign in with your mobile number and the password from step 15.

Check that the dashboard shows real numbers, then click through **محصولات / سفارش‌ها / دسته‌بندی‌ها / کاربران**.

### Step 18 — Test an upload
**محصولات → ویرایش** any product → add an image. It should upload and appear.

Then confirm the upload folder cannot execute code — visit:

`https://your-domain.com/uploads/`

You must get **403 Forbidden** or **404**, never a file listing.

---

## Part 4 — Going live

### Step 19 — Configure SMS (OTP login)
Customers log in with a one-time code. Out of the box the provider is `console`, which only writes the code to the log — **nobody can actually log in**. Pick a real provider in `config/config.php`:

```php
'sms' => [
    'provider' => 'kavenegar',          // 'console' | 'kavenegar' | 'ghasedak'
    'api_key'  => 'YOUR_API_KEY',
    'sender'   => '10008663',
    'template' => 'nobel-otp',          // Kavenegar lookup template name
],
'otp' => [
    'ttl_seconds'     => 120,
    'max_attempts'    => 5,
    'resend_cooldown' => 60,
    'expose_dev_code' => false,         // MUST stay false in production
],
```

Test it: open the site in a private window, click the account icon, request a code on your own phone.

### Step 20 — Configure payments (optional)
The store works without an online gateway: orders are placed as **quotations** (پیش‌فاکتور) and you confirm them by phone. That is the default.

To enable online payment:

```php
'payment' => [
    'gateway_enabled' => true,
    'provider'        => 'zarinpal',    // 'manual' | 'zarinpal' | 'idpay'
    'merchant_id'     => 'YOUR_MERCHANT_ID',
    'sandbox'         => false,
    'callback_url'    => 'https://your-domain.com/api/payments/callback.php',
],
```

Register that exact callback URL in your gateway dashboard. Test with a **real low-value purchase** (e.g. 1,000 Toman) before announcing the store.

### Step 21 — Schedule the cleanup job
Abandoned online payments hold stock. DirectAdmin → **Advanced Features → Cronjobs → Create**:

- Minute: `0,15,30,45`  Hour/Day/Month/Weekday: `*`
- Command:
  ```
  /usr/local/bin/php /home/USERNAME/domains/YOURDOMAIN/public_html/api/cron/expire-orders.php
  ```

Use the PHP path DirectAdmin shows on that page. Skip this step if you are not using an online gateway.

*No cron available?* Set `'cron_token' => 'SOME_RANDOM_STRING'` in `config.php` and point a free scheduler (cron-job.org) at
`https://your-domain.com/api/cron/expire-orders.php?token=SOME_RANDOM_STRING`.

### Step 22 — Take a backup
DirectAdmin → **Account Manager → Create/Restore Backups** → check *Database* and *Home Directory* → **Create Backup**.

Do this now, and after every content change you care about.

---

## Updating the site later

**Changed products, prices or stock?** Nothing to do — the admin panel writes to MySQL and the site reads it live.

**Want the new products baked into the static HTML for SEO?** On your computer:

```bash
NEXT_PUBLIC_API_BASE=https://your-domain.com npm run build
npm run package
```

Then upload the contents of `release/` again, **skipping** `config/`, `uploads/` and `database/` so you do not overwrite live data.

**Changed the design or code?** Same procedure.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Homepage loads, products missing | API unreachable | open `/api/health.php` and read the error |
| "اتصال به سرور برقرار نشد" | API returned non-JSON | check `storage/logs/`; usually a PHP error |
| Login code never arrives | SMS provider still `console` | step 19 |
| Logged out immediately | `app.secret` changed, or `app.url` ≠ real URL | fix `config.php`; changing the secret invalidates all sessions |
| Admin login says "تعداد تلاش‌ها بیش از حد" | 5 failed attempts | wait 15 minutes, or reset the password via `/rescue/` |
| Images 404 after upload | `uploads/` not writable, or `.htaccess` blocks images | steps 10 and 11 |
| Persian text shows as `???` | database not `utf8mb4` | step 3, then re-import |
| Clean URLs 404 (`/products/` fails) | `mod_rewrite` off or `.htaccess` missing | step 11; ask support to enable `AllowOverride All` |
| Everything is slow | shared-host MySQL | enable DirectAdmin's caching; consider a better plan |

**Where the logs are:** `storage/logs/` in File Manager — newest entries at the bottom. DirectAdmin's own error log is under **Account Manager → Error Log**.

---

## Security checklist before you announce the store

- [ ] `app.env` is `production` and `app.debug` is `false`
- [ ] `app.secret` is unique and 32+ characters
- [ ] `otp.expose_dev_code` is `false`
- [ ] `config/config.php` is `600` and never committed to git
- [ ] `rescue/` is deleted and `rescue_token` is empty
- [ ] HTTPS is forced (step 13) and the padlock shows
- [ ] `https://your-domain.com/config/config.php` returns **403**
- [ ] `https://your-domain.com/api/lib/auth.php` returns **403/404**
- [ ] `https://your-domain.com/database/seed.sql` returns **403**
- [ ] `https://your-domain.com/uploads/` shows no listing
- [ ] Admin password is 10+ characters and not reused
- [ ] A backup exists (step 22)

---

## What this deployment does NOT need

Node.js · Next.js runtime · Docker · PostgreSQL · Prisma · Redis · Vercel/Netlify · SSH · Composer · any paid third-party service (SMS and payment gateways are optional and Iranian).
