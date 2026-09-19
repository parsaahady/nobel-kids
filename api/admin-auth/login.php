<?php
/**
 * POST /api/auth/login.php   { identifier, password }
 *
 * ADMIN PANEL LOGIN — password based, fully independent from the customer OTP
 * flow. Mints an ADMIN-purpose session into the dedicated nbl_admin_session
 * cookie. An OTP customer session can never be used for the admin panel.
 *
 * Protections:
 *   • lockout: 5 failed attempts per (IP + identifier) in 15 minutes → 429
 *   • identical work whether or not the account exists (no user enumeration)
 *   • every attempt (success/failure) is written to audit_logs — never the password
 */

declare(strict_types=1);

require_once __DIR__ . '/../lib/bootstrap.php';

handle(['POST'], function (array $body): never {
    $identifier = field_mobile($body, 'identifier');
    $password = (string) ($body['password'] ?? '');
    if (strlen($password) < 8 || strlen($password) > 200) {
        throw err_validation('رمز عبور باید دست‌کم ۸ نویسه باشد');
    }

    $ip = client_ip();
    $lockKey = 'admin-login:' . $ip . ':' . $identifier;

    // Inspect the lock without consuming it (only failures count).
    rate_limit($lockKey, 5, 900, false);

    $user = db_one('SELECT * FROM users WHERE mobile = :m LIMIT 1', ['m' => $identifier]);
    $storedHash = is_array($user) ? (string) ($user['password_hash'] ?? '') : '';

    $passwordOk = false;
    if ($storedHash !== '') {
        $passwordOk = verify_admin_password($password, $storedHash);
    } else {
        // Equal-cost dummy verification so timing does not leak existence.
        password_verify($password, '$2y$10$usesomesillystringfooosillystringfoobarbazquxquuxcorgegrault');
    }

    $fail = static function (string $action, string $message, int $status, ?int $userId) use ($lockKey, $identifier): never {
        rate_limit($lockKey, 5, 900);           // consume one failure
        record_audit($userId, $action, 'auth', null, ['identifier' => $identifier]);
        throw new ApiException($status === 403 ? 'FORBIDDEN' : 'UNAUTHORIZED', $message, $status);
    };

    if ($user === null || !$passwordOk) {
        $fail('admin.login.failed', 'شماره موبایل یا رمز عبور نادرست است', 401, $user !== null ? (int) $user['id'] : null);
    }
    if ((string) $user['status'] !== 'ACTIVE') {
        record_audit((int) $user['id'], 'admin.login.blocked', 'auth');
        throw new ApiException('ACCOUNT_INACTIVE', 'این حساب فعال نیست؛ با مدیر ارشد هماهنگ کنید', 403);
    }
    if (!is_admin_role((string) $user['role'])) {
        $fail('admin.login.no_role', 'این حساب دسترسی به پنل مدیریت ندارد', 403, (int) $user['id']);
    }

    $userId = (int) $user['id'];

    // Successful login clears the lockout counter.
    rate_limit_reset($lockKey);

    $token = create_session($userId, 'ADMIN');
    set_auth_cookie(cookie_name_admin(), $token, session_ttl_seconds());

    db_exec('UPDATE users SET last_login_at = NOW() WHERE id = :id', ['id' => $userId]);
    record_audit($userId, 'admin.login.success', 'auth');

    json_ok([
        'user' => [
            'id' => (string) $userId,
            'mobile' => (string) $user['mobile'],
            'name' => $user['name'],
            'role' => (string) $user['role'],
            'mustChangePassword' => (int) ($user['must_change_password'] ?? 0) === 1,
        ],
    ], 200, 'ورود موفق');
});
