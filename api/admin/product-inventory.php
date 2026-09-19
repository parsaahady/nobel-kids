<?php
/** GET /api/admin/product-inventory.php?id=<id>&page= — stock movement history. */
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/admin.php';

handle(['GET'], function (): never {
    require_admin();
    $raw = query_string_param('id', null, 40);
    if ($raw === null || !ctype_digit($raw)) {
        throw err_validation('شناسه محصول معتبر نیست');
    }
    json_ok(admin_inventory_logs((int) $raw, query_int_param('page', 1, 1, 10000)));
});
