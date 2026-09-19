<?php
/** GET /api/orders/index.php?page= — the signed-in customer's own documents. */
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/orders.php';

handle(['GET'], function (): never {
    $user = require_user();
    json_ok(list_user_orders((int) $user['id'], query_int_param('page', 1, 1, 10000), query_int_param('pageSize', 10, 1, 50)));
});
