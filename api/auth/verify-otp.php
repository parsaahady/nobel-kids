<?php
/**
 * POST /api/auth/verify-otp.php   { mobile, code, name?, businessName? }
 *
 * Verifies the OTP and opens a CUSTOMER session (cookie nbl_session).
 * The account is created on first successful login (passwordless).
 *
 * Protections: attempt counter incremented BEFORE comparison (blocks parallel
 * brute force), constant-time hash compare, one-time use, expiry, rate limits,
 * and automatic guest-cart merge after login.
 */

declare(strict_types=1);

require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/cart.php';

handle(['POST'], function (array $body): never {
    $mobile = field_mobile($body, 'mobile');
    $codeRaw = field_string($body, 'code', true, 10);
    $code = normalize_digits((string) $codeRaw);
    if (preg_match('/^\d{4,6}$/', $code) !== 1) {
        throw err_validation('کد تأیید معتبر نیست');
    }

    $name = field_string($body, 'name', false, 100);
    $businessName = field_string($body, 'businessName', false, 150);
    $ip = client_ip();

    rate_limit('otp:verify:mobile:' . $mobile, 10, 600);
    rate_limit('otp:verify:ip:' . $ip, 30, 600);

    $otp = db_one(
        'SELECT * FROM otp_codes WHERE mobile = :m AND purpose = \'LOGIN\' AND consumed_at IS NULL ORDER BY id DESC LIMIT 1',
        ['m' => $mobile]
    );
    if ($otp === null) {
        throw new ApiException('OTP_NOT_FOUND', 'کد تأییدی برای این شماره ثبت نشده است', 400);
    }
    if (strtotime((string) $otp['expires_at']) <= time()) {
        throw new ApiException('OTP_EXPIRED', 'کد تأیید منقضی شده است؛ کد جدید دریافت کنید', 410);
    }

    $maxAttempts = max(1, (int) cfg('otp.max_attempts', 5));
    if ((int) $otp['attempts'] >= $maxAttempts) {
        throw new ApiException('OTP_LOCKED', 'تعداد تلاش‌های ناموفق بیش از حد مجاز است؛ کد جدید دریافت کنید', 429);
    }

    // Count the attempt FIRST so parallel guesses cannot exceed the limit.
    db_exec('UPDATE otp_codes SET attempts = attempts + 1 WHERE id = :id', ['id' => (int) $otp['id']]);
    $attempts = (int) db_value('SELECT attempts FROM otp_codes WHERE id = :id', ['id' => (int) $otp['id']]);
    if ($attempts > $maxAttempts) {
        throw new ApiException('OTP_LOCKED', 'تعداد تلاش‌های ناموفق بیش از حد مجاز است؛ کد جدید دریافت کنید', 429);
    }

    if (!hash_equals((string) $otp['code_hash'], hash_otp_code($code, $mobile))) {
        nobel_log('warn', 'auth.otp.failed', ['mobile' => $mobile, 'ip' => $ip]);
        throw new ApiException('OTP_INVALID', 'کد وارد شده صحیح نیست', 401);
    }

    // One-time use: the UPDATE only succeeds for the first caller.
    $consumed = db_exec('UPDATE otp_codes SET consumed_at = NOW() WHERE id = :id AND consumed_at IS NULL', ['id' => (int) $otp['id']]);
    if ($consumed === 0) {
        throw err_conflict('این کد قبلاً استفاده شده است', 'OTP_USED');
    }

    // Upsert the customer account.
    $user = db_one('SELECT * FROM users WHERE mobile = :m LIMIT 1', ['m' => $mobile]);
    if ($user === null) {
        db_exec(
            'INSERT INTO users (mobile, name, business_name, role, status, created_at, updated_at, last_login_at)
             VALUES (:m, :n, :b, \'CUSTOMER\', \'ACTIVE\', NOW(), NOW(), NOW())',
            ['m' => $mobile, 'n' => $name, 'b' => $businessName]
        );
        $userId = db_last_id();
        $user = db_one('SELECT * FROM users WHERE id = :id', ['id' => $userId]);
    } else {
        $userId = (int) $user['id'];
        if ((string) $user['status'] !== 'ACTIVE') {
            throw err_forbidden('حساب شما غیرفعال شده است؛ با پشتیبانی تماس بگیرید');
        }
        db_exec(
            'UPDATE users SET last_login_at = NOW(),
                    name = COALESCE(NULLIF(:n, \'\'), name),
                    business_name = COALESCE(NULLIF(:b, \'\'), business_name)
              WHERE id = :id',
            ['n' => $name ?? '', 'b' => $businessName ?? '', 'id' => $userId]
        );
        $user = db_one('SELECT * FROM users WHERE id = :id', ['id' => $userId]);
    }

    $userId = (int) $user['id'];

    // Merge the guest cart into the account (idempotent).
    $guest = guest_token(false);
    if ($guest !== null) {
        try {
            merge_guest_cart($guest, $userId);
        } catch (Throwable $e) {
            nobel_log('warn', 'cart.merge_failed', ['message' => $e->getMessage(), 'userId' => $userId]);
        }
    }

    // Clear used/expired codes for this mobile.
    db_exec('DELETE FROM otp_codes WHERE mobile = :m AND (consumed_at IS NOT NULL OR expires_at < NOW())', ['m' => $mobile]);

    $token = create_session($userId, 'CUSTOMER');
    set_auth_cookie(cookie_name_customer(), $token, session_ttl_seconds());

    nobel_log('info', 'auth.otp.verified', ['mobile' => $mobile, 'userId' => $userId, 'ip' => $ip]);

    json_ok([
        'user' => [
            'id' => (string) $userId,
            'mobile' => (string) $user['mobile'],
            'name' => $user['name'],
            'businessName' => $user['business_name'],
            'email' => $user['email'],
            'role' => (string) $user['role'],
            'status' => (string) $user['status'],
            'createdAt' => iso_date((string) $user['created_at']),
            'lastLoginAt' => iso_date($user['last_login_at']),
        ],
    ], 200, 'با موفقیت وارد شدید');
});
