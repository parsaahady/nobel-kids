<?php
/**
 * PATCH  /api/admin/category.php?id=<id>  → update
 * DELETE /api/admin/category.php?id=<id>  → delete (blocked while products exist)
 */
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/admin.php';

handle(['PATCH', 'DELETE'], function (array $body): never {
    $admin = require_admin();
    $raw = query_string_param('id', null, 40);
    if ($raw === null || !ctype_digit($raw)) {
        throw err_validation('شناسه دسته‌بندی معتبر نیست');
    }
    $id = (int) $raw;

    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        admin_delete_category($id);
        record_audit((int) $admin['id'], 'category.delete', 'category', (string) $id);
        json_ok(['deleted' => true, 'items' => list_categories(true, false)], 200, 'دسته‌بندی حذف شد');
    }

    $category = admin_update_category($id, validate_category_input($body));
    record_audit((int) $admin['id'], 'category.update', 'category', (string) $id, ['name' => $category['name']]);
    json_ok(['category' => $category, 'items' => list_categories(true, false)], 200, 'دسته‌بندی به‌روز شد');
});
