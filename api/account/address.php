<?php
/**
 * PATCH  /api/account/address.php?id=<id>              → update
 * DELETE /api/account/address.php?id=<id>              → delete
 * POST   /api/account/address.php?id=<id>&action=default → make default
 */
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/account.php';

handle(['PATCH', 'DELETE', 'POST'], function (array $body): never {
    $user = require_user();
    $userId = (int) $user['id'];

    $id = query_string_param('id', null, 40);
    if ($id === null || !ctype_digit($id)) {
        throw err_validation('شناسه آدرس معتبر نیست');
    }
    $addressId = (int) $id;
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'DELETE') {
        delete_address($userId, $addressId);
        json_ok(['items' => list_addresses($userId)], 200, 'آدرس حذف شد');
    }

    if ($method === 'POST' && query_string_param('action') === 'default') {
        set_default_address($userId, $addressId);
        json_ok(['items' => list_addresses($userId)], 200, 'آدرس پیش‌فرض تغییر کرد');
    }

    update_address($userId, $addressId, validate_address_input($body));
    json_ok(['items' => list_addresses($userId)], 200, 'آدرس به‌روز شد');
});
