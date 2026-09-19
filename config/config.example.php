<?php
/**
 * Nobel Kids — production configuration EXAMPLE.
 * ----------------------------------------------------------------------------
 * COPY THIS FILE TO  config/config.php  AND FILL IN YOUR REAL VALUES.
 *
 *   cp config/config.example.php config/config.php
 *
 * config.php is git-ignored and must NEVER be committed.
 * It is also blocked from the web by config/.htaccess — the browser can never
 * read it, only PHP can include it.
 *
 * In DirectAdmin the database name and user are usually PREFIXED with your
 * account name, e.g. account_nobel  /  account_nobeluser.
 */

return [

    // ───────────────────────── Database (MySQL / MariaDB) ───────────────────
    'db' => [
        'host'    => 'localhost',            // DirectAdmin: almost always localhost
        'port'    => 3306,
        'name'    => 'YOUR_DATABASE',        // e.g. nobel_shop  (often prefixed)
        'user'    => 'YOUR_DATABASE_USER',   // e.g. nobel_user
        'password'=> 'YOUR_DATABASE_PASSWORD',
        'charset' => 'utf8mb4',
    ],

    // ───────────────────────────── Application ──────────────────────────────
    'app' => [
        // Public site URL, no trailing slash. Used for canonical links,
        // payment callbacks and cookie security decisions.
        'url'   => 'https://example.com',

        // 'production' hides all internal error details from users.
        // Use 'development' ONLY on a local machine.
        'env'   => 'production',

        // Long random string — sign/hash secret for sessions, OTP codes, CSRF.
        // Generate one and NEVER share it:
        //   php -r "echo bin2hex(random_bytes(32));"
        'secret'=> 'CHANGE_ME_TO_A_LONG_RANDOM_STRING',

        'timezone' => 'Asia/Tehran',

        // Absolute path for server-side error logs. Must be writable by PHP and
        // OUTSIDE public_html when possible. Leave '' to use storage/logs.
        'log_dir'  => '',
    ],

    // ───────────────────────────── Sessions ─────────────────────────────────
    'session' => [
        'ttl_days'        => 30,     // login lifetime
        'cookie_customer' => 'nbl_session',
        'cookie_admin'    => 'nbl_admin_session',
        'cookie_guest'    => 'nbl_guest',
        // 'auto' → Secure flag on when the site URL is https. Force with true/false.
        'secure'          => 'auto',
    ],

    // ──────────────────────────────── OTP ───────────────────────────────────
    'otp' => [
        'ttl_seconds'            => 120,
        'max_attempts'           => 5,
        'resend_cooldown_seconds'=> 60,

        // DEVELOPMENT ONLY — both MUST stay false/empty in production.
        // expose_dev_code returns the OTP in the API response; static_code
        // makes every OTP the same. They are hard-disabled when env=production.
        'expose_dev_code'        => false,
        'static_code'            => '',
    ],

    // ──────────────────────────────── SMS ───────────────────────────────────
    // provider: 'console' (writes to log, no SMS sent) | 'kavenegar' | 'ghasedak'
    'sms' => [
        'provider' => 'console',
        'api_key'  => '',
        'sender'   => '',
        'template' => '',   // Kavenegar/Ghasedak OTP pattern name
    ],

    // ─────────────────────────────── Payments ───────────────────────────────
    // provider: 'manual' (invoice / bank transfer, confirmed by admin)
    //           | 'zarinpal' | 'idpay'
    'payment' => [
        'provider'     => 'manual',

        // Shows/hides the "pay online" radio in checkout. Keep false while the
        // gateway is not contracted yet; the quotation flow works regardless.
        // Unpaid gateway orders older than this are cancelled by api/cron/expire-orders.php.
        'unpaid_expire_minutes' => 60,
        'gateway_enabled' => false,

        'merchant_id'  => '',
        'access_token' => '',
        'callback_url' => '',      // e.g. https://example.com/api/payments/callback.php
        'sandbox'      => true,
    ],

    // ─────────────────────────────── Uploads ────────────────────────────────
    'uploads' => [
        'dir'          => '',              // '' → <project>/uploads
        'public_path'  => '/uploads',      // URL prefix
        'max_bytes'    => 5242880,         // 5 MB
        'max_width'    => 4000,
        'max_height'   => 4000,
    ],

    // ─────────────────────────────── Security ───────────────────────────────
    'security' => [
        // Extra origins allowed to call the API with credentials (CORS).
        // Same-origin needs NOTHING here. Only add a full origin such as
        // 'http://localhost:3000' while developing the frontend locally.
        'allowed_origins' => [],

        // Token for the emergency panel at /rescue/ (reset admin password,
        // health check). Leave EMPTY to disable the panel completely — that is
        // the right setting for a healthy site. Set it only while you need it,
        // then empty it again and delete the rescue/ folder.
        //   php -r "echo bin2hex(random_bytes(32));"
        'rescue_token' => '',

        // Token required to trigger api/cron/*.php over HTTPS (for hosts with
        // no real cron). Leave empty to allow CLI execution only.
        'cron_token' => '',
    ],
];
