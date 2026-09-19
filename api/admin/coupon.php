<?php
/** PATCH /api/admin/coupon.php?id=<id>  { isActive } — enable/disable a coupon. */
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/admin.php';

handle(['PATCH'], function (array $body): never {
    $admin = require_admin();
    $raw = query_string_param('id', null, 40);
    if ($raw === null || !ctype_digit($raw)) {
        throw err_validation('شناسه کد تخفیف معتبر نیست');
    }
    $isActive = (bool) field_bool($body, 'isActive', true);
    $coupon = admin_toggle_coupon((int) $raw, $isActive);
    record_audit((int) $admin['id'], 'coupon.toggle', 'coupon', $raw, ['isActive' => $isActive]);
    json_ok(['coupon' => $coupon, 'items' => admin_list_coupons()], 200, $isActive ? 'کد تخفیف فعال شد' : 'کد تخفیف غیرفعال شد');
});
