<?php
/**
 * POST /api/auth/logout.php
 *
 * Closes ONLY the customer session. An admin session in the same browser is
 * untouched (the two gateways are independent by design).
 */

declare(strict_types=1);

require_once __DIR__ . '/../lib/bootstrap.php';

handle(['POST'], function (): never {
    $token = $_COOKIE[cookie_name_customer()] ?? '';
    if (is_string($token) && $token !== '') {
        revoke_session_token($token);
    }
    clear_auth_cookie(cookie_name_customer());
    json_ok(['loggedOut' => true], 200, 'از حساب خارج شدید');
});
