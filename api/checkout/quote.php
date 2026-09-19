<?php
/**
 * POST /api/checkout/quote.php  { shippingMethod, couponCode? }
 *
 * Server-side price preview. Every number here is recomputed from the
 * database; nothing the browser sends influences the amounts.
 */
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/orders.php';

handle(['POST'], function (array $body): never {
    $user = require_user();
    $shipping = field_enum($body, 'shippingMethod', ['freight', 'pickup']);
    $coupon = field_string($body, 'couponCode', false, 40);

    json_ok(['quote' => build_quote((int) $user['id'], (string) $shipping, $coupon)]);
});
