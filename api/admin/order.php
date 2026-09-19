<?php
/**
 * GET   /api/admin/order.php?id=<id|number>  → detail + allowedNext + history
 * PATCH /api/admin/order.php?id=<id>         → { status?, paymentStatus?, shippingStatus?, trackingCode?, internalNote? }
 *
 * Status changes are validated against the server-side transition table;
 * cancel/refund/reject release the reserved stock exactly once.
 */
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/admin.php';

handle(['GET', 'PATCH'], function (array $body): never {
    $admin = require_admin();
    $raw = query_string_param('id', null, 60);
    if ($raw === null || $raw === '') {
        throw err_validation('شناسه سفارش مشخص نشده است');
    }

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        json_ok(['order' => admin_get_order($raw)]);
    }

    if (!ctype_digit($raw)) {
        throw err_validation('شناسه سفارش معتبر نیست');
    }
    $orderId = (int) $raw;

    $update = [];
    if (isset($body['status'])) {
        $update['status'] = (string) field_enum($body, 'status', [
            'PENDING', 'AWAITING_PAYMENT', 'PAID', 'PROCESSING', 'PACKED',
            'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED',
        ]);
    }
    if (isset($body['paymentStatus'])) {
        $update['paymentStatus'] = (string) field_enum($body, 'paymentStatus', ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED']);
    }
    if (isset($body['shippingStatus'])) {
        $update['shippingStatus'] = (string) field_enum($body, 'shippingStatus', ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED']);
    }
    if (array_key_exists('trackingCode', $body)) {
        $update['trackingCode'] = field_string($body, 'trackingCode', false, 100);
    }
    if (array_key_exists('internalNote', $body)) {
        $update['internalNote'] = field_string($body, 'internalNote', false, 1000);
    }
    if ($update === []) {
        throw err_validation('هیچ تغییری ارسال نشده است');
    }

    $changed = admin_update_order($orderId, (int) $admin['id'], $update);
    record_audit((int) $admin['id'], 'order.update', 'order', (string) $orderId, $changed);

    json_ok(['changed' => $changed, 'order' => admin_get_order((string) $orderId)], 200, 'سفارش به‌روز شد');
});
