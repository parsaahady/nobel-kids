<?php
/**
 * Nobel Kids — JSON response envelope + domain errors.
 *
 * Success:  { "success": true,  "data": {...}, "message": "..."|null }
 * Error:    { "success": false, "error": { "code": "...", "message": "...", "details": ... } }
 *
 * The legacy browser client also understands `ok`, so both keys are emitted
 * (`success` and `ok`) — the React app keeps working unchanged.
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

/** Domain exception mapped to a safe HTTP response. */
class ApiException extends RuntimeException
{
    /** @param mixed $details */
    public function __construct(
        public readonly string $errorCode,
        string $message,
        public readonly int $status = 400,
        public readonly mixed $details = null,
    ) {
        parent::__construct($message);
    }
}

function err_validation(string $message = 'اطلاعات وارد شده معتبر نیست', mixed $details = null): ApiException
{
    return new ApiException('VALIDATION_ERROR', $message, 422, $details);
}
function err_bad_request(string $message = 'درخواست نامعتبر است', string $code = 'INVALID_REQUEST'): ApiException
{
    return new ApiException($code, $message, 400);
}
function err_unauthorized(string $message = 'برای انجام این عملیات ابتدا وارد حساب شوید'): ApiException
{
    return new ApiException('UNAUTHORIZED', $message, 401);
}
function err_forbidden(string $message = 'دسترسی کافی برای انجام این عملیات ندارید'): ApiException
{
    return new ApiException('FORBIDDEN', $message, 403);
}
function err_not_found(string $message = 'مورد درخواستی یافت نشد'): ApiException
{
    return new ApiException('NOT_FOUND', $message, 404);
}
function err_conflict(string $message = 'عملیات با وضعیت فعلی ناسازگار است', string $code = 'CONFLICT'): ApiException
{
    return new ApiException($code, $message, 409);
}
function err_out_of_stock(string $message = 'موجودی کافی برای این سفارش وجود ندارد'): ApiException
{
    return new ApiException('OUT_OF_STOCK', $message, 409);
}
function err_rate_limited(int $retryAfter, string $message = 'تعداد تلاش‌ها بیش از حد مجاز است؛ کمی بعد دوباره تلاش کنید'): ApiException
{
    return new ApiException('RATE_LIMITED', $message, 429, ['retryAfter' => $retryAfter]);
}
function err_provider(string $message = 'خطا در ارتباط با سرویس خارجی؛ لطفاً دوباره تلاش کنید'): ApiException
{
    return new ApiException('PROVIDER_ERROR', $message, 502);
}

/** Sends a success envelope and terminates the request. */
function json_ok(mixed $data = null, int $status = 200, ?string $message = null): never
{
    if (!headers_sent()) {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
    }
    echo json_encode([
        'success' => true,
        'ok'      => true,          // legacy key used by lib/api-client.ts
        'data'    => $data,
        'message' => $message,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/** Sends an error envelope and terminates the request. */
function json_error(string $code, string $message, int $status = 400, mixed $details = null): never
{
    if (!headers_sent()) {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        if ($status === 429 && is_array($details) && isset($details['retryAfter'])) {
            header('Retry-After: ' . (int) $details['retryAfter']);
        }
    }
    $error = ['code' => $code, 'message' => $message];
    if ($details !== null) {
        $error['details'] = $details;
    }
    echo json_encode([
        'success' => false,
        'ok'      => false,
        'error'   => $error,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function json_fail(ApiException $e): never
{
    json_error($e->errorCode, $e->getMessage(), $e->status, $e->details);
}
