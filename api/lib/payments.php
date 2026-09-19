<?php
/**
 * Nobel Kids — payment gateways (manual / ZarinPal / IDPay).
 *
 * Security model for online payments:
 *   • the amount charged is ALWAYS the amount stored in payment_transactions
 *     when the authority was issued — never a number from the callback URL
 *   • the order is located by our own `authority`, not by a browser-supplied id
 *   • verification is a server-to-server call to the gateway
 *   • marking paid is idempotent, so replayed callbacks change nothing
 *   • amount drift between the payment row and the order total aborts the flow
 */

declare(strict_types=1);

// ─────────────────────────── Direct-access guard ────────────────────────────
// This file is a library include, never a web endpoint. api/.htaccess already
// blocks the path, but a host with AllowOverride None would ignore that, so we
// refuse to run when requested directly. Defence in depth, zero cost.
if (isset($_SERVER['SCRIPT_FILENAME']) && realpath($_SERVER['SCRIPT_FILENAME']) === realpath(__FILE__)) {
    http_response_code(404);
    exit;
}

require_once __DIR__ . '/../config/app.php';
require_once __DIR__ . '/../config/response.php';
require_once __DIR__ . '/orders.php';

interface PaymentProvider
{
    public function name(): string;

    /**
     * @param array<string,mixed> $order
     * @return array{authority:string,redirectUrl:string}
     */
    public function createPayment(array $order, string $description, string $userMobile): array;

    /**
     * @param array<string,string> $params
     * @return array{ok:bool,referenceId:?string,cardPan:?string,raw:mixed}
     */
    public function verifyPayment(string $authority, int $amountToman, array $params): array;
}

abstract class HttpPaymentProvider implements PaymentProvider
{
    /** Gateways price in Rial; we store Toman. */
    protected function toRial(int $toman): int
    {
        return $toman * 10;
    }

    /**
     * @param array<string,mixed> $payload
     * @param list<string> $headers
     * @return array{status:int,body:?array<string,mixed>}
     */
    protected function postJson(string $url, array $payload, array $headers = []): array
    {
        if (!function_exists('curl_init')) {
            throw err_provider('افزونه cURL روی سرور فعال نیست؛ پرداخت آنلاین ممکن نیست');
        }
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_CONNECTTIMEOUT => 8,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_HTTPHEADER => array_merge(['Content-Type: application/json', 'Accept: application/json'], $headers),
        ]);
        $raw = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($raw === false) {
            nobel_log('error', 'payment.transport_failed', ['provider' => $this->name(), 'error' => $error]);
            throw err_provider('اتصال به درگاه پرداخت ممکن نشد');
        }
        $decoded = json_decode((string) $raw, true);
        return ['status' => $status, 'body' => is_array($decoded) ? $decoded : null];
    }
}

final class ZarinPalProvider extends HttpPaymentProvider
{
    public function name(): string
    {
        return 'ZARINPAL';
    }

    private function base(): string
    {
        return (bool) cfg('payment.sandbox', false)
            ? 'https://sandbox.zarinpal.com/pg/v4/payment'
            : 'https://payment.zarinpal.com/pg/v4/payment';
    }

    private function payPage(): string
    {
        return (bool) cfg('payment.sandbox', false)
            ? 'https://sandbox.zarinpal.com/pg/StartPay'
            : 'https://payment.zarinpal.com/pg/StartPay';
    }

    public function createPayment(array $order, string $description, string $userMobile): array
    {
        $result = $this->postJson($this->base() . '/request.json', [
            'merchant_id' => (string) cfg('payment.merchant_id', ''),
            'amount' => $this->toRial((int) $order['total']),
            'callback_url' => (string) cfg('payment.callback_url', nobel_site_url() . '/api/payments/callback.php'),
            'description' => $description,
            'mobile' => $userMobile,
        ]);

        $data = $result['body']['data'] ?? null;
        $authority = is_array($data) ? (string) ($data['authority'] ?? '') : '';
        $code = is_array($data) ? (int) ($data['code'] ?? 0) : 0;

        if ($result['status'] !== 200 || $authority === '' || ($code !== 0 && $code !== 100)) {
            nobel_log('error', 'payment.create_rejected', ['provider' => $this->name(), 'status' => $result['status'], 'code' => $code]);
            throw err_provider('ایجاد تراکنش در درگاه ناموفق بود');
        }
        return ['authority' => $authority, 'redirectUrl' => $this->payPage() . '/' . $authority];
    }

    public function verifyPayment(string $authority, int $amountToman, array $params): array
    {
        // The customer cancelled at the gateway.
        if (isset($params['Status']) && $params['Status'] !== 'OK') {
            return ['ok' => false, 'referenceId' => null, 'cardPan' => null, 'raw' => null];
        }

        $result = $this->postJson($this->base() . '/verify.json', [
            'merchant_id' => (string) cfg('payment.merchant_id', ''),
            'amount' => $this->toRial($amountToman),
            'authority' => $authority,
        ]);

        $data = $result['body']['data'] ?? null;
        $code = is_array($data) ? (int) ($data['code'] ?? 0) : 0;
        $ok = $result['status'] === 200 && ($code === 100 || $code === 101);

        return [
            'ok' => $ok,
            'referenceId' => is_array($data) && isset($data['ref_id']) ? (string) $data['ref_id'] : null,
            'cardPan' => is_array($data) && isset($data['card_pan']) ? (string) $data['card_pan'] : null,
            'raw' => $result['body'],
        ];
    }
}

final class IDPayProvider extends HttpPaymentProvider
{
    public function name(): string
    {
        return 'IDPAY';
    }

    /** @return list<string> */
    private function headers(): array
    {
        $headers = ['X-API-KEY: ' . (string) cfg('payment.access_token', '')];
        if ((bool) cfg('payment.sandbox', false)) {
            $headers[] = 'X-SANDBOX: 1';
        }
        return $headers;
    }

    public function createPayment(array $order, string $description, string $userMobile): array
    {
        $result = $this->postJson('https://api.idpay.ir/v1.1/payment', [
            'order_id' => (string) $order['order_number'],
            'amount' => $this->toRial((int) $order['total']),
            'desc' => $description,
            'callback_url' => (string) cfg('payment.callback_url', nobel_site_url() . '/api/payments/callback.php'),
            'phone' => $userMobile,
        ], $this->headers());

        $id = isset($result['body']['id']) ? (string) $result['body']['id'] : '';
        $link = isset($result['body']['link']) ? (string) $result['body']['link'] : '';

        if ($result['status'] !== 201 || $id === '' || $link === '') {
            nobel_log('error', 'payment.create_rejected', ['provider' => $this->name(), 'status' => $result['status']]);
            throw err_provider('ایجاد تراکنش در درگاه ناموفق بود');
        }
        return ['authority' => $id, 'redirectUrl' => $link];
    }

    public function verifyPayment(string $authority, int $amountToman, array $params): array
    {
        if (isset($params['status']) && $params['status'] !== '10') {
            return ['ok' => false, 'referenceId' => null, 'cardPan' => null, 'raw' => null];
        }

        $result = $this->postJson('https://api.idpay.ir/v1.1/payment/verify', [
            'id' => $authority,
            'order_id' => $params['order_id'] ?? null,
        ], $this->headers());

        $status = isset($result['body']['status']) ? (int) $result['body']['status'] : 0;
        $ok = $result['status'] === 200 && ($status === 100 || $status === 101);

        return [
            'ok' => $ok,
            'referenceId' => isset($result['body']['track_id']) ? (string) $result['body']['track_id'] : null,
            'cardPan' => isset($result['body']['card_no']) ? (string) $result['body']['card_no'] : null,
            'raw' => $result['body'],
        ];
    }
}

/** Returns the configured gateway, or null in manual (پیش‌فاکتور) mode. */
function payment_provider(): ?PaymentProvider
{
    $name = strtolower((string) cfg('payment.provider', 'manual'));
    if ($name === 'manual' || $name === '') {
        return null;
    }
    return match ($name) {
        'zarinpal' => new ZarinPalProvider(),
        'idpay' => new IDPayProvider(),
        default => throw err_provider('درگاه پرداخت پیکربندی نشده است'),
    };
}

/**
 * Starts an online payment for an AWAITING_PAYMENT order.
 *
 * @return array{redirectUrl:string,authority:string}
 * @throws ApiException
 */
function start_gateway_payment(int $orderId, int $userId): array
{
    $provider = payment_provider();
    if ($provider === null) {
        throw new ApiException('PAYMENT_UNAVAILABLE', 'درگاه پرداخت پیکربندی نشده است', 503);
    }

    $order = db_one('SELECT * FROM orders WHERE id = :id AND user_id = :u LIMIT 1', ['id' => $orderId, 'u' => $userId]);
    if ($order === null) {
        throw err_not_found('سفارش یافت نشد');
    }
    if ((string) $order['payment_status'] === 'SUCCESS') {
        throw err_conflict('این سفارش قبلاً پرداخت شده است');
    }
    if ((string) $order['status'] !== 'AWAITING_PAYMENT') {
        throw err_conflict('این سفارش در وضعیت پرداخت آنلاین نیست');
    }

    $amount = (int) $order['total'];
    $created = $provider->createPayment($order, 'خرید عمده نوبل کیدز — ' . (string) $order['order_number'], (string) $order['customer_mobile']);

    // Persist the authority WITH the exact amount we asked the gateway for.
    db_exec(
        "UPDATE payment_transactions
            SET authority = :auth, provider = :prov, amount = :amt, status = 'INITIATED', updated_at = NOW()
          WHERE order_id = :o AND status IN ('PENDING','INITIATED')
          ORDER BY id DESC LIMIT 1",
        ['auth' => $created['authority'], 'prov' => $provider->name(), 'amt' => $amount, 'o' => $orderId]
    );

    nobel_log('info', 'payment.initiated', ['orderId' => $orderId, 'provider' => $provider->name()]);
    return ['redirectUrl' => $created['redirectUrl'], 'authority' => $created['authority']];
}

/**
 * Handles a gateway callback.
 *
 * @param array<string,string> $params
 * @return array{ok:bool,orderNumber:?string,referenceId:?string,message:?string}
 */
function handle_gateway_callback(array $params): array
{
    $provider = payment_provider();
    if ($provider === null) {
        throw new ApiException('PAYMENT_UNAVAILABLE', 'درگاه پرداخت پیکربندی نشده است', 503);
    }

    $authority = $params['Authority'] ?? $params['authority'] ?? $params['id'] ?? $params['track_id'] ?? null;
    if ($authority === null || $authority === '') {
        nobel_log('warn', 'payment.callback_no_authority');
        return ['ok' => false, 'orderNumber' => null, 'referenceId' => null, 'message' => 'شناسه تراکنش دریافت نشد'];
    }

    // The transaction is looked up in OUR table, never trusted from the URL.
    $payment = db_one(
        'SELECT t.*, o.order_number, o.total AS order_total, o.id AS oid
           FROM payment_transactions t JOIN orders o ON o.id = t.order_id
          WHERE t.authority = :a LIMIT 1',
        ['a' => (string) $authority]
    );
    if ($payment === null) {
        nobel_log('warn', 'payment.callback_unknown');
        return ['ok' => false, 'orderNumber' => null, 'referenceId' => null, 'message' => 'تراکنش در سیستم ثبت نشده است'];
    }

    // Idempotent: a replayed callback simply reports the same outcome.
    if ((string) $payment['status'] === 'SUCCESS') {
        return [
            'ok' => true,
            'orderNumber' => (string) $payment['order_number'],
            'referenceId' => $payment['reference_id'] !== null ? (string) $payment['reference_id'] : null,
            'message' => null,
        ];
    }

    $expectedAmount = (int) $payment['amount'];
    if ($expectedAmount !== (int) $payment['order_total']) {
        nobel_log('error', 'payment.amount_mismatch', [
            'orderId' => (int) $payment['oid'],
            'expected' => (int) $payment['order_total'],
            'stored' => $expectedAmount,
        ]);
        mark_payment_failed((int) $payment['oid'], ['reason' => 'amount-mismatch']);
        return ['ok' => false, 'orderNumber' => (string) $payment['order_number'], 'referenceId' => null, 'message' => 'مغایرت مبلغ تراکنش'];
    }

    $verify = $provider->verifyPayment((string) $authority, $expectedAmount, $params);

    if (!$verify['ok']) {
        mark_payment_failed((int) $payment['oid'], $verify['raw']);
        return ['ok' => false, 'orderNumber' => (string) $payment['order_number'], 'referenceId' => null, 'message' => 'پرداخت توسط درگاه تأیید نشد'];
    }

    mark_order_paid((int) $payment['oid'], null, $verify['referenceId'], $verify['cardPan'], $verify['raw']);
    nobel_log('info', 'payment.verified', ['orderId' => (int) $payment['oid'], 'provider' => $provider->name()]);

    return [
        'ok' => true,
        'orderNumber' => (string) $payment['order_number'],
        'referenceId' => $verify['referenceId'],
        'message' => null,
    ];
}

/** Cancels stale unpaid gateway orders and returns their stock. Used by cron. */
function expire_unpaid_orders(int $olderThanMinutes = 60): int
{
    $stale = db_all(
        "SELECT id FROM orders
          WHERE status = 'AWAITING_PAYMENT' AND payment_method = 'GATEWAY'
            AND created_at < (NOW() - INTERVAL :m MINUTE)",
        ['m' => $olderThanMinutes]
    );

    $count = 0;
    foreach ($stale as $row) {
        $orderId = (int) $row['id'];
        try {
            db_transaction(static function () use ($orderId): void {
                release_order_stock($orderId, 'payment-timeout');
                db_exec("UPDATE orders SET status = 'CANCELLED', updated_at = NOW() WHERE id = :id", ['id' => $orderId]);
            });
            $count++;
        } catch (Throwable $e) {
            nobel_log('error', 'orders.expire_failed', ['orderId' => $orderId, 'message' => $e->getMessage()]);
        }
    }
    if ($count > 0) {
        nobel_log('info', 'orders.expired', ['count' => $count]);
    }
    return $count;
}
