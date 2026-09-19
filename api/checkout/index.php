<?php
/**
 * POST /api/checkout/index.php
 *   { idempotencyKey, addressId?|newAddress?, shippingMethod, paymentMethod, couponCode?, notes? }
 *
 * Creates the quotation (پیش‌فاکتور) or the online order. Fully transactional:
 * prices recomputed, stock reserved atomically, document number allocated with
 * a row lock, cart archived. Replaying the same idempotencyKey is safe.
 */
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/orders.php';
require_once __DIR__ . '/../lib/account.php';

handle(['POST'], function (array $body): never {
    $user = require_user();
    $userId = (int) $user['id'];

    $idempotencyKey = (string) field_string($body, 'idempotencyKey', true, 80);
    if (mb_strlen($idempotencyKey) < 8) {
        throw err_validation('کلید یکتای درخواست معتبر نیست');
    }

    rate_limit('checkout:user:' . $userId, 10, 600);
    rate_limit('checkout:ip:' . client_ip(), 30, 600);

    $shippingMethod = (string) field_enum($body, 'shippingMethod', ['freight', 'pickup']);
    $paymentMethod  = (string) field_enum($body, 'paymentMethod', ['manual', 'gateway']);

    if ($paymentMethod === 'gateway' && !(bool) cfg('payment.gateway_enabled', false)) {
        throw err_bad_request('پرداخت آنلاین در حال حاضر فعال نیست', 'GATEWAY_DISABLED');
    }

    $addressId = null;

    if (!empty($body['addressId'])) {
        $raw = (string) $body['addressId'];
        if (!ctype_digit($raw)) {
            throw err_validation('شناسه آدرس معتبر نیست');
        }
        $addressId = (int) $raw;
    } elseif (!empty($body['newAddress']) && is_array($body['newAddress'])) {
        // Persist the new address first so it is reusable next time.
        $addressId = create_address($userId, validate_address_input($body['newAddress']));
    } else {
        throw err_validation('آدرس تحویل سفارش الزامی است');
    }

    $result = create_order($userId, [
        'idempotencyKey' => $idempotencyKey,
        'shippingMethod' => $shippingMethod,
        'paymentMethod'  => $paymentMethod,
        'couponCode'     => field_string($body, 'couponCode', false, 40),
        'notes'          => field_string($body, 'notes', false, 500),
        'addressId'      => $addressId,
    ]);

    json_ok($result, 201, $paymentMethod === 'gateway' ? 'سفارش ثبت شد' : 'پیش‌فاکتور شما ثبت شد');
});
