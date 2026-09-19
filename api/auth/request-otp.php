<?php
/**
 * POST /api/auth/request-otp.php   { mobile }
 *
 * Sends a one-time login code. Protections:
 *   • per-mobile and per-IP rate limits (DB backed, survive restarts)
 *   • resend cooldown
 *   • code stored only as an HMAC hash
 *   • dev code is returned ONLY in development with expose_dev_code enabled
 */

declare(strict_types=1);

require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/sms.php';

handle(['POST'], function (array $body): never {
    $mobile = field_mobile($body, 'mobile');
    $ip = client_ip();

    // Abuse protection (mobile + IP).
    rate_limit('otp:req:mobile:' . $mobile, 5, 600);
    rate_limit('otp:req:ip:' . $ip, 20, 600);

    $ttl = max(30, (int) cfg('otp.ttl_seconds', 120));
    $cooldown = max(10, (int) cfg('otp.resend_cooldown_seconds', 60));

    // Resend cooldown: block code spamming.
    $last = db_one(
        'SELECT UNIX_TIMESTAMP(created_at) AS created FROM otp_codes WHERE mobile = :m AND purpose = \'LOGIN\' ORDER BY id DESC LIMIT 1',
        ['m' => $mobile]
    );
    if ($last !== null) {
        $elapsed = time() - (int) $last['created'];
        if ($elapsed < $cooldown) {
            $wait = $cooldown - $elapsed;
            throw err_rate_limited($wait, sprintf('برای ارسال مجدد کد %s ثانیه صبر کنید', number_format_fa($wait)));
        }
    }

    // Generate the code. static_code is a development shortcut only.
    $static = (string) cfg('otp.static_code', '');
    $code = (!nobel_is_production() && $static !== '' && preg_match('/^\d{4,6}$/', $static) === 1)
        ? $static
        : str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

    db_exec(
        'INSERT INTO otp_codes (mobile, code_hash, purpose, expires_at, attempts, ip, created_at)
         VALUES (:m, :h, \'LOGIN\', DATE_ADD(NOW(), INTERVAL :ttl SECOND), 0, :ip, NOW())',
        ['m' => $mobile, 'h' => hash_otp_code($code, $mobile), 'ttl' => $ttl, 'ip' => $ip]
    );

    sms_provider()->sendOtp($mobile, $code);
    nobel_log('info', 'auth.otp.requested', ['mobile' => $mobile, 'ip' => $ip]);

    $payload = ['sent' => true, 'ttlSeconds' => $ttl];

    // NEVER expose the code in production, regardless of configuration.
    if (!nobel_is_production() && (bool) cfg('otp.expose_dev_code', false)) {
        $payload['devCode'] = $code;
    }

    json_ok($payload, 200, 'کد تأیید ارسال شد');
});
