<?php
/**
 * GET  /api/admin/coupons.php          → all coupons + redemption counts
 * POST /api/admin/coupons.php {coupon} → create
 */
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/admin.php';

handle(['GET', 'POST'], function (array $body): never {
    $admin = require_admin();

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $coupon = admin_create_coupon($body);
        record_audit((int) $admin['id'], 'coupon.create', 'coupon', $coupon['id'], ['code' => $coupon['code']]);
        json_ok(['coupon' => $coupon, 'items' => admin_list_coupons()], 201, 'کد تخفیف ایجاد شد');
    }

    json_ok(['items' => admin_list_coupons()]);
});
