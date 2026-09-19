<?php
/**
 * Nobel Kids — quotation / order engine.
 *
 *  A "quotation" (پیش‌فاکتور) is the wholesale proforma flow: the customer
 *  submits it, receives a tracking number (NBLQ-2026-000001) and the sales
 *  team confirms availability and the final amount. Online-paid orders use
 *  the same machinery with kind=ORDER and number NBL-2026-000001.
 *
 *  EVERY amount is recomputed here from live DB rows inside a transaction.
 *  Stock is verified and decremented atomically with a guard that makes a
 *  negative stock impossible even under concurrent submissions.
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

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/response.php';
require_once __DIR__ . '/pricing.php';
require_once __DIR__ . '/catalog.php';
require_once __DIR__ . '/cart.php';

/** Statuses that count as "reserved stock" (used when releasing). */
const ORDER_ACTIVE_STATUSES = ['PENDING', 'REVIEWING', 'APPROVED', 'AWAITING_PAYMENT', 'PAID', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED', 'COMPLETED'];

/** Full status list accepted by the admin. */
const ORDER_ALL_STATUSES = [
    'PENDING', 'REVIEWING', 'APPROVED', 'REJECTED', 'COMPLETED',
    'AWAITING_PAYMENT', 'PAID', 'PROCESSING', 'PACKED', 'SHIPPED',
    'DELIVERED', 'CANCELLED', 'REFUNDED',
];

/** Statuses that release reserved stock when entered. */
const ORDER_RELEASING_STATUSES = ['CANCELLED', 'REJECTED', 'REFUNDED'];

/**
 * Collision-safe sequential number: NBLQ-2026-000001 / NBL-2026-000001.
 * Uses a row lock on number_counters so parallel requests cannot collide.
 */
function next_document_number(string $scope): string
{
    $year = (int) date('Y');
    $prefix = $scope === 'QUOTATION' ? 'NBLQ' : 'NBL';

    db_exec(
        'INSERT INTO number_counters (scope, `year`, `value`) VALUES (:s, :y, 1)
         ON DUPLICATE KEY UPDATE `value` = `value` + 1',
        ['s' => $scope, 'y' => $year]
    );
    $value = (int) db_value('SELECT `value` FROM number_counters WHERE scope = :s AND `year` = :y', ['s' => $scope, 'y' => $year]);

    return sprintf('%s-%d-%06d', $prefix, $year, $value);
}

/**
 * Recomputes the whole cart from live DB prices — the only trusted numbers.
 *
 * @return array{cartId:int,lines:list<array<string,mixed>>,subtotal:int,baseTotal:int,tierDiscount:int}
 * @throws ApiException
 */
function snapshot_cart(int $userId): array
{
    $cartId = find_active_cart($userId, null);
    if ($cartId === null) {
        throw err_bad_request('سبد خرید شما خالی است', 'CART_EMPTY');
    }

    $rows = db_all(
        'SELECT ci.*, p.name, p.sku, p.price, p.stock, p.pack_size, p.status, p.deleted_at, p.min_packs,
                c.is_active AS category_active
           FROM cart_items ci
           JOIN products p ON p.id = ci.product_id
           JOIN categories c ON c.id = p.category_id
          WHERE ci.cart_id = :c
          ORDER BY ci.created_at ASC, ci.id ASC',
        ['c' => $cartId]
    );
    if ($rows === []) {
        throw err_bad_request('سبد خرید شما خالی است', 'CART_EMPTY');
    }

    $lines = [];
    $subtotal = 0;
    $baseTotal = 0;

    foreach ($rows as $row) {
        $name = (string) $row['name'];
        if ((string) $row['status'] !== 'ACTIVE' || $row['deleted_at'] !== null || (int) $row['category_active'] !== 1) {
            throw err_conflict(sprintf('«%s» دیگر قابل سفارش نیست؛ آن را از سبد حذف کنید', $name), 'PRODUCT_UNAVAILABLE');
        }
        $stock = (int) $row['stock'];
        if ($stock <= 0) {
            throw err_out_of_stock(sprintf('«%s» ناموجود شده است', $name));
        }

        $packCount = min((int) $row['pack_count'], $stock);
        $packSize = (int) $row['pack_size'];
        $basePrice = (int) $row['price'];
        $tiers = product_tiers((int) $row['product_id']);

        $unit = wholesale_unit_price($basePrice, $packCount, $tiers);
        $lineBase = $basePrice * $packSize * $packCount;
        $lineTotal = $unit * $packSize * $packCount;

        $lines[] = [
            'cartItemId' => (int) $row['id'],
            'productId' => (int) $row['product_id'],
            'productName' => $name,
            'sku' => (string) $row['sku'],
            'packMode' => (string) $row['pack_mode'],
            'colorName' => (string) $row['color_name'],
            'colorHex' => $row['color_hex'],
            'sizeLabel' => (string) $row['size_label'],
            'packSize' => $packSize,
            'packCount' => $packCount,
            'baseUnit' => $basePrice,
            'unit' => $unit,
            'lineBase' => $lineBase,
            'lineTotal' => $lineTotal,
            'stock' => $stock,
            'slug' => null,
            'tiers' => $tiers,
        ];

        $subtotal += $lineTotal;
        $baseTotal += $lineBase;
    }

    return [
        'cartId' => $cartId,
        'lines' => $lines,
        'subtotal' => $subtotal,
        'baseTotal' => $baseTotal,
        'tierDiscount' => $baseTotal - $subtotal,
    ];
}

/**
 * Validates a coupon for this user/subtotal.
 *
 * @return array{coupon:array<string,mixed>,amount:int}
 * @throws ApiException
 */
function validate_coupon(string $code, int $userId, int $subtotal): array
{
    $coupon = db_one('SELECT * FROM coupons WHERE code = :c LIMIT 1', ['c' => strtoupper(trim($code))]);
    $invalid = static fn (): ApiException => err_bad_request('کد تخفیف معتبر نیست یا منقضی شده است', 'COUPON_INVALID');

    if ($coupon === null || (int) $coupon['is_active'] !== 1) {
        throw $invalid();
    }
    $now = time();
    if ($coupon['starts_at'] !== null && strtotime((string) $coupon['starts_at']) > $now) {
        throw $invalid();
    }
    if ($coupon['expires_at'] !== null && strtotime((string) $coupon['expires_at']) < $now) {
        throw $invalid();
    }
    if ($coupon['usage_limit'] !== null && (int) $coupon['used_count'] >= (int) $coupon['usage_limit']) {
        throw $invalid();
    }
    if ($coupon['min_order_total'] !== null && $subtotal < (int) $coupon['min_order_total']) {
        throw err_bad_request('مبلغ سفارش به حد نصاب این کد تخفیف نمی‌رسد', 'COUPON_MIN_TOTAL');
    }
    if ($coupon['per_user_limit'] !== null) {
        $used = (int) db_value('SELECT COUNT(*) FROM coupon_redemptions WHERE coupon_id = :c AND user_id = :u', ['c' => (int) $coupon['id'], 'u' => $userId]);
        if ($used >= (int) $coupon['per_user_limit']) {
            throw $invalid();
        }
    }

    $amount = coupon_discount_amount([
        'type' => (string) $coupon['type'],
        'value' => (int) $coupon['value'],
        'maxDiscount' => $coupon['max_discount'] !== null ? (int) $coupon['max_discount'] : null,
        'minOrderTotal' => $coupon['min_order_total'] !== null ? (int) $coupon['min_order_total'] : null,
    ], $subtotal);

    if ($amount <= 0) {
        throw $invalid();
    }
    return ['coupon' => $coupon, 'amount' => $amount];
}

/**
 * Builds the checkout quote shown before submitting (CheckoutQuoteDTO).
 *
 * @return array<string,mixed>
 * @throws ApiException
 */
function build_quote(int $userId, string $shippingMethodId, ?string $couponCode): array
{
    $snapshot = snapshot_cart($userId);
    $shipping = get_shipping_method($shippingMethodId);

    $couponAmount = 0;
    $couponInfo = null;
    if ($couponCode !== null && $couponCode !== '') {
        $validated = validate_coupon($couponCode, $userId, $snapshot['subtotal']);
        $couponAmount = $validated['amount'];
        $couponInfo = [
            'code' => (string) $validated['coupon']['code'],
            'type' => (string) $validated['coupon']['type'],
            'value' => (int) $validated['coupon']['value'],
        ];
    }

    $shippingCost = (int) ($shipping['cost'] ?? 0);
    $total = max(0, $snapshot['subtotal'] - $couponAmount + $shippingCost);

    $items = [];
    $totalPacks = 0;
    $totalPieces = 0;
    foreach ($snapshot['lines'] as $line) {
        $totalPacks += $line['packCount'];
        $totalPieces += $line['packCount'] * $line['packSize'];
        $items[] = [
            'id' => (string) $line['cartItemId'],
            'productId' => (string) $line['productId'],
            'packMode' => $line['packMode'] === 'single' ? 'single' : 'assorted',
            'colorName' => $line['colorName'],
            'colorHex' => $line['colorHex'],
            'sizeLabel' => $line['sizeLabel'],
            'packCount' => $line['packCount'],
            'unitPrice' => $line['unit'],
            'product' => [
                'name' => $line['productName'],
                'shortName' => null,
                'slug' => '',
                'image' => null,
                'packSize' => $line['packSize'],
                'stock' => $line['stock'],
                'price' => $line['baseUnit'],
                'status' => 'ACTIVE',
                'tiers' => $line['tiers'],
            ],
        ];
    }

    return [
        'items' => $items,
        'subtotal' => $snapshot['subtotal'],
        'baseTotal' => $snapshot['baseTotal'],
        'tierDiscount' => $snapshot['tierDiscount'],
        'couponDiscount' => $couponAmount,
        'coupon' => $couponInfo,
        'shippingCost' => $shippingCost,
        'shippingMethod' => (string) $shipping['id'],
        'total' => $total,
        'totalPacks' => $totalPacks,
        'totalPieces' => $totalPieces,
    ];
}

/**
 * Creates a quotation/order atomically:
 *   validate → recompute prices → reserve stock (guarded) → write rows → close cart
 *
 * @param array<string,mixed> $input
 * @return array<string,mixed>
 * @throws ApiException
 */
function create_order(int $userId, array $input): array
{
    $idempotencyKey = (string) $input['idempotencyKey'];

    // Idempotent replay: same key → return the existing document.
    $existing = db_one('SELECT id FROM orders WHERE idempotency_key = :k LIMIT 1', ['k' => $idempotencyKey]);
    if ($existing !== null) {
        $order = get_user_order($userId, (string) $existing['id']);
        return ['order' => $order, 'payment' => ['kind' => strtolower((string) $order['paymentMethod'])], 'replayed' => true];
    }

    $paymentMethod = (string) ($input['paymentMethod'] ?? 'manual');
    $kind = $paymentMethod === 'gateway' ? 'ORDER' : 'QUOTATION';

    $result = db_transaction(static function (PDO $pdo) use ($userId, $input, $idempotencyKey, $paymentMethod, $kind): array {
        // Re-read the cart INSIDE the transaction.
        $snapshot = snapshot_cart($userId);
        $shipping = get_shipping_method((string) $input['shippingMethod']);

        $couponAmount = 0;
        $couponRow = null;
        if (!empty($input['couponCode'])) {
            $validated = validate_coupon((string) $input['couponCode'], $userId, $snapshot['subtotal']);
            $couponAmount = $validated['amount'];
            $couponRow = $validated['coupon'];
        }

        // Address: existing id (ownership checked) or an inline snapshot.
        $addressId = null;
        $addressSnapshot = [];
        if (!empty($input['addressId'])) {
            $address = db_one('SELECT * FROM addresses WHERE id = :id AND user_id = :u LIMIT 1', ['id' => (int) $input['addressId'], 'u' => $userId]);
            if ($address === null) {
                throw err_not_found('آدرس انتخابی یافت نشد');
            }
            $addressId = (int) $address['id'];
            $addressSnapshot = [
                'recipientName' => (string) $address['recipient_name'],
                'mobile' => (string) $address['mobile'],
                'province' => (string) $address['province'],
                'city' => (string) $address['city'],
                'address' => (string) $address['address'],
                'postalCode' => $address['postal_code'],
            ];
        } elseif (!empty($input['addressSnapshot']) && is_array($input['addressSnapshot'])) {
            $addressSnapshot = $input['addressSnapshot'];
        } else {
            throw err_validation('آدرس تحویل سفارش الزامی است');
        }

        $user = db_one('SELECT id, name, mobile, business_name FROM users WHERE id = :id', ['id' => $userId]);
        if ($user === null) {
            throw err_unauthorized();
        }

        $shippingCost = (int) ($shipping['cost'] ?? 0);
        $total = max(0, $snapshot['subtotal'] - $couponAmount + $shippingCost);
        $discount = $snapshot['tierDiscount'] + $couponAmount;

        $status = $paymentMethod === 'gateway' ? 'AWAITING_PAYMENT' : 'PENDING';
        $orderNumber = next_document_number('ORDER');
        $quotationNumber = $kind === 'QUOTATION' ? next_document_number('QUOTATION') : null;

        $history = [[
            'at' => date('c'),
            'to' => $status,
            'by' => 'customer',
        ]];

        db_exec(
            'INSERT INTO orders (order_number, quotation_number, kind, user_id, idempotency_key, status,
                                 payment_status, shipping_status, payment_method, subtotal, base_total, discount,
                                 coupon_id, shipping_cost, shipping_method, total, currency, customer_name,
                                 customer_mobile, business_name, address_id, address_snapshot, notes,
                                 status_history, created_at, updated_at)
             VALUES (:onum, :qnum, :kind, :uid, :idem, :status, \'PENDING\', \'PENDING\', :pmethod, :subtotal,
                     :basetotal, :discount, :coupon, :shipcost, :shipmethod, :total, \'IRT\', :cname, :cmobile,
                     :bname, :aid, :asnap, :notes, :history, NOW(), NOW())',
            [
                'onum' => $orderNumber,
                'qnum' => $quotationNumber,
                'kind' => $kind,
                'uid' => $userId,
                'idem' => $idempotencyKey,
                'status' => $status,
                'pmethod' => $paymentMethod === 'gateway' ? 'GATEWAY' : 'MANUAL',
                'subtotal' => $snapshot['subtotal'],
                'basetotal' => $snapshot['baseTotal'],
                'discount' => $discount,
                'coupon' => $couponRow === null ? null : (int) $couponRow['id'],
                'shipcost' => $shippingCost,
                'shipmethod' => (string) $shipping['id'],
                'total' => $total,
                'cname' => (string) ($user['name'] ?? ($addressSnapshot['recipientName'] ?? 'همکار')),
                'cmobile' => (string) $user['mobile'],
                'bname' => $user['business_name'],
                'aid' => $addressId,
                'asnap' => json_encode($addressSnapshot, JSON_UNESCAPED_UNICODE),
                'notes' => $input['notes'] ?? null,
                'history' => json_encode($history, JSON_UNESCAPED_UNICODE),
            ]
        );
        $orderId = db_last_id();

        foreach ($snapshot['lines'] as $line) {
            // ATOMIC stock reservation: the WHERE clause makes overselling
            // impossible even if two requests run at the same time.
            $affected = db_exec(
                'UPDATE products SET stock = stock - :q WHERE id = :p AND stock >= :q',
                ['q' => $line['packCount'], 'p' => $line['productId']]
            );
            if ($affected !== 1) {
                throw err_out_of_stock(sprintf('موجودی «%s» کافی نیست؛ سبد خود را به‌روز کنید', (string) $line['productName']));
            }

            db_exec(
                'INSERT INTO order_items (order_id, product_id, product_name, sku, variant_name, pack_mode,
                                          quantity, pack_count, pack_size, unit_price, base_price, discount, total)
                 VALUES (:oid, :pid, :pname, :sku, :vname, :pmode, :qty, :packs, :psize, :unit, :base, :disc, :total)',
                [
                    'oid' => $orderId,
                    'pid' => $line['productId'],
                    'pname' => $line['productName'],
                    'sku' => $line['sku'],
                    'vname' => $line['colorName'] . ' · ' . $line['sizeLabel'],
                    'pmode' => $line['packMode'],
                    'qty' => $line['packCount'],
                    'packs' => $line['packCount'],
                    'psize' => $line['packSize'],
                    'unit' => $line['unit'],
                    'base' => $line['baseUnit'],
                    'disc' => $line['lineBase'] - $line['lineTotal'],
                    'total' => $line['lineTotal'],
                ]
            );

            db_exec(
                'INSERT INTO inventory_logs (product_id, type, quantity, reason, order_id, created_at)
                 VALUES (:p, \'SALE\', :q, \'reserve-for-order\', :o, NOW())',
                ['p' => $line['productId'], 'q' => -$line['packCount'], 'o' => $orderId]
            );
        }

        if ($couponRow !== null) {
            db_exec('UPDATE coupons SET used_count = used_count + 1 WHERE id = :id', ['id' => (int) $couponRow['id']]);
            db_exec(
                'INSERT INTO coupon_redemptions (coupon_id, order_id, user_id, amount, created_at) VALUES (:c, :o, :u, :a, NOW())',
                ['c' => (int) $couponRow['id'], 'o' => $orderId, 'u' => $userId, 'a' => $couponAmount]
            );
        }

        // Close the cart; the lines are archived on the order.
        db_exec("UPDATE carts SET status = 'CONVERTED' WHERE id = :id", ['id' => $snapshot['cartId']]);
        db_exec('DELETE FROM cart_items WHERE cart_id = :id', ['id' => $snapshot['cartId']]);

        // Manual flow records a PENDING payment row so the admin can confirm it.
        db_exec(
            'INSERT INTO payment_transactions (order_id, provider, amount, status, created_at, updated_at)
             VALUES (:o, :prov, :amt, \'PENDING\', NOW(), NOW())',
            ['o' => $orderId, 'prov' => $paymentMethod === 'gateway' ? strtoupper((string) cfg('payment.provider', 'MANUAL')) : 'MANUAL', 'amt' => $total]
        );

        return ['orderId' => $orderId, 'total' => $total];
    });

    $order = get_user_order($userId, (string) $result['orderId']);
    nobel_log('info', 'order.created', [
        'orderId' => $result['orderId'],
        'number' => $order['orderNumber'],
        'userId' => $userId,
        'total' => $result['total'],
        'kind' => $kind,
    ]);

    if ($paymentMethod !== 'gateway') {
        return ['order' => $order, 'payment' => ['kind' => 'manual']];
    }

    // Online flow: open the gateway transaction and hand back the redirect URL
    // (CheckoutClient reads result.payment.redirectUrl). If the gateway refuses
    // we roll the order back to a quotation rather than stranding the customer.
    require_once __DIR__ . '/payments.php';
    try {
        $started = start_gateway_payment((int) $result['orderId'], $userId);
        return ['order' => $order, 'payment' => ['kind' => 'gateway', 'redirectUrl' => $started['redirectUrl']]];
    } catch (Throwable $e) {
        nobel_log('error', 'order.gateway_start_failed', ['orderId' => $result['orderId'], 'message' => $e->getMessage()]);
        throw err_provider('سفارش ثبت شد اما اتصال به درگاه پرداخت ممکن نشد؛ از حساب کاربری دوباره تلاش کنید');
    }
}

/**
 * @param array<string,mixed> $row
 * @return array<string,mixed>
 */
function map_order_summary(array $row, int $itemCount = 0): array
{
    return [
        'id' => (string) $row['id'],
        'orderNumber' => (string) ($row['quotation_number'] ?: $row['order_number']),
        'quotationNumber' => $row['quotation_number'] !== null ? (string) $row['quotation_number'] : null,
        'kind' => (string) $row['kind'],
        'status' => (string) $row['status'],
        'paymentStatus' => (string) $row['payment_status'],
        'shippingStatus' => (string) $row['shipping_status'],
        'paymentMethod' => (string) $row['payment_method'],
        'subtotal' => (int) $row['subtotal'],
        'discount' => (int) $row['discount'],
        'shippingCost' => (int) $row['shipping_cost'],
        'total' => (int) $row['total'],
        'createdAt' => iso_date((string) $row['created_at']),
        'itemCount' => $itemCount,
        'trackingCode' => $row['tracking_code'] !== null ? (string) $row['tracking_code'] : null,
    ];
}

/**
 * @return array{items:list<array<string,mixed>>,total:int,page:int,pageSize:int,totalPages:int}
 */
function list_user_orders(int $userId, int $page = 1, int $pageSize = 10): array
{
    $page = max(1, $page);
    $pageSize = min(50, max(1, $pageSize));
    $total = (int) db_value('SELECT COUNT(*) FROM orders WHERE user_id = :u', ['u' => $userId]);
    $offset = ($page - 1) * $pageSize;
    $rows = db_all(
        "SELECT o.*, (SELECT COUNT(*) FROM order_items i WHERE i.order_id = o.id) AS item_count
           FROM orders o WHERE o.user_id = :u ORDER BY o.created_at DESC, o.id DESC LIMIT {$pageSize} OFFSET {$offset}",
        ['u' => $userId]
    );
    return [
        'items' => array_map(static fn (array $r): array => map_order_summary($r, (int) $r['item_count']), $rows),
        'total' => $total,
        'page' => $page,
        'pageSize' => $pageSize,
        'totalPages' => max(1, (int) ceil($total / $pageSize)),
    ];
}

/**
 * Order detail scoped to its owner (prevents IDOR).
 *
 * @return array<string,mixed>
 * @throws ApiException
 */
function get_user_order(int $userId, string $idOrNumber): array
{
    $row = db_one(
        'SELECT * FROM orders
          WHERE user_id = :u AND (id = :id OR order_number = :num OR quotation_number = :num)
          LIMIT 1',
        ['u' => $userId, 'id' => ctype_digit($idOrNumber) ? (int) $idOrNumber : 0, 'num' => $idOrNumber]
    );
    if ($row === null) {
        throw err_not_found('سفارش یافت نشد');
    }
    return map_order_detail($row);
}

/** @return array<string,mixed> */
function map_order_detail(array $row): array
{
    $orderId = (int) $row['id'];
    $items = db_all('SELECT * FROM order_items WHERE order_id = :o ORDER BY id ASC', ['o' => $orderId]);
    $payments = db_all('SELECT * FROM payment_transactions WHERE order_id = :o ORDER BY created_at DESC, id DESC', ['o' => $orderId]);

    $snapshot = [];
    if (!empty($row['address_snapshot'])) {
        $decoded = json_decode((string) $row['address_snapshot'], true);
        if (is_array($decoded)) {
            $snapshot = $decoded;
        }
    }

    return map_order_summary($row, count($items)) + [
        'currency' => (string) $row['currency'],
        'customerName' => (string) $row['customer_name'],
        'customerMobile' => (string) $row['customer_mobile'],
        'businessName' => $row['business_name'] !== null ? (string) $row['business_name'] : null,
        'shippingMethod' => (string) $row['shipping_method'],
        'addressSnapshot' => $snapshot,
        'notes' => $row['notes'] !== null ? (string) $row['notes'] : null,
        'internalNote' => $row['internal_note'] !== null ? (string) $row['internal_note'] : null,
        'items' => array_map(static fn (array $i): array => [
            'id' => (string) $i['id'],
            'productId' => $i['product_id'] !== null ? (string) $i['product_id'] : null,
            'productName' => (string) $i['product_name'],
            'sku' => (string) $i['sku'],
            'variantName' => $i['variant_name'] !== null ? (string) $i['variant_name'] : null,
            'packMode' => (string) $i['pack_mode'],
            'quantity' => (int) $i['quantity'],
            'packSize' => (int) $i['pack_size'],
            'unitPrice' => (int) $i['unit_price'],
            'total' => (int) $i['total'],
        ], $items),
        'payments' => array_map(static fn (array $p): array => [
            'id' => (string) $p['id'],
            'provider' => (string) $p['provider'],
            'amount' => (int) $p['amount'],
            'status' => (string) $p['status'],
            'referenceId' => $p['reference_id'] !== null ? (string) $p['reference_id'] : null,
            'paidAt' => iso_date($p['paid_at']),
            'createdAt' => iso_date((string) $p['created_at']),
        ], $payments),
    ];
}

/**
 * Releases reserved stock exactly once per order (idempotent via RETURN logs).
 */
function release_order_stock(int $orderId, string $reason, ?int $adminId = null): void
{
    $already = (int) db_value("SELECT COUNT(*) FROM inventory_logs WHERE order_id = :o AND type = 'RETURN'", ['o' => $orderId]);
    if ($already > 0) {
        return;
    }
    $items = db_all('SELECT product_id, quantity FROM order_items WHERE order_id = :o AND product_id IS NOT NULL', ['o' => $orderId]);
    foreach ($items as $item) {
        db_exec('UPDATE products SET stock = stock + :q WHERE id = :p', ['q' => (int) $item['quantity'], 'p' => (int) $item['product_id']]);
        db_exec(
            'INSERT INTO inventory_logs (product_id, type, quantity, reason, order_id, admin_id, created_at)
             VALUES (:p, \'RETURN\', :q, :r, :o, :a, NOW())',
            ['p' => (int) $item['product_id'], 'q' => (int) $item['quantity'], 'r' => $reason, 'o' => $orderId, 'a' => $adminId]
        );
    }
    nobel_log('info', 'order.stock_released', ['orderId' => $orderId, 'reason' => $reason]);
}

/**
 * Marks an order paid exactly once (idempotent, transition-guarded).
 *
 * @throws ApiException
 */
function mark_order_paid(int $orderId, ?int $adminId = null, ?string $referenceId = null, ?string $cardPan = null, mixed $gatewayResponse = null): array
{
    return db_transaction(static function () use ($orderId, $adminId, $referenceId, $cardPan, $gatewayResponse): array {
        $order = db_one('SELECT * FROM orders WHERE id = :id LIMIT 1', ['id' => $orderId]);
        if ($order === null) {
            throw err_not_found('سفارش یافت نشد');
        }
        if ((string) $order['payment_status'] === 'SUCCESS') {
            return ['already' => true, 'order' => $order];
        }
        if (!in_array((string) $order['status'], ['AWAITING_PAYMENT', 'PENDING', 'REVIEWING', 'APPROVED', 'PROCESSING'], true)) {
            throw err_conflict('وضعیت سفارش اجازه ثبت پرداخت را نمی‌دهد');
        }

        $history = json_decode((string) ($order['status_history'] ?? '[]'), true);
        if (!is_array($history)) {
            $history = [];
        }
        $history[] = ['at' => date('c'), 'to' => 'PAID', 'by' => $adminId !== null ? 'admin' : 'gateway'];

        db_exec(
            "UPDATE orders SET status = 'PAID', payment_status = 'SUCCESS', status_history = :h, updated_at = NOW() WHERE id = :id",
            ['h' => json_encode($history, JSON_UNESCAPED_UNICODE), 'id' => $orderId]
        );
        db_exec(
            "UPDATE payment_transactions
                SET status = 'SUCCESS', reference_id = :ref, card_pan = :pan, gateway_response = :raw,
                    marked_by_id = :admin, paid_at = NOW(), updated_at = NOW()
              WHERE order_id = :o AND status IN ('INITIATED','PENDING')",
            [
                'ref' => $referenceId,
                'pan' => $cardPan,
                'raw' => $gatewayResponse === null ? null : json_encode($gatewayResponse, JSON_UNESCAPED_UNICODE),
                'admin' => $adminId,
                'o' => $orderId,
            ]
        );

        nobel_log('info', 'order.paid', ['orderId' => $orderId, 'number' => $order['order_number']]);
        return ['already' => false, 'order' => $order];
    });
}

function mark_payment_failed(int $orderId, mixed $rawResponse = null): void
{
    db_exec(
        "UPDATE payment_transactions SET status = 'FAILED', gateway_response = :raw, updated_at = NOW()
          WHERE order_id = :o AND status IN ('INITIATED','PENDING')",
        ['raw' => $rawResponse === null ? null : json_encode($rawResponse, JSON_UNESCAPED_UNICODE), 'o' => $orderId]
    );
    db_exec("UPDATE orders SET payment_status = 'FAILED', updated_at = NOW() WHERE id = :o AND payment_status = 'PENDING'", ['o' => $orderId]);
}
