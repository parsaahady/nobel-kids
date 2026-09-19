<?php
/**
 * GET  /api/admin/categories.php            → all categories (incl. inactive)
 * POST /api/admin/categories.php {category} → create
 */
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/admin.php';

handle(['GET', 'POST'], function (array $body): never {
    $admin = require_admin();

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $category = admin_create_category(validate_category_input($body));
        record_audit((int) $admin['id'], 'category.create', 'category', $category['id'], ['name' => $category['name']]);
        json_ok(['category' => $category, 'items' => list_categories(true, false)], 201, 'دسته‌بندی ایجاد شد');
    }

    json_ok(['items' => list_categories(true, false)]);
});
