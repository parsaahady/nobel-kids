<?php
/**
 * GET    /api/admin/product.php?id=<id>   → detail
 * PATCH  /api/admin/product.php?id=<id>   → full update
 * DELETE /api/admin/product.php?id=<id>   → soft delete
 */
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/admin.php';

handle(['GET', 'PATCH', 'DELETE'], function (array $body): never {
    $admin = require_admin();
    $raw = query_string_param('id', null, 40);
    if ($raw === null || !ctype_digit($raw)) {
        throw err_validation('شناسه محصول معتبر نیست');
    }
    $id = (int) $raw;

    switch ($_SERVER['REQUEST_METHOD']) {
        case 'PATCH':
            $product = admin_update_product($id, validate_product_input($body));
            record_audit((int) $admin['id'], 'product.update', 'product', (string) $id, ['name' => $product['name']]);
            json_ok(['product' => $product], 200, 'محصول به‌روز شد');

        case 'DELETE':
            admin_soft_delete_product($id);
            record_audit((int) $admin['id'], 'product.soft-delete', 'product', (string) $id);
            json_ok(['deleted' => true], 200, 'محصول بایگانی شد');

        default:
            json_ok(['product' => admin_get_product($id)]);
    }
});
