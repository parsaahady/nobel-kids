<?php
/** GET /api/admin/orders.php?q&status&paymentStatus&from&to&minAmount&maxAmount&page&pageSize */
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/admin.php';

handle(['GET'], function (): never {
    require_admin();
    json_ok(admin_list_orders([
        'q' => query_string_param('q'),
        'status' => query_string_param('status', null, 30),
        'paymentStatus' => query_string_param('paymentStatus', null, 30),
        'from' => query_string_param('from', null, 40),
        'to' => query_string_param('to', null, 40),
        'minAmount' => isset($_GET['minAmount']) ? query_int_param('minAmount', 0, 0) : null,
        'maxAmount' => isset($_GET['maxAmount']) ? query_int_param('maxAmount', 0, 0) : null,
        'page' => query_int_param('page', 1, 1, 10000),
        'pageSize' => query_int_param('pageSize', 12, 5, 50),
    ]));
});
