<?php
/**
 * Nobel Kids — cart repository (server-authoritative).
 *
 * The browser may only send: productId, packMode, colorName, sizeLabel, packCount.
 * Prices, discounts, totals and stock limits are ALWAYS recomputed here from
 * the database. Anything the client sends about money or stock is ignored.
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

/** Owner of a cart: either a logged-in user or a guest cookie token. */
function cart_owner_clause(?int $userId, ?string $guestToken): array
{
    if ($userId !== null) {
        return ['user_id = :owner', ['owner' => $userId]];
    }
    return ['guest_token = :owner', ['owner' => (string) $guestToken]];
}

/** Finds the ACTIVE cart id, or null. */
function find_active_cart(?int $userId, ?string $guestToken): ?int
{
    if ($userId === null && ($guestToken === null || $guestToken === '')) {
        return null;
    }
    [$clause, $params] = cart_owner_clause($userId, $guestToken);
    $id = db_value("SELECT id FROM carts WHERE {$clause} AND status = 'ACTIVE' LIMIT 1", $params);
    return $id === null ? null : (int) $id;
}

/**
 * Finds or creates the ACTIVE cart.
 * user_id / guest_token are UNIQUE forever, so a CONVERTED cart is revived
 * instead of inserting a duplicate (same strategy as the previous code).
 */
function get_or_create_cart(?int $userId, ?string $guestToken): int
{
    $existing = find_active_cart($userId, $guestToken);
    if ($existing !== null) {
        return $existing;
    }

    [$clause, $params] = cart_owner_clause($userId, $guestToken);

    // Revive a previously converted/abandoned cart row.
    $old = db_value("SELECT id FROM carts WHERE {$clause} LIMIT 1", $params);
    if ($old !== null) {
        db_exec("UPDATE carts SET status = 'ACTIVE' WHERE id = :id", ['id' => (int) $old]);
        return (int) $old;
    }

    try {
        db_exec(
            'INSERT INTO carts (user_id, guest_token, status, created_at, updated_at) VALUES (:u, :g, \'ACTIVE\', NOW(), NOW())',
            ['u' => $userId, 'g' => $userId === null ? (string) $guestToken : null]
        );
        return db_last_id();
    } catch (PDOException $e) {
        if (db_is_duplicate($e)) {
            $fallback = db_value("SELECT id FROM carts WHERE {$clause} LIMIT 1", $params);
            if ($fallback !== null) {
                db_exec("UPDATE carts SET status = 'ACTIVE' WHERE id = :id", ['id' => (int) $fallback]);
                return (int) $fallback;
            }
        }
        throw $e;
    }
}

/**
 * Loads a product for purchase validation.
 *
 * @return array<string,mixed>
 * @throws ApiException
 */
function assert_purchasable(int $productId, string $colorName, string $sizeLabel, string $packMode): array
{
    $product = db_one(
        'SELECT p.*, c.is_active AS category_active
           FROM products p JOIN categories c ON c.id = p.category_id
          WHERE p.id = :id AND p.status = \'ACTIVE\' AND p.deleted_at IS NULL LIMIT 1',
        ['id' => $productId]
    );
    if ($product === null || (int) $product['category_active'] !== 1) {
        throw err_not_found('این محصول دیگر در دسترس نیست');
    }

    $colorExists = db_value('SELECT COUNT(*) FROM product_colors WHERE product_id = :p AND name = :n', ['p' => $productId, 'n' => $colorName]);
    if ((int) $colorExists === 0) {
        throw err_bad_request('رنگ انتخابی برای این محصول وجود ندارد', 'INVALID_COLOR');
    }

    if ($packMode === 'assorted') {
        // Assorted packs use the fixed virtual label from the original app.
        if ($sizeLabel !== 'جور سایز') {
            throw err_bad_request('ترکیب سایز انتخابی معتبر نیست', 'INVALID_SIZE');
        }
    } elseif ($packMode === 'single') {
        $sizeExists = db_value('SELECT COUNT(*) FROM product_sizes WHERE product_id = :p AND label = :l', ['p' => $productId, 'l' => $sizeLabel]);
        if ((int) $sizeExists === 0) {
            throw err_bad_request('سایز انتخابی برای این محصول وجود ندارد', 'INVALID_SIZE');
        }
    } else {
        throw err_bad_request('نوع پک معتبر نیست', 'INVALID_PACK_MODE');
    }

    return $product;
}

/** @throws ApiException */
function assert_stock(array $product, int $wantedPacks): void
{
    $stock = (int) $product['stock'];
    if ($stock <= 0) {
        throw err_out_of_stock(sprintf('«%s» فعلاً موجود نیست', (string) $product['name']));
    }
    if ($wantedPacks > $stock) {
        throw err_out_of_stock(sprintf('حداکثر %s پک از «%s» موجود است', number_format_fa($stock), (string) $product['name']));
    }
}

/**
 * Adds (or merges) a cart line. Price is computed server-side.
 *
 * @throws ApiException
 */
function cart_add_item(int $cartId, int $productId, string $packMode, string $colorName, string $sizeLabel, int $packCount): void
{
    $product = assert_purchasable($productId, $colorName, $sizeLabel, $packMode);
    assert_valid_pack_quantity($packCount, (int) ($product['min_packs'] ?? 1));

    $existing = db_one(
        'SELECT id, pack_count FROM cart_items WHERE cart_id = :c AND product_id = :p AND color_name = :col AND size_label = :size LIMIT 1',
        ['c' => $cartId, 'p' => $productId, 'col' => $colorName, 'size' => $sizeLabel]
    );

    $target = (int) ($existing['pack_count'] ?? 0) + $packCount;
    assert_stock($product, $target);

    $tiers = product_tiers($productId);
    $unitPrice = wholesale_unit_price((int) $product['price'], $target, $tiers);

    $variantId = db_value(
        'SELECT id FROM product_variants WHERE product_id = :p AND color_name = :col AND size_label = :size LIMIT 1',
        ['p' => $productId, 'col' => $colorName, 'size' => $sizeLabel]
    );
    $colorHex = db_value('SELECT hex FROM product_colors WHERE product_id = :p AND name = :n LIMIT 1', ['p' => $productId, 'n' => $colorName]);

    if ($existing !== null) {
        db_exec(
            'UPDATE cart_items SET pack_count = :q, unit_price = :u, pack_mode = :m, variant_id = :v, updated_at = NOW() WHERE id = :id',
            ['q' => $target, 'u' => $unitPrice, 'm' => $packMode, 'v' => $variantId === null ? null : (int) $variantId, 'id' => (int) $existing['id']]
        );
        return;
    }

    db_exec(
        'INSERT INTO cart_items (cart_id, product_id, variant_id, pack_mode, color_name, color_hex, size_label, pack_count, unit_price, created_at, updated_at)
         VALUES (:c, :p, :v, :m, :col, :hex, :size, :q, :u, NOW(), NOW())',
        [
            'c' => $cartId, 'p' => $productId,
            'v' => $variantId === null ? null : (int) $variantId,
            'm' => $packMode, 'col' => $colorName,
            'hex' => $colorHex === null ? null : (string) $colorHex,
            'size' => $sizeLabel, 'q' => $packCount, 'u' => $unitPrice,
        ]
    );
}

/** @throws ApiException */
function cart_update_item(int $cartId, int $itemId, int $packCount): void
{
    $item = db_one(
        'SELECT ci.*, p.price, p.stock, p.status, p.deleted_at, p.name, p.min_packs
           FROM cart_items ci JOIN products p ON p.id = ci.product_id
          WHERE ci.id = :id AND ci.cart_id = :c LIMIT 1',
        ['id' => $itemId, 'c' => $cartId]
    );
    if ($item === null) {
        throw err_not_found('این آیتم در سبد شما نیست');
    }

    if ($packCount <= 0) {
        db_exec('DELETE FROM cart_items WHERE id = :id', ['id' => $itemId]);
        return;
    }

    if ((string) $item['status'] !== 'ACTIVE' || $item['deleted_at'] !== null) {
        throw err_not_found('این محصول دیگر در دسترس نیست');
    }
    assert_valid_pack_quantity($packCount, (int) ($item['min_packs'] ?? 1));
    assert_stock(['stock' => (int) $item['stock'], 'name' => (string) $item['name']], $packCount);

    $unitPrice = wholesale_unit_price((int) $item['price'], $packCount, product_tiers((int) $item['product_id']));
    db_exec('UPDATE cart_items SET pack_count = :q, unit_price = :u, updated_at = NOW() WHERE id = :id', ['q' => $packCount, 'u' => $unitPrice, 'id' => $itemId]);
}

/** @throws ApiException */
function cart_remove_item(int $cartId, int $itemId): void
{
    $exists = db_value('SELECT COUNT(*) FROM cart_items WHERE id = :id AND cart_id = :c', ['id' => $itemId, 'c' => $cartId]);
    if ((int) $exists === 0) {
        throw err_not_found('این آیتم در سبد شما نیست');
    }
    db_exec('DELETE FROM cart_items WHERE id = :id', ['id' => $itemId]);
}

function cart_clear(int $cartId): void
{
    db_exec('DELETE FROM cart_items WHERE cart_id = :c', ['c' => $cartId]);
}

/**
 * Re-syncs every line with live DB prices and stock caps
 * (prices may change while items sit in the cart).
 */
function cart_recalibrate(int $cartId): void
{
    $items = db_all(
        'SELECT ci.id, ci.product_id, ci.pack_count, ci.unit_price, p.price, p.stock
           FROM cart_items ci JOIN products p ON p.id = ci.product_id
          WHERE ci.cart_id = :c',
        ['c' => $cartId]
    );
    foreach ($items as $item) {
        $stock = (int) $item['stock'];
        $capped = min((int) $item['pack_count'], max($stock, 0));
        if ($capped <= 0) {
            db_exec('DELETE FROM cart_items WHERE id = :id', ['id' => (int) $item['id']]);
            continue;
        }
        $unit = wholesale_unit_price((int) $item['price'], max($capped, 1), product_tiers((int) $item['product_id']));
        if ($capped !== (int) $item['pack_count'] || $unit !== (int) $item['unit_price']) {
            db_exec('UPDATE cart_items SET pack_count = :q, unit_price = :u WHERE id = :id', ['q' => $capped, 'u' => $unit, 'id' => (int) $item['id']]);
        }
    }
}

/**
 * Builds the CartDTO exactly as the React UI expects it.
 *
 * @return array<string,mixed>
 */
function cart_to_dto(?int $cartId): array
{
    if ($cartId === null) {
        return ['id' => null, 'items' => [], 'subtotal' => 0, 'baseTotal' => 0, 'totalPacks' => 0, 'totalPieces' => 0];
    }

    $rows = db_all(
        'SELECT ci.*, p.name, p.short_name, p.slug, p.pack_size, p.stock, p.price, p.status,
                (SELECT i.url FROM product_images i WHERE i.product_id = p.id ORDER BY i.is_primary DESC, i.sort_order ASC, i.id ASC LIMIT 1) AS image
           FROM cart_items ci JOIN products p ON p.id = ci.product_id
          WHERE ci.cart_id = :c ORDER BY ci.created_at ASC, ci.id ASC',
        ['c' => $cartId]
    );

    $items = [];
    $subtotal = 0;
    $baseTotal = 0;
    $totalPacks = 0;
    $totalPieces = 0;

    foreach ($rows as $row) {
        $packCount = (int) $row['pack_count'];
        $packSize = (int) $row['pack_size'];
        $tiers = product_tiers((int) $row['product_id']);
        // Authoritative recomputation — the stored snapshot is only a cache.
        $unitPrice = wholesale_unit_price((int) $row['price'], $packCount, $tiers);

        $subtotal += $unitPrice * $packSize * $packCount;
        $baseTotal += (int) $row['price'] * $packSize * $packCount;
        $totalPacks += $packCount;
        $totalPieces += $packCount * $packSize;

        $items[] = [
            'id' => (string) $row['id'],
            'productId' => (string) $row['product_id'],
            'packMode' => (string) $row['pack_mode'] === 'single' ? 'single' : 'assorted',
            'colorName' => (string) $row['color_name'],
            'colorHex' => $row['color_hex'] !== null ? (string) $row['color_hex'] : null,
            'sizeLabel' => (string) $row['size_label'],
            'packCount' => $packCount,
            'unitPrice' => $unitPrice,
            'product' => [
                'name' => (string) $row['name'],
                'shortName' => $row['short_name'] !== null ? (string) $row['short_name'] : null,
                'slug' => (string) $row['slug'],
                'image' => $row['image'] !== null ? (string) $row['image'] : null,
                'packSize' => $packSize,
                'stock' => (int) $row['stock'],
                'price' => (int) $row['price'],
                'status' => (string) $row['status'],
                'tiers' => $tiers,
            ],
        ];
    }

    return [
        'id' => (string) $cartId,
        'items' => $items,
        'subtotal' => $subtotal,
        'baseTotal' => $baseTotal,
        'totalPacks' => $totalPacks,
        'totalPieces' => $totalPieces,
    ];
}

/** Merges a guest cart into the user's cart after login (idempotent). */
function merge_guest_cart(?string $guestToken, int $userId): void
{
    if ($guestToken === null || $guestToken === '') {
        return;
    }
    $guestCartId = db_value("SELECT id FROM carts WHERE guest_token = :g AND status = 'ACTIVE' LIMIT 1", ['g' => $guestToken]);
    if ($guestCartId === null) {
        return;
    }
    $guestCartId = (int) $guestCartId;

    $lines = db_all('SELECT * FROM cart_items WHERE cart_id = :c', ['c' => $guestCartId]);
    if ($lines === []) {
        db_exec("UPDATE carts SET status = 'ABANDONED' WHERE id = :id", ['id' => $guestCartId]);
        return;
    }

    $userCartId = get_or_create_cart($userId, null);
    foreach ($lines as $line) {
        $existing = db_one(
            'SELECT id, pack_count FROM cart_items WHERE cart_id = :c AND product_id = :p AND color_name = :col AND size_label = :size LIMIT 1',
            ['c' => $userCartId, 'p' => (int) $line['product_id'], 'col' => (string) $line['color_name'], 'size' => (string) $line['size_label']]
        );
        if ($existing !== null) {
            db_exec('UPDATE cart_items SET pack_count = :q WHERE id = :id', [
                'q' => (int) $existing['pack_count'] + (int) $line['pack_count'],
                'id' => (int) $existing['id'],
            ]);
            continue;
        }
        db_exec(
            'INSERT INTO cart_items (cart_id, product_id, variant_id, pack_mode, color_name, color_hex, size_label, pack_count, unit_price, created_at, updated_at)
             VALUES (:c, :p, :v, :m, :col, :hex, :size, :q, :u, NOW(), NOW())',
            [
                'c' => $userCartId, 'p' => (int) $line['product_id'],
                'v' => $line['variant_id'] === null ? null : (int) $line['variant_id'],
                'm' => (string) $line['pack_mode'], 'col' => (string) $line['color_name'],
                'hex' => $line['color_hex'], 'size' => (string) $line['size_label'],
                'q' => (int) $line['pack_count'], 'u' => (int) $line['unit_price'],
            ]
        );
    }

    db_exec("UPDATE carts SET status = 'ABANDONED' WHERE id = :id", ['id' => $guestCartId]);
    cart_recalibrate($userCartId);
}

/** Resolves the current cart for this request (user session or guest cookie). */
function current_cart_id(bool $create = false): ?int
{
    $user = current_user();
    if ($user !== null) {
        return $create ? get_or_create_cart((int) $user['id'], null) : find_active_cart((int) $user['id'], null);
    }
    $token = guest_token($create);
    if ($token === null) {
        return null;
    }
    return $create ? get_or_create_cart(null, $token) : find_active_cart(null, $token);
}
