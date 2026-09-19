<?php
/**
 * GET  /api/admin/products.php?q&categoryId&status&page&pageSize
 * POST /api/admin/products.php   { full product payload }
 */
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/admin.php';

handle(['GET', 'POST'], function (array $body): never {
    $admin = require_admin();

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = validate_product_input($body);
        $product = admin_create_product($input);
        record_audit((int) $admin['id'], 'product.create', 'product', $product['id'], ['name' => $product['name'], 'sku' => $product['sku']]);
        json_ok(['product' => $product], 201, 'محصول ایجاد شد');
    }

    json_ok(admin_list_products([
        'q' => query_string_param('q'),
        'categoryId' => query_string_param('categoryId', null, 40),
        'status' => query_string_param('status', null, 20),
        'page' => query_int_param('page', 1, 1, 10000),
        'pageSize' => query_int_param('pageSize', 12, 5, 50),
    ]));
});
