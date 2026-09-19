<?php
/**
 * Nobel Kids — configuration for DOCKER.
 * ----------------------------------------------------------------------------
 * The Docker image copies this file to config/config.php at container start
 * (see docker/entrypoint.sh) ONLY when config/config.php does not already exist.
 *
 * Unlike the shared-hosting config, every value here comes from an ENVIRONMENT
 * VARIABLE, so you configure the stack from docker-compose.yml or `docker run -e`
 * without editing any file inside the image.
 *
 * Nothing secret is hard-coded. Defaults are development-friendly; override them
 * in production via the environment.
 */

declare(strict_types=1);

/** Read an env var, falling back when unset or empty. */
$env = static function (string $key, string $default = ''): string {
    $value = getenv($key);
    if ($value === false || $value === '') {
        return $default;
    }
    return $value;
};

/** Read a boolean-ish env var ("1", "true", "yes", "on"). */
$envBool = static function (string $key, bool $default = false) use ($env): bool {
    $raw = strtolower(trim($env($key, $default ? 'true' : 'false')));
    return in_array($raw, ['1', 'true', 'yes', 'on'], true);
};

/** Read an integer env var. */
$envInt = static function (string $key, int $default) use ($env): int {
    $raw = $env($key, (string) $default);
    return is_numeric($raw) ? (int) $raw : $default;
};

/**
 * app.secret must be stable across restarts, otherwise every session and every
 * pending OTP is invalidated on each container boot. The entrypoint generates
 * one into a persisted file the first time and exports it as APP_SECRET.
 */
$secret = $env('APP_SECRET');
if ($secret === '') {
    // Last-resort fallback so the container still boots; the entrypoint warns.
    $secret = 'docker-insecure-fallback-secret-change-me-0000000000000000';
}

/** CORS origins: comma-separated list, e.g. "http://localhost:3000,http://localhost:5173". */
$origins = array_values(array_filter(array_map('trim', explode(',', $env('ALLOWED_ORIGINS')))));

return [

    // ───────────────────────── Database (MySQL / MariaDB) ───────────────────
    // In docker-compose the host is the SERVICE NAME ("db"), not localhost.
    'db' => [
        'host'     => $env('DB_HOST', 'db'),
        'port'     => $envInt('DB_PORT', 3306),
        'name'     => $env('DB_NAME', 'nobel_kids'),
        'user'     => $env('DB_USER', 'nobel'),
        'password' => $env('DB_PASSWORD', 'nobel'),
        'charset'  => 'utf8mb4',
    ],

    // ───────────────────────────── Application ──────────────────────────────
    'app' => [
        'url'      => $env('APP_URL', 'http://localhost:8080'),
        'env'      => $env('APP_ENV', 'production'),
        'secret'   => $secret,
        'timezone' => $env('APP_TIMEZONE', 'Asia/Tehran'),
        // '' → <project>/storage/logs, which is a mounted volume in compose.
        'log_dir'  => $env('LOG_DIR', ''),
    ],

    // ───────────────────────────── Sessions ─────────────────────────────────
    'session' => [
        'ttl_days'        => $envInt('SESSION_TTL_DAYS', 30),
        'cookie_customer' => 'nbl_session',
        'cookie_admin'    => 'nbl_admin_session',
        'cookie_guest'    => 'nbl_guest',
        // 'auto' → Secure only when APP_URL is https. Correct for local http.
        'secure'          => 'auto',
    ],

    // ──────────────────────────────── OTP ───────────────────────────────────
    'otp' => [
        'ttl_seconds'             => $envInt('OTP_TTL_SECONDS', 120),
        'max_attempts'            => $envInt('OTP_MAX_ATTEMPTS', 5),
        'resend_cooldown_seconds' => $envInt('OTP_RESEND_COOLDOWN', 60),
        // Both are hard-disabled by the app when APP_ENV=production, whatever
        // is set here. Handy for local testing with APP_ENV=development.
        'expose_dev_code'         => $envBool('OTP_EXPOSE_DEV_CODE', false),
        'static_code'             => $env('OTP_STATIC_CODE'),
    ],

    // ──────────────────────────────── SMS ───────────────────────────────────
    'sms' => [
        'provider' => $env('SMS_PROVIDER', 'console'),
        'api_key'  => $env('SMS_API_KEY'),
        'sender'   => $env('SMS_SENDER'),
        'template' => $env('SMS_TEMPLATE'),
    ],

    // ─────────────────────────────── Payments ───────────────────────────────
    'payment' => [
        'provider'              => $env('PAYMENT_PROVIDER', 'manual'),
        'gateway_enabled'       => $envBool('PAYMENT_GATEWAY_ENABLED', false),
        'unpaid_expire_minutes' => $envInt('PAYMENT_UNPAID_EXPIRE_MINUTES', 60),
        'merchant_id'           => $env('PAYMENT_MERCHANT_ID'),
        'access_token'          => $env('PAYMENT_ACCESS_TOKEN'),
        'callback_url'          => $env('PAYMENT_CALLBACK_URL'),
        'sandbox'               => $envBool('PAYMENT_SANDBOX', true),
    ],

    // ─────────────────────────────── Uploads ────────────────────────────────
    'uploads' => [
        'dir'         => $env('UPLOADS_DIR', ''),   // '' → <project>/uploads (a volume)
        'public_path' => '/uploads',
        'max_bytes'   => $envInt('UPLOADS_MAX_BYTES', 5242880),
        'max_width'   => $envInt('UPLOADS_MAX_WIDTH', 4000),
        'max_height'  => $envInt('UPLOADS_MAX_HEIGHT', 4000),
    ],

    // ─────────────────────────────── Security ───────────────────────────────
    'security' => [
        'allowed_origins' => $origins,
        'rescue_token'    => $env('RESCUE_TOKEN'),
        'cron_token'      => $env('CRON_TOKEN'),
    ],
];
