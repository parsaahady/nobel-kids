<?php
/**
 * Nobel Kids — application bootstrap.
 *
 * Loads config/config.php, sets safe defaults, error handling and timezone.
 * Every API endpoint includes this file FIRST (directly or via _bootstrap.php).
 */

declare(strict_types=1);

// ─────────────────────────── Direct-access guard ────────────────────────────
// This file is a library include, never a web endpoint. api/.htaccess already
// blocks the path, but a host with AllowOverride None would ignore that, so we
// refuse to run when requested directly. Defence in depth, zero cost.
if (isset($_SERVER['SCRIPT_FILENAME']) && realpath($_SERVER['SCRIPT_FILENAME']) === realpath(__FILE__)) {
    http_response_code(404);
    exit;
}

if (defined('NOBEL_APP_LOADED')) {
    return;
}
define('NOBEL_APP_LOADED', true);

define('NOBEL_ROOT', dirname(__DIR__, 2));          // project root
define('NOBEL_API_ROOT', dirname(__DIR__));         // /api

/**
 * Reads the configuration exactly once.
 *
 * @return array<string,mixed>
 */
function nobel_config(): array
{
    static $config = null;
    if ($config !== null) {
        return $config;
    }

    $file = NOBEL_ROOT . '/config/config.php';
    if (!is_file($file)) {
        // Do NOT leak the filesystem path to the browser.
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => false,
            'error' => [
                'code' => 'CONFIG_MISSING',
                'message' => 'پیکربندی سرور کامل نیست؛ فایل config/config.php ساخته نشده است.',
            ],
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    /** @var array<string,mixed> $loaded */
    $loaded = require $file;

    $defaults = [
        'db' => ['host' => 'localhost', 'port' => 3306, 'name' => '', 'user' => '', 'password' => '', 'charset' => 'utf8mb4'],
        'app' => ['url' => '', 'env' => 'production', 'secret' => '', 'timezone' => 'Asia/Tehran', 'log_dir' => ''],
        'session' => ['ttl_days' => 30, 'cookie_customer' => 'nbl_session', 'cookie_admin' => 'nbl_admin_session', 'cookie_guest' => 'nbl_guest', 'secure' => 'auto'],
        'otp' => ['ttl_seconds' => 120, 'max_attempts' => 5, 'resend_cooldown_seconds' => 60, 'expose_dev_code' => false, 'static_code' => ''],
        'sms' => ['provider' => 'console', 'api_key' => '', 'sender' => '', 'template' => ''],
        'payment' => ['provider' => 'manual', 'merchant_id' => '', 'access_token' => '', 'callback_url' => '', 'sandbox' => true],
        'uploads' => ['dir' => '', 'public_path' => '/uploads', 'max_bytes' => 5242880, 'max_width' => 4000, 'max_height' => 4000],
        'security' => ['allowed_origins' => []],
    ];

    $config = [];
    foreach ($defaults as $section => $values) {
        $config[$section] = array_merge($values, is_array($loaded[$section] ?? null) ? $loaded[$section] : []);
    }

    return $config;
}

/**
 * Dot-path config reader: cfg('db.host'), cfg('app.env').
 */
function cfg(string $path, mixed $fallback = null): mixed
{
    $parts = explode('.', $path);
    $value = nobel_config();
    foreach ($parts as $part) {
        if (!is_array($value) || !array_key_exists($part, $value)) {
            return $fallback;
        }
        $value = $value[$part];
    }
    return $value;
}

function nobel_is_production(): bool
{
    return strtolower((string) cfg('app.env', 'production')) !== 'development';
}

function nobel_site_url(): string
{
    $url = rtrim((string) cfg('app.url', ''), '/');
    if ($url !== '') {
        return $url;
    }
    // Fall back to the current host so a half-configured install still works.
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = (string) ($_SERVER['HTTP_HOST'] ?? 'localhost');
    return $scheme . '://' . $host;
}

function nobel_secret(): string
{
    $secret = (string) cfg('app.secret', '');
    if ($secret === '' || $secret === 'CHANGE_ME_TO_A_LONG_RANDOM_STRING') {
        if (nobel_is_production()) {
            nobel_log('error', 'config.secret_missing', []);
            nobel_fail_hard('CONFIG_INVALID', 'کلید امنیتی سرور تنظیم نشده است؛ با مدیر سایت تماس بگیرید.');
        }
        return 'nobel-development-only-secret';
    }
    return $secret;
}

/** Absolute path of the log directory (created on demand). */
function nobel_log_dir(): string
{
    $dir = (string) cfg('app.log_dir', '');
    if ($dir === '') {
        $dir = NOBEL_ROOT . '/storage/logs';
    }
    if (!is_dir($dir)) {
        @mkdir($dir, 0775, true);
    }
    return $dir;
}

/**
 * Structured server-side logging. Sensitive keys are redacted.
 *
 * @param array<string,mixed> $meta
 */
function nobel_log(string $level, string $event, array $meta = []): void
{
    static $sensitive = ['code', 'otp', 'password', 'token', 'secret', 'authorization', 'cookie', 'api_key', 'apikey', 'hash'];

    $redact = static function (array $data) use (&$redact, $sensitive): array {
        $out = [];
        foreach ($data as $key => $value) {
            $lower = strtolower((string) $key);
            $hit = false;
            foreach ($sensitive as $needle) {
                if (str_contains($lower, $needle)) {
                    $hit = true;
                    break;
                }
            }
            if ($hit) {
                $out[$key] = '[redacted]';
            } elseif (is_array($value)) {
                $out[$key] = $redact($value);
            } else {
                $out[$key] = $value;
            }
        }
        return $out;
    };

    $line = json_encode([
        'ts' => date('c'),
        'level' => $level,
        'event' => $event,
    ] + $redact($meta), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    $file = nobel_log_dir() . '/app-' . date('Y-m-d') . '.log';
    @file_put_contents($file, $line . PHP_EOL, FILE_APPEND | LOCK_EX);
}

/** MySQL DATETIME → ISO-8601 (what the TypeScript DTOs expect). Null-safe. */
function iso_date(?string $mysqlDateTime): ?string
{
    if ($mysqlDateTime === null || $mysqlDateTime === '') {
        return null;
    }
    $ts = strtotime($mysqlDateTime);
    return $ts === false ? null : date('c', $ts);
}

/** Emergency exit with a safe JSON error (used before the response layer loads). */
function nobel_fail_hard(string $code, string $message, int $status = 500): never
{
    if (!headers_sent()) {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
    }
    echo json_encode(['success' => false, 'error' => ['code' => $code, 'message' => $message]], JSON_UNESCAPED_UNICODE);
    exit;
}

// ─────────────────────────── Runtime hardening ──────────────────────────────

date_default_timezone_set((string) cfg('app.timezone', 'Asia/Tehran'));

// Never print PHP errors/stack traces to the browser in production.
ini_set('display_errors', nobel_is_production() ? '0' : '1');
ini_set('log_errors', '1');
error_reporting(E_ALL);

set_error_handler(static function (int $severity, string $message, string $file = '', int $line = 0): bool {
    if (!(error_reporting() & $severity)) {
        return false;
    }
    nobel_log('error', 'php.error', ['message' => $message, 'file' => basename($file), 'line' => $line]);
    return false; // keep normal handling (so it also reaches the PHP log)
});

set_exception_handler(static function (Throwable $e): void {
    nobel_log('error', 'php.uncaught', [
        'message' => $e->getMessage(),
        'file' => basename($e->getFile()),
        'line' => $e->getLine(),
    ]);
    nobel_fail_hard('INTERNAL_ERROR', 'خطای داخلی سرور رخ داد؛ لطفاً دوباره تلاش کنید.');
});
