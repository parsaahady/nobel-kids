<?php
/**
 * Nobel Kids — security primitives.
 *
 *  • security headers            • CORS (never "*" with credentials)
 *  • CSRF / same-origin guard    • DB-backed rate limiting
 *  • input normalisation         • hashing helpers (OTP, sessions, passwords)
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

require_once __DIR__ . '/app.php';
require_once __DIR__ . '/database.php';
require_once __DIR__ . '/response.php';

// ─────────────────────────────── Headers / CORS ─────────────────────────────

function security_headers(): void
{
    if (headers_sent()) {
        return;
    }
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('Permissions-Policy: camera=(), microphone=(), geolocation=()');
    header('Cache-Control: no-store, max-age=0');
    header_remove('X-Powered-By');
}

/** Origin of the current request, or null when not sent (same-origin GET). */
function request_origin(): ?string
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    return $origin !== '' ? rtrim($origin, '/') : null;
}

function request_host(): string
{
    return (string) ($_SERVER['HTTP_X_FORWARDED_HOST'] ?? $_SERVER['HTTP_HOST'] ?? '');
}

/** The site's own origin, derived from app.url (fallback: current host). */
function self_origin(): string
{
    return rtrim(nobel_site_url(), '/');
}

/**
 * Origins allowed to send credentialed cross-origin requests.
 * Same-origin never needs this list.
 *
 * @return list<string>
 */
function allowed_origins(): array
{
    $list = cfg('security.allowed_origins', []);
    $out = [];
    if (is_array($list)) {
        foreach ($list as $origin) {
            $origin = rtrim(trim((string) $origin), '/');
            if ($origin !== '') {
                $out[] = $origin;
            }
        }
    }
    return $out;
}

/**
 * Emits CORS headers only for explicitly allowed origins.
 * NEVER sends Access-Control-Allow-Origin: * for credentialed APIs.
 */
function apply_cors(): void
{
    $origin = request_origin();
    if ($origin === null) {
        return;                       // same-origin request: nothing to do
    }
    if ($origin === self_origin()) {
        return;                       // exact same origin: no CORS needed
    }
    if (!in_array($origin, allowed_origins(), true)) {
        return;                       // not allowed → browser will block it
    }
    if (headers_sent()) {
        return;
    }
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
    header('Vary: Origin');
    header('Access-Control-Allow-Headers: Content-Type, X-Requested-With, X-CSRF-Token');
    header('Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS');
    header('Access-Control-Max-Age: 600');
}

/** Answers CORS preflight immediately. */
function handle_preflight(): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
        security_headers();
        apply_cors();
        http_response_code(204);
        exit;
    }
}

/**
 * Cookie names, resolved without depending on lib/auth.php (which loads later).
 * Kept in sync with the session config block.
 */
function cookie_name_customer_safe(): string
{
    return (string) cfg('session.cookie_customer', 'nbl_session');
}

function cookie_name_admin_safe(): string
{
    return (string) cfg('session.cookie_admin', 'nbl_admin_session');
}

/**
 * CSRF defence for state-changing requests.
 * Browsers always attach Origin on cross-site POST/PATCH/DELETE, so an Origin
 * that is neither our own nor explicitly allowed is rejected.
 */
function assert_same_origin(): void
{
    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    if (in_array($method, ['GET', 'HEAD', 'OPTIONS'], true)) {
        return;
    }

    $origin = request_origin();
    if ($origin === null) {
        // No Origin header. Fall back to Referer when the browser sent one.
        $referer = (string) ($_SERVER['HTTP_REFERER'] ?? '');
        if ($referer !== '') {
            $host = parse_url($referer, PHP_URL_HOST);
            $selfHost = parse_url(self_origin(), PHP_URL_HOST) ?: request_host();
            if ($host !== null && $host !== $selfHost) {
                throw err_forbidden('درخواست از منبع نامعتبر ارسال شده است');
            }
            return;
        }

        // Neither header present. Every current browser sends Origin on a
        // cross-site POST, so this is either a non-browser client or a stripped
        // request. If it carries one of OUR auth cookies we refuse it: a
        // cookie-authenticated write must prove where it came from. Requests
        // without cookies (gateway callbacks, curl, health probes) still pass.
        $authCookies = [cookie_name_customer_safe(), cookie_name_admin_safe()];
        foreach ($authCookies as $cookie) {
            if ($cookie !== '' && !empty($_COOKIE[$cookie])) {
                throw err_forbidden('درخواست از منبع نامعتبر ارسال شده است');
            }
        }
        return;
    }

    if ($origin === self_origin() || in_array($origin, allowed_origins(), true)) {
        return;
    }

    // Also accept an Origin whose host equals the current Host header — this
    // keeps the API working when app.url has not been set yet (fresh install).
    $originHost = parse_url($origin, PHP_URL_HOST);
    if ($originHost !== null && $originHost === parse_url('http://' . request_host(), PHP_URL_HOST)) {
        return;
    }

    throw err_forbidden('درخواست از منبع نامعتبر ارسال شده است');
}

// ──────────────────────────────── Client info ───────────────────────────────

function client_ip(): string
{
    foreach (['HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'REMOTE_ADDR'] as $key) {
        $value = $_SERVER[$key] ?? '';
        if ($value === '') {
            continue;
        }
        $ip = trim(explode(',', (string) $value)[0]);
        if (filter_var($ip, FILTER_VALIDATE_IP)) {
            return $ip;
        }
    }
    return '0.0.0.0';
}

function client_user_agent(): string
{
    return mb_substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 250);
}

// ─────────────────────────────── Rate limiting ──────────────────────────────

/**
 * Fixed-window rate limiter backed by MySQL (survives restarts, works on
 * shared hosting where no Redis/APCu is available).
 *
 * @param bool $consume false → only inspect the counter (used for login locks)
 * @throws ApiException 429 when the limit is exceeded
 */
function rate_limit(string $key, int $limit, int $windowSeconds, bool $consume = true): void
{
    $bucket = mb_substr($key, 0, 180);
    $now = time();

    try {
        $row = db_one('SELECT hits, UNIX_TIMESTAMP(window_start) AS started FROM rate_limits WHERE bucket_key = :k', ['k' => $bucket]);

        if ($row === null) {
            if ($consume) {
                db_exec(
                    'INSERT INTO rate_limits (bucket_key, hits, window_start) VALUES (:k, 1, FROM_UNIXTIME(:t))
                     ON DUPLICATE KEY UPDATE hits = hits + 1',
                    ['k' => $bucket, 't' => $now]
                );
            }
            return;
        }

        $started = (int) $row['started'];
        $hits = (int) $row['hits'];

        if ($now - $started >= $windowSeconds) {
            // Window expired → restart it.
            if ($consume) {
                db_exec('UPDATE rate_limits SET hits = 1, window_start = FROM_UNIXTIME(:t) WHERE bucket_key = :k', ['t' => $now, 'k' => $bucket]);
            }
            return;
        }

        if ($hits >= $limit) {
            throw err_rate_limited(max(1, $windowSeconds - ($now - $started)));
        }

        if ($consume) {
            db_exec('UPDATE rate_limits SET hits = hits + 1 WHERE bucket_key = :k', ['k' => $bucket]);
        }
    } catch (PDOException $e) {
        // A limiter failure must never take the whole API down.
        nobel_log('warn', 'ratelimit.db_error', ['message' => $e->getMessage()]);
    }
}

function rate_limit_reset(string $key): void
{
    try {
        db_exec('DELETE FROM rate_limits WHERE bucket_key = :k', ['k' => mb_substr($key, 0, 180)]);
    } catch (PDOException) {
        // ignore
    }
}

/** Opportunistic cleanup of old counters/expired rows (called from health/cron). */
function rate_limit_gc(): void
{
    try {
        db_exec('DELETE FROM rate_limits WHERE window_start < (NOW() - INTERVAL 1 DAY)');
    } catch (PDOException) {
        // ignore
    }
}

// ───────────────────────────────── Hashing ──────────────────────────────────

/** SHA-256 HMAC of a session cookie token (DB stores only the hash). */
function hash_session_token(string $token): string
{
    return hash_hmac('sha256', $token, 'session:' . nobel_secret());
}

/** OTP codes are stored hashed and bound to (mobile, purpose, secret). */
function hash_otp_code(string $code, string $mobile, string $purpose = 'LOGIN'): string
{
    return hash_hmac('sha256', $code, 'otp:' . nobel_secret() . ':' . $mobile . ':' . $purpose);
}

function random_token(int $bytes = 32): string
{
    return rtrim(strtr(base64_encode(random_bytes($bytes)), '+/', '-_'), '=');
}

function hash_admin_password(string $password): string
{
    return password_hash($password, PASSWORD_BCRYPT);
}

function verify_admin_password(string $password, string $hash): bool
{
    return $hash !== '' && password_verify($password, $hash);
}

// ───────────────────────── Input parsing / validation ───────────────────────

/**
 * Reads and decodes the JSON request body.
 *
 * @return array<string,mixed>
 */
function read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }
    if (strlen($raw) > 1_000_000) {
        throw err_bad_request('حجم درخواست بیش از حد مجاز است', 'PAYLOAD_TOO_LARGE');
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        throw err_bad_request('بدنه درخواست JSON معتبر نیست');
    }
    return $data;
}

/** Converts Persian/Arabic digits to ASCII (mirrors normalizeDigits in TS). */
function normalize_digits(string $input): string
{
    $fa = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    $ar = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    $en = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    return str_replace($ar, $en, str_replace($fa, $en, trim($input)));
}

/** Normalises Iranian mobiles: fa digits → ASCII, strips separators, +98/98 → 0. */
function normalize_mobile(string $input): string
{
    $out = normalize_digits($input);
    $out = preg_replace('/[\s\-()]+/u', '', $out) ?? '';
    if (str_starts_with($out, '+98')) {
        $out = '0' . substr($out, 3);
    } elseif (str_starts_with($out, '0098')) {
        $out = '0' . substr($out, 4);
    } elseif (str_starts_with($out, '98') && strlen($out) === 12) {
        $out = '0' . substr($out, 2);
    }
    return preg_replace('/\D/', '', $out) ?? '';
}

function is_valid_mobile(string $mobile): bool
{
    return preg_match('/^09\d{9}$/', $mobile) === 1;
}

/**
 * Validated field readers. All of them THROW a 422 with a Persian message.
 *
 * @param array<string,mixed> $data
 */
function field_string(array $data, string $key, bool $required = true, int $max = 255, int $min = 0): ?string
{
    $value = $data[$key] ?? null;
    if ($value === null || (is_string($value) && trim($value) === '')) {
        if ($required) {
            throw err_validation('فیلد «' . $key . '» الزامی است', [['path' => $key, 'message' => 'required']]);
        }
        return null;
    }
    if (!is_string($value) && !is_numeric($value)) {
        throw err_validation('مقدار «' . $key . '» معتبر نیست', [['path' => $key, 'message' => 'invalid']]);
    }
    $value = trim((string) $value);
    if (mb_strlen($value) < $min) {
        throw err_validation('مقدار «' . $key . '» کوتاه‌تر از حد مجاز است', [['path' => $key, 'message' => 'too_short']]);
    }
    if (mb_strlen($value) > $max) {
        throw err_validation('مقدار «' . $key . '» طولانی‌تر از حد مجاز است', [['path' => $key, 'message' => 'too_long']]);
    }
    return $value;
}

/** @param array<string,mixed> $data */
function field_int(array $data, string $key, bool $required = true, ?int $min = null, ?int $max = null, ?int $default = null): ?int
{
    $value = $data[$key] ?? null;
    if ($value === null || $value === '') {
        if ($required) {
            throw err_validation('فیلد «' . $key . '» الزامی است', [['path' => $key, 'message' => 'required']]);
        }
        return $default;
    }
    if (is_string($value)) {
        $value = normalize_digits($value);
    }
    if (!is_numeric($value)) {
        throw err_validation('مقدار «' . $key . '» باید عدد باشد', [['path' => $key, 'message' => 'not_a_number']]);
    }
    $int = (int) $value;
    if ($min !== null && $int < $min) {
        throw err_validation('مقدار «' . $key . '» کمتر از حد مجاز است', [['path' => $key, 'message' => 'too_small']]);
    }
    if ($max !== null && $int > $max) {
        throw err_validation('مقدار «' . $key . '» بیشتر از حد مجاز است', [['path' => $key, 'message' => 'too_large']]);
    }
    return $int;
}

/** @param array<string,mixed> $data */
/**
 * Reads a boolean field. Signature intentionally mirrors field_string/field_int/
 * field_enum: ($data, $key, $required, $default).
 *
 * @param array<string,mixed> $data
 */
function field_bool(array $data, string $key, bool $required = false, bool $default = false): bool
{
    $value = $data[$key] ?? null;
    if ($value === null || $value === '') {
        if ($required) {
            throw err_validation('فیلد «' . $key . '» الزامی است', [['path' => $key, 'message' => 'required']]);
        }
        return $default;
    }
    if (is_bool($value)) {
        return $value;
    }
    if (is_int($value) || is_float($value)) {
        return (int) $value === 1;
    }
    return in_array(strtolower((string) $value), ['1', 'true', 'yes', 'on'], true);
}

/**
 * @param array<string,mixed> $data
 * @param list<string> $allowed
 */
function field_enum(array $data, string $key, array $allowed, bool $required = true, ?string $default = null): ?string
{
    $value = $data[$key] ?? null;
    if ($value === null || $value === '') {
        if ($required) {
            throw err_validation('فیلد «' . $key . '» الزامی است', [['path' => $key, 'message' => 'required']]);
        }
        return $default;
    }
    $value = (string) $value;
    if (!in_array($value, $allowed, true)) {
        throw err_validation('مقدار «' . $key . '» معتبر نیست', [['path' => $key, 'message' => 'invalid_enum']]);
    }
    return $value;
}

/** @param array<string,mixed> $data */
function field_mobile(array $data, string $key = 'mobile', bool $required = true): ?string
{
    $raw = $data[$key] ?? null;
    if ($raw === null || trim((string) $raw) === '') {
        if ($required) {
            throw err_validation('شماره موبایل الزامی است', [['path' => $key, 'message' => 'required']]);
        }
        return null;
    }
    $mobile = normalize_mobile((string) $raw);
    if (!is_valid_mobile($mobile)) {
        throw err_validation('شماره موبایل معتبر نیست (مثال: 09123456789)', [['path' => $key, 'message' => 'invalid_mobile']]);
    }
    return $mobile;
}

/** @param array<string,mixed> $data */
function field_email(array $data, string $key = 'email', bool $required = false): ?string
{
    $raw = $data[$key] ?? null;
    if ($raw === null || trim((string) $raw) === '') {
        if ($required) {
            throw err_validation('ایمیل الزامی است', [['path' => $key, 'message' => 'required']]);
        }
        return null;
    }
    $email = trim((string) $raw);
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 200) {
        throw err_validation('ایمیل معتبر نیست', [['path' => $key, 'message' => 'invalid_email']]);
    }
    return $email;
}

/** Escapes a value for safe HTML output (used by the PHP rescue panel). */
function e(?string $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/** Builds a LIKE pattern with wildcards escaped — safe inside a bound param. */
function like_pattern(string $term): string
{
    $escaped = str_replace(['\\', '%', '_'], ['\\\\', '\%', '\_'], $term);
    return '%' . $escaped . '%';
}
