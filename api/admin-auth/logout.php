<?php
/**
 * POST /api/auth/admin-logout.php
 * Closes ONLY the admin session; the customer session is untouched.
 */
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';

handle(['POST'], function (): never {
    $token = $_COOKIE[cookie_name_admin()] ?? '';
    $admin = current_admin();
    if (is_string($token) && $token !== '') {
        revoke_session_token($token);
    }
    if ($admin !== null) {
        record_audit((int) $admin['id'], 'admin.logout', 'auth');
    }
    clear_auth_cookie(cookie_name_admin());
    json_ok(['loggedOut' => true], 200, 'از پنل خارج شدید');
});
