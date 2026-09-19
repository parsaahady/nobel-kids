<?php
/** POST /api/admin/product-duplicate.php?id=<id> — clones a product as DRAFT with stock 0. */
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/admin.php';

handle(['POST'], function (): never {
    $admin = require_admin();
    $raw = query_string_param('id', null, 40);
    if ($raw === null || !ctype_digit($raw)) {
        throw err_validation('شناسه محصول معتبر نیست');
    }
    $product = admin_duplicate_product((int) $raw);
    record_audit((int) $admin['id'], 'product.duplicate', 'product', $product['id'], ['sourceId' => $raw]);
    json_ok(['product' => $product], 201, 'نسخه کپی ایجاد شد');
});
