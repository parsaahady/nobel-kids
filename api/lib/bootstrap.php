<?php
/**
 * Nobel Kids — shared endpoint bootstrap.
 *
 * Every endpoint starts with:
 *
 *     require_once __DIR__ . '/../lib/bootstrap.php';
 *     handle(['POST'], function (array $body) { ... });
 *
 * handle() takes care of: security headers, CORS, preflight, method checking,
 * CSRF (same-origin) for mutating verbs, JSON body parsing, rate limiting,
 * error → JSON mapping and safe logging.
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

require_once __DIR__ . '/../config/app.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/response.php';
require_once __DIR__ . '/../config/security.php';
require_once __DIR__ . '/pricing.php';
require_once __DIR__ . '/auth.php';

/**
 * @param list<string> $methods          Allowed HTTP verbs, e.g. ['GET'] or ['POST','PATCH']
 * @param callable(array<string,mixed>):mixed $handler  Receives the parsed JSON body
 * @param array{limit?:int,window?:int,key?:string}|null $rateLimit
 */
function handle(array $methods, callable $handler, ?array $rateLimit = null): never
{
    security_headers();
    handle_preflight();
    apply_cors();

    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    $path = (string) ($_SERVER['SCRIPT_NAME'] ?? 'unknown');

    try {
        if (!in_array($method, $methods, true)) {
            if (!headers_sent()) {
                header('Allow: ' . implode(', ', $methods));
            }
            throw new ApiException('METHOD_NOT_ALLOWED', 'این متد برای این مسیر مجاز نیست', 405);
        }

        // CSRF defence for state-changing requests.
        assert_same_origin();

        // Default throttle: generous for reads, tighter for writes. Endpoints
        // with sensitive actions (OTP, login…) pass their own stricter limits.
        $limit = $rateLimit['limit'] ?? (in_array($method, ['GET', 'HEAD'], true) ? 600 : 120);
        $window = $rateLimit['window'] ?? 60;
        $key = $rateLimit['key'] ?? ('api:' . basename($path) . ':' . client_ip());
        rate_limit($key, (int) $limit, (int) $window);

        $body = in_array($method, ['POST', 'PATCH', 'PUT', 'DELETE'], true) ? read_json_body() : [];

        $result = $handler($body);

        // Handlers normally call json_ok() themselves; support plain returns too.
        if ($result !== null) {
            json_ok($result);
        }
        json_ok(null);
    } catch (ApiException $e) {
        if ($e->status >= 500) {
            nobel_log('error', 'api.error', ['path' => basename($path), 'code' => $e->errorCode, 'message' => $e->getMessage()]);
        }
        json_fail($e);
    } catch (PDOException $e) {
        nobel_log('error', 'api.db_error', [
            'path' => basename($path),
            'message' => $e->getMessage(),
            'sqlstate' => $e->getCode(),
        ]);
        json_error('DB_ERROR', 'خطا در ارتباط با پایگاه داده؛ لطفاً دوباره تلاش کنید.', 500);
    } catch (Throwable $e) {
        nobel_log('error', 'api.unhandled', [
            'path' => basename($path),
            'message' => $e->getMessage(),
            'file' => basename($e->getFile()),
            'line' => $e->getLine(),
        ]);
        json_error('INTERNAL_ERROR', 'خطای داخلی سرور رخ داد؛ لطفاً دوباره تلاش کنید.', 500);
    }
}

/** Reads a query-string parameter as a trimmed string. */
function query_string_param(string $key, ?string $default = null, int $max = 200): ?string
{
    $value = $_GET[$key] ?? null;
    if ($value === null || !is_string($value) || trim($value) === '') {
        return $default;
    }
    return mb_substr(trim($value), 0, $max);
}

function query_int_param(string $key, int $default = 0, ?int $min = null, ?int $max = null): int
{
    $raw = $_GET[$key] ?? null;
    if ($raw === null || !is_scalar($raw)) {
        return $default;
    }
    $value = (int) normalize_digits((string) $raw);
    if ($min !== null) {
        $value = max($min, $value);
    }
    if ($max !== null) {
        $value = min($max, $value);
    }
    return $value;
}

function query_bool_param(string $key, bool $default = false): bool
{
    $raw = $_GET[$key] ?? null;
    if ($raw === null) {
        return $default;
    }
    return in_array(strtolower((string) $raw), ['1', 'true', 'yes', 'on'], true);
}
