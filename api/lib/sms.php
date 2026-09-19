<?php
/**
 * Nobel Kids — pluggable SMS providers.
 *
 *   console   → development: nothing is sent, the code goes to the log file
 *   kavenegar → https://kavenegar.com  (OTP lookup / verify API)
 *   ghasedak  → https://ghasedak.me    (OTP verification API)
 *
 * Adding a provider = one new class + one case in sms_provider().
 * If credentials are missing the system falls back to console mode and logs a
 * warning, so a misconfiguration never breaks login in development. In
 * production a missing provider raises a clear, safe error instead.
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
require_once __DIR__ . '/../config/response.php';

interface SmsProvider
{
    public function name(): string;

    /** @throws ApiException on provider failure */
    public function sendOtp(string $mobile, string $code): void;
}

/** Development provider: writes the code to the server log, sends nothing. */
final class ConsoleSmsProvider implements SmsProvider
{
    public function name(): string
    {
        return 'console';
    }

    public function sendOtp(string $mobile, string $code): void
    {
        // Written deliberately in clear text — this is the dev inbox.
        $file = nobel_log_dir() . '/otp-' . date('Y-m-d') . '.log';
        @file_put_contents($file, sprintf("[%s] [sms:console] %s → کد ورود نوبل کیدز: %s%s", date('c'), $mobile, $code, PHP_EOL), FILE_APPEND | LOCK_EX);
    }
}

abstract class HttpSmsProvider implements SmsProvider
{
    /**
     * @param array<string,mixed> $payload
     * @return array{status:int,body:string}
     */
    protected function request(string $url, array $payload, array $headers = [], string $method = 'POST'): array
    {
        if (!function_exists('curl_init')) {
            throw err_provider('افزونه cURL روی سرور فعال نیست؛ ارسال پیامک ممکن نیست');
        }
        $ch = curl_init();
        $isPost = strtoupper($method) === 'POST';
        curl_setopt_array($ch, [
            CURLOPT_URL => $isPost ? $url : $url . (str_contains($url, '?') ? '&' : '?') . http_build_query($payload),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 12,
            CURLOPT_CONNECTTIMEOUT => 6,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_HTTPHEADER => $headers,
        ]);
        if ($isPost) {
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($payload));
        }
        $body = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($body === false) {
            nobel_log('error', 'sms.transport_failed', ['provider' => $this->name(), 'error' => $error]);
            throw err_provider('ارسال پیامک ممکن نشد؛ لطفاً دوباره تلاش کنید');
        }
        return ['status' => $status, 'body' => (string) $body];
    }
}

final class KavenegarSmsProvider extends HttpSmsProvider
{
    public function name(): string
    {
        return 'kavenegar';
    }

    public function sendOtp(string $mobile, string $code): void
    {
        $apiKey = (string) cfg('sms.api_key', '');
        $template = (string) cfg('sms.template', '');
        if ($apiKey === '') {
            throw err_provider('کلید سرویس پیامک تنظیم نشده است');
        }

        if ($template !== '') {
            // Verify/lookup API (recommended for OTP in Iran).
            $url = sprintf('https://api.kavenegar.com/v1/%s/verify/lookup.json', rawurlencode($apiKey));
            $result = $this->request($url, ['receptor' => $mobile, 'token' => $code, 'template' => $template], [], 'GET');
        } else {
            $sender = (string) cfg('sms.sender', '');
            $url = sprintf('https://api.kavenegar.com/v1/%s/sms/send.json', rawurlencode($apiKey));
            $result = $this->request($url, [
                'receptor' => $mobile,
                'sender' => $sender,
                'message' => 'کد ورود نوبل کیدز: ' . $code,
            ], [], 'GET');
        }

        $decoded = json_decode($result['body'], true);
        $status = (int) ($decoded['return']['status'] ?? 0);
        if ($result['status'] !== 200 || $status !== 200) {
            nobel_log('error', 'sms.rejected', ['provider' => $this->name(), 'http' => $result['status'], 'status' => $status]);
            throw err_provider('سرویس پیامک درخواست را نپذیرفت');
        }
    }
}

final class GhasedakSmsProvider extends HttpSmsProvider
{
    public function name(): string
    {
        return 'ghasedak';
    }

    public function sendOtp(string $mobile, string $code): void
    {
        $apiKey = (string) cfg('sms.api_key', '');
        if ($apiKey === '') {
            throw err_provider('کلید سرویس پیامک تنظیم نشده است');
        }
        $template = (string) cfg('sms.template', '');

        if ($template !== '') {
            $result = $this->request(
                'https://api.ghasedak.me/v2/verification/send/simple',
                ['receptor' => $mobile, 'type' => '1', 'template' => $template, 'param1' => $code],
                ['apikey: ' . $apiKey, 'Content-Type: application/x-www-form-urlencoded']
            );
        } else {
            $result = $this->request(
                'https://api.ghasedak.me/v2/sms/send/simple',
                ['receptor' => $mobile, 'linenumber' => (string) cfg('sms.sender', ''), 'message' => 'کد ورود نوبل کیدز: ' . $code],
                ['apikey: ' . $apiKey, 'Content-Type: application/x-www-form-urlencoded']
            );
        }

        $decoded = json_decode($result['body'], true);
        $code200 = (int) ($decoded['result']['code'] ?? 0);
        if ($result['status'] !== 200 || $code200 !== 200) {
            nobel_log('error', 'sms.rejected', ['provider' => $this->name(), 'http' => $result['status'], 'code' => $code200]);
            throw err_provider('سرویس پیامک درخواست را نپذیرفت');
        }
    }
}

function sms_provider(): SmsProvider
{
    $name = strtolower((string) cfg('sms.provider', 'console'));
    $apiKey = (string) cfg('sms.api_key', '');

    if ($name !== 'console' && $apiKey === '') {
        // Misconfigured: never silently "succeed" in production.
        if (nobel_is_production()) {
            nobel_log('error', 'sms.misconfigured', ['provider' => $name]);
            throw err_provider('سرویس پیامک پیکربندی نشده است؛ با مدیر سایت تماس بگیرید');
        }
        nobel_log('warn', 'sms.fallback_console', ['provider' => $name]);
        return new ConsoleSmsProvider();
    }

    return match ($name) {
        'kavenegar' => new KavenegarSmsProvider(),
        'ghasedak' => new GhasedakSmsProvider(),
        default => new ConsoleSmsProvider(),
    };
}
