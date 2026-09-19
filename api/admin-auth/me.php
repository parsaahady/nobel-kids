<?php
/**
 * GET /api/auth/admin-me.php
 * Returns the authenticated admin (or 401). Used by the React admin shell to
 * decide whether to show the panel — the real protection is on every endpoint.
 */
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';

handle(['GET'], function (): never {
    $admin = require_admin();
    json_ok(['user' => [
        'id' => (string) $admin['id'],
        'mobile' => $admin['mobile'],
        'name' => $admin['name'],
        'role' => $admin['role'],
        'mustChangePassword' => (bool) $admin['must_change_password'],
    ]]);
});
