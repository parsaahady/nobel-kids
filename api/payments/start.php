<?php
/**
 * POST /api/payments/start.php  { orderId }
 * Creates the gateway transaction and returns the redirect URL for an
 * AWAITING_PAYMENT order that belongs to the caller.
 */
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/payments.php';

handle(['POST'], function (array $body): never {
    $user = require_user();
    $raw = (string) field_string($body, 'orderId', true, 40);
    if (!ctype_digit($raw)) {
        throw err_validation('شناسه سفارش معتبر نیست');
    }
    rate_limit('payment-start:user:' . $user['id'], 10, 600);
    json_ok(start_gateway_payment((int) $raw, (int) $user['id']));
});
