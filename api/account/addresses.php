<?php
/**
 * GET  /api/account/addresses.php              → list
 * POST /api/account/addresses.php  {address}   → create
 */
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/account.php';

handle(['GET', 'POST'], function (array $body): never {
    $user = require_user();
    $userId = (int) $user['id'];

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        create_address($userId, validate_address_input($body));
        json_ok(['items' => list_addresses($userId)], 201, 'آدرس ثبت شد');
    }

    json_ok(['items' => list_addresses($userId)]);
});
