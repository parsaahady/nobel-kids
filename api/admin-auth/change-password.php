<?php
/**
 * POST /api/auth/change-password.php  { currentPassword, newPassword }
 *
 * Requires a valid ADMIN session AND the current password (a hijacked session
 * alone is not enough). On success every other admin session is revoked and
 * this browser gets a fresh one.
 */
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';

handle(['POST'], function (array $body): never {
    $admin = require_admin();
    $adminId = (int) $admin['id'];

    $current = (string) ($body['currentPassword'] ?? '');
    $new = (string) ($body['newPassword'] ?? '');

    if (strlen($new) < 10) {
        throw err_validation('رمز جدید باید دست‌کم ۱۰ نویسه باشد');
    }
    if (strlen($new) > 200) {
        throw err_validation('رمز جدید بیش از حد طولانی است');
    }
    if ($new === $current) {
        throw err_validation('رمز جدید نباید با رمز فعلی یکی باشد');
    }

    rate_limit('admin-change-password:' . $adminId, 10, 600);

    $row = db_one('SELECT password_hash FROM users WHERE id = :id', ['id' => $adminId]);
    $hash = (string) ($row['password_hash'] ?? '');
    if ($hash === '' || !verify_admin_password($current, $hash)) {
        record_audit($adminId, 'admin.password_change.failed', 'auth');
        throw err_validation('رمز فعلی نادرست است');
    }

    db_exec(
        'UPDATE users SET password_hash = :h, must_change_password = 0, updated_at = NOW() WHERE id = :id',
        ['h' => hash_admin_password($new), 'id' => $adminId]
    );

    // Log out every admin session (including this one) then re-issue.
    revoke_all_sessions($adminId, 'ADMIN');
    $token = create_session($adminId, 'ADMIN');
    set_auth_cookie(cookie_name_admin(), $token, session_ttl_seconds());

    record_audit($adminId, 'admin.password_changed', 'auth');
    json_ok(['changed' => true], 200, 'رمز عبور تغییر کرد');
});
