<?php
/**
 * GET   /api/admin/user.php?id=<id>  → profile, addresses, last 10 orders
 * PATCH /api/admin/user.php?id=<id>  → { name?, businessName?, status?, role? }
 *
 * Role changes are SUPER_ADMIN-only and a SUPER_ADMIN can never be demoted.
 */
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/admin.php';

handle(['GET', 'PATCH'], function (array $body): never {
    $admin = require_admin();
    $raw = query_string_param('id', null, 40);
    if ($raw === null || !ctype_digit($raw)) {
        throw err_validation('شناسه کاربر معتبر نیست');
    }
    $id = (int) $raw;

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        json_ok(['user' => admin_get_user($id)]);
    }

    $input = [];
    if (array_key_exists('name', $body)) {
        $input['name'] = field_string($body, 'name', false, 100);
    }
    if (array_key_exists('businessName', $body)) {
        $input['businessName'] = field_string($body, 'businessName', false, 150);
    }
    if (isset($body['status'])) {
        $input['status'] = (string) field_enum($body, 'status', ['ACTIVE', 'SUSPENDED']);
    }
    if (isset($body['role'])) {
        $input['role'] = (string) field_enum($body, 'role', ['CUSTOMER', 'ADMIN', 'SUPER_ADMIN']);
    }
    if ($input === []) {
        throw err_validation('هیچ تغییری ارسال نشده است');
    }

    $user = admin_update_user($id, $admin, $input);
    record_audit((int) $admin['id'], 'user.update', 'user', (string) $id, array_diff_key($input, ['name' => null]));

    json_ok(['user' => $user], 200, 'کاربر به‌روز شد');
});
