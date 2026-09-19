<?php
/** GET /api/admin/users.php?q&page&pageSize */
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/admin.php';

handle(['GET'], function (): never {
    require_admin();
    json_ok(admin_list_users([
        'q' => query_string_param('q'),
        'page' => query_int_param('page', 1, 1, 10000),
        'pageSize' => query_int_param('pageSize', 12, 5, 50),
    ]));
});
