<?php
/**
 * GET /api/orders/detail.php?id=<id|number>
 * Scoped to the owner, so guessing another customer's id returns 404.
 */
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/orders.php';

handle(['GET'], function (): never {
    $user = require_user();
    $id = query_string_param('id', null, 60);
    if ($id === null || $id === '') {
        throw err_validation('شناسه سفارش مشخص نشده است');
    }
    json_ok(['order' => get_user_order((int) $user['id'], $id)]);
});
