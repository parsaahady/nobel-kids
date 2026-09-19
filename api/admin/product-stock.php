<?php
/**
 * POST /api/admin/product-stock.php?id=<id>   { quantity, reason? }
 * Positive = restock, negative = adjustment. Never lets stock go below zero.
 */
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/admin.php';

handle(['POST'], function (array $body): never {
    $admin = require_admin();
    $raw = query_string_param('id', null, 40);
    if ($raw === null || !ctype_digit($raw)) {
        throw err_validation('شناسه محصول معتبر نیست');
    }
    $id = (int) $raw;

    $quantity = (int) field_int($body, 'quantity', true, -1000000, 1000000);
    $reason = field_string($body, 'reason', false, 200);

    $result = admin_adjust_stock($id, (int) $admin['id'], $quantity, $reason);
    record_audit((int) $admin['id'], 'inventory.adjust', 'product', (string) $id, ['quantity' => $quantity, 'reason' => $reason]);

    json_ok($result, 200, 'موجودی به‌روز شد');
});
