<?php
/**
 * Nobel Kids — admin repository (dashboard, products, categories, orders,
 * users, coupons, inventory, audit, messages).
 *
 * Mirrors server/services/admin.ts one-for-one, including the order status
 * transition table and the role-escalation guards.
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
require_once __DIR__ . '/catalog.php';
require_once __DIR__ . '/orders.php';
require_once __DIR__ . '/account.php';

/** Statuses counted as realised revenue. */
const ADMIN_PAID_STATUSES = ['PAID', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED'];

/**
 * Allowed order status transitions — identical to server/services/admin.ts.
 * Anything not listed here is rejected server-side, whatever the UI sends.
 *
 * @var array<string,list<string>>
 */
const ORDER_TRANSITIONS = [
    'PENDING'          => ['PAID', 'PROCESSING', 'CANCELLED'],
    'AWAITING_PAYMENT' => ['PAID', 'CANCELLED'],
    'PAID'             => ['PROCESSING', 'PACKED', 'CANCELLED', 'REFUNDED'],
    'PROCESSING'       => ['PACKED', 'CANCELLED'],
    'PACKED'           => ['SHIPPED', 'CANCELLED'],
    'SHIPPED'          => ['DELIVERED'],
    'DELIVERED'        => ['REFUNDED'],
    'CANCELLED'        => [],
    'REFUNDED'         => [],
];

/** @return list<string> */
function allowed_transitions(string $status): array
{
    return ORDER_TRANSITIONS[$status] ?? [];
}

/** Persian/Unicode-aware slugify (matches the TS implementation). */
function slugify(string $input): string
{
    $slug = mb_strtolower(trim($input), 'UTF-8');
    $slug = preg_replace('/[\x{200C}\x{200D}]/u', '-', $slug) ?? $slug;   // ZWNJ / ZWJ
    $slug = preg_replace('/[^\p{L}\p{N}]+/u', '-', $slug) ?? $slug;
    $slug = trim($slug, '-');
    $slug = mb_substr($slug, 0, 200, 'UTF-8');
    return $slug !== '' ? $slug : 'product-' . base_convert((string) time(), 10, 36);
}

// ───────────────────────────────── Dashboard ─────────────────────────────────

/** @return array<string,mixed> */
function admin_dashboard(): array
{
    $paidList = "'" . implode("','", ADMIN_PAID_STATUSES) . "'";

    $salesToday = (int) db_value("SELECT COALESCE(SUM(total),0) FROM orders WHERE status IN ({$paidList}) AND created_at >= CURDATE()");
    $salesMonth = (int) db_value("SELECT COALESCE(SUM(total),0) FROM orders WHERE status IN ({$paidList}) AND created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')");
    $salesTotal = (int) db_value("SELECT COALESCE(SUM(total),0) FROM orders WHERE status IN ({$paidList})");

    $ordersTotal = (int) db_value('SELECT COUNT(*) FROM orders');
    $ordersToday = (int) db_value('SELECT COUNT(*) FROM orders WHERE created_at >= CURDATE()');
    $ordersAwaitingPayment = (int) db_value("SELECT COUNT(*) FROM orders WHERE status = 'AWAITING_PAYMENT'");
    $ordersProcessing = (int) db_value("SELECT COUNT(*) FROM orders WHERE status IN ('PAID','PROCESSING','PACKED')");
    $ordersShipped = (int) db_value("SELECT COUNT(*) FROM orders WHERE status = 'SHIPPED'");

    $usersTotal = (int) db_value("SELECT COUNT(*) FROM users WHERE role = 'CUSTOMER'");
    $productsTotal = (int) db_value('SELECT COUNT(*) FROM products WHERE deleted_at IS NULL');

    $lowStock = db_all(
        "SELECT p.id, p.name, p.sku, p.stock,
                (SELECT i.url FROM product_images i WHERE i.product_id = p.id ORDER BY i.sort_order ASC, i.id ASC LIMIT 1) AS image
           FROM products p
          WHERE p.deleted_at IS NULL AND p.status = 'ACTIVE' AND p.stock <= 6
          ORDER BY p.stock ASC LIMIT 6"
    );

    $topProducts = db_all(
        'SELECT product_id, product_name, SUM(quantity) AS qty, SUM(total) AS revenue
           FROM order_items GROUP BY product_id, product_name ORDER BY qty DESC LIMIT 5'
    );

    $recentOrders = db_all(
        'SELECT o.*, (SELECT COUNT(*) FROM order_items i WHERE i.order_id = o.id) AS item_count
           FROM orders o ORDER BY o.created_at DESC, o.id DESC LIMIT 6'
    );

    $activity = db_all('SELECT id, action, entity, created_at FROM audit_logs ORDER BY created_at DESC, id DESC LIMIT 8');

    // 30-day chart, pre-seeded so every day exists even with no orders.
    $chart = [];
    for ($i = 29; $i >= 0; $i--) {
        $chart[date('Y-m-d', strtotime("-{$i} days"))] = ['sales' => 0, 'orders' => 0];
    }
    $chartRows = db_all(
        "SELECT DATE(created_at) AS day, status, total FROM orders WHERE created_at >= (CURDATE() - INTERVAL 29 DAY)"
    );
    foreach ($chartRows as $row) {
        $key = (string) $row['day'];
        if (!isset($chart[$key])) {
            continue;
        }
        $chart[$key]['orders']++;
        if (in_array((string) $row['status'], ADMIN_PAID_STATUSES, true)) {
            $chart[$key]['sales'] += (int) $row['total'];
        }
    }

    return [
        'salesToday' => $salesToday,
        'salesMonth' => $salesMonth,
        'salesTotal' => $salesTotal,
        'ordersTotal' => $ordersTotal,
        'ordersToday' => $ordersToday,
        'ordersAwaitingPayment' => $ordersAwaitingPayment,
        'ordersProcessing' => $ordersProcessing,
        'ordersShipped' => $ordersShipped,
        'usersTotal' => $usersTotal,
        'productsTotal' => $productsTotal,
        'lowStock' => array_map(static fn (array $p): array => [
            'id' => (string) $p['id'],
            'name' => (string) $p['name'],
            'sku' => (string) $p['sku'],
            'stock' => (int) $p['stock'],
            'image' => $p['image'] ?? null,
        ], $lowStock),
        'topProducts' => array_map(static fn (array $r): array => [
            'id' => $r['product_id'] !== null ? (string) $r['product_id'] : null,
            'name' => (string) $r['product_name'],
            'quantity' => (int) $r['qty'],
            'revenue' => (int) $r['revenue'],
        ], $topProducts),
        'chart' => array_map(
            static fn (string $date, array $v): array => ['date' => $date, 'sales' => $v['sales'], 'orders' => $v['orders']],
            array_keys($chart),
            array_values($chart)
        ),
        'recentOrders' => array_map(
            static fn (array $o): array => map_order_summary($o, (int) $o['item_count']) + ['customerName' => (string) $o['customer_name']],
            $recentOrders
        ),
        'activity' => array_map(static fn (array $a): array => [
            'id' => (string) $a['id'],
            'action' => (string) $a['action'],
            'entity' => (string) $a['entity'],
            'createdAt' => iso_date((string) $a['created_at']),
        ], $activity),
    ];
}

// ───────────────────────────────── Products ──────────────────────────────────

/**
 * @param array<string,mixed> $q
 * @return array<string,mixed>
 */
function admin_list_products(array $q): array
{
    $page = max(1, (int) ($q['page'] ?? 1));
    $pageSize = min(50, max(5, (int) ($q['pageSize'] ?? 12)));

    $where = ['p.deleted_at IS NULL'];
    $params = [];

    if (!empty($q['status']) && in_array((string) $q['status'], ['DRAFT', 'ACTIVE', 'ARCHIVED'], true)) {
        $where[] = 'p.status = :status';
        $params['status'] = (string) $q['status'];
    }
    if (!empty($q['categoryId']) && ctype_digit((string) $q['categoryId'])) {
        $where[] = 'p.category_id = :cid';
        $params['cid'] = (int) $q['categoryId'];
    }
    if (!empty($q['q'])) {
        $where[] = '(p.name LIKE :q OR p.short_name LIKE :q OR p.sku LIKE :q)';
        $params['q'] = like_pattern((string) $q['q']);
    }

    $whereSql = implode(' AND ', $where);
    $total = (int) db_value("SELECT COUNT(*) FROM products p WHERE {$whereSql}", $params);
    $offset = ($page - 1) * $pageSize;

    $rows = db_all(
        product_list_select() . " WHERE {$whereSql} ORDER BY p.created_at DESC, p.id DESC LIMIT {$pageSize} OFFSET {$offset}",
        $params
    );

    return [
        'items' => array_map('map_product_list_item', $rows),
        'total' => $total,
        'page' => $page,
        'pageSize' => $pageSize,
        'totalPages' => max(1, (int) ceil($total / $pageSize)),
    ];
}

/** @return array<string,mixed> */
function admin_get_product(int $id): array
{
    $product = get_product_by_id($id, false);
    if ($product === null) {
        throw err_not_found('محصول یافت نشد');
    }
    return $product;
}

/**
 * Validates an admin product payload (mirrors adminProductSchema).
 *
 * @param array<string,mixed> $input
 * @return array<string,mixed>
 */
function validate_product_input(array $input): array
{
    $name = (string) field_string($input, 'name', true, 200);

    $slug = field_string($input, 'slug', false, 220);
    if ($slug !== null && $slug !== '' && preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $slug) !== 1) {
        throw err_validation('نامک فقط با حروف کوچک لاتین، عدد و خط تیره');
    }

    $categoryId = (string) field_string($input, 'categoryId', true, 40);
    if (!ctype_digit($categoryId)) {
        throw err_validation('دسته‌بندی معتبر نیست');
    }

    $colorsRaw = $input['colors'] ?? [];
    if (!is_array($colorsRaw) || $colorsRaw === []) {
        throw err_validation('حداقل یک رنگ الزامی است');
    }
    if (count($colorsRaw) > 20) {
        throw err_validation('حداکثر ۲۰ رنگ مجاز است');
    }
    $colors = [];
    foreach ($colorsRaw as $color) {
        if (!is_array($color)) {
            throw err_validation('فهرست رنگ‌ها معتبر نیست');
        }
        $cname = (string) field_string($color, 'name', true, 60);
        $hex = field_string($color, 'hex', false, 10);
        if ($hex !== null && $hex !== '' && preg_match('/^#[0-9a-fA-F]{3,8}$/', $hex) !== 1) {
            throw err_validation('کد رنگ معتبر نیست');
        }
        $colors[] = ['name' => $cname, 'hex' => ($hex === '' ? null : $hex)];
    }

    $sizesRaw = $input['sizes'] ?? [];
    if (!is_array($sizesRaw) || $sizesRaw === []) {
        throw err_validation('حداقل یک سایز الزامی است');
    }
    if (count($sizesRaw) > 20) {
        throw err_validation('حداکثر ۲۰ سایز مجاز است');
    }
    $sizes = [];
    foreach ($sizesRaw as $size) {
        $label = trim((string) $size);
        if ($label === '' || mb_strlen($label) > 40) {
            throw err_validation('عنوان سایز معتبر نیست');
        }
        $sizes[] = $label;
    }

    $tiers = [];
    if (!empty($input['tiers']) && is_array($input['tiers'])) {
        if (count($input['tiers']) > 10) {
            throw err_validation('حداکثر ۱۰ پله تخفیف مجاز است');
        }
        foreach ($input['tiers'] as $tier) {
            if (!is_array($tier)) {
                throw err_validation('پله‌های تخفیف معتبر نیستند');
            }
            $tiers[] = [
                'minPacks' => (int) field_int($tier, 'minPacks', true, 1, 10000),
                'discountBps' => (int) field_int($tier, 'discountBps', true, 0, 9000),
            ];
        }
    }

    $images = null;
    if (isset($input['images']) && is_array($input['images'])) {
        if (count($input['images']) > 10) {
            throw err_validation('حداکثر ۱۰ تصویر مجاز است');
        }
        $images = [];
        foreach ($input['images'] as $index => $image) {
            if (!is_array($image)) {
                throw err_validation('فهرست تصاویر معتبر نیست');
            }
            $url = (string) field_string($image, 'url', true, 500);
            // Only same-origin relative paths — blocks javascript:/data: injection.
            if (preg_match('#^/[A-Za-z0-9._\-/%]+$#', $url) !== 1) {
                throw err_validation('نشانی تصویر باید یک مسیر داخلی معتبر باشد');
            }
            $images[] = [
                'url' => $url,
                'alt' => field_string($image, 'alt', false, 200) ?? $name,
                'isPrimary' => (bool) field_bool($image, 'isPrimary', false, $index === 0),
            ];
        }
    }

    $tags = [];
    if (!empty($input['tags']) && is_array($input['tags'])) {
        foreach (array_slice($input['tags'], 0, 20) as $tag) {
            $tag = trim((string) $tag);
            if ($tag !== '' && mb_strlen($tag) <= 40) {
                $tags[] = $tag;
            }
        }
    }

    return [
        'name' => $name,
        'slug' => ($slug === '' ? null : $slug),
        'shortName' => field_string($input, 'shortName', false, 150),
        'description' => field_string($input, 'description', false, 5000),
        'shortDescription' => field_string($input, 'shortDescription', false, 500),
        'sku' => field_string($input, 'sku', false, 80),
        'categoryId' => (int) $categoryId,
        'price' => (int) field_int($input, 'price', true, 1000, 1000000000),
        'comparePrice' => isset($input['comparePrice']) && $input['comparePrice'] !== null && $input['comparePrice'] !== ''
            ? (int) field_int($input, 'comparePrice', true, 0, 1000000000) : null,
        'stock' => (int) field_int($input, 'stock', true, 0, 1000000),
        'packSize' => isset($input['packSize']) ? (int) field_int($input, 'packSize', true, 1, 100) : null,
        'status' => (string) field_enum($input, 'status', ['DRAFT', 'ACTIVE', 'ARCHIVED']),
        'featured' => (bool) field_bool($input, 'featured', false, false),
        'isNew' => (bool) field_bool($input, 'isNew', false, false),
        'isBestSeller' => (bool) field_bool($input, 'isBestSeller', false, false),
        'gender' => field_string($input, 'gender', false, 40),
        'material' => field_string($input, 'material', false, 120),
        'collection' => field_string($input, 'collection', false, 120),
        'seoTitle' => field_string($input, 'seoTitle', false, 220),
        'seoDescription' => field_string($input, 'seoDescription', false, 500),
        'tags' => $tags,
        'colors' => $colors,
        'sizes' => $sizes,
        'tiers' => $tiers,
        'images' => $images,
    ];
}

/** Rebuilds colours, sizes and the materialised colour×size variant matrix. */
function sync_product_children(int $productId, string $sku, array $input): void
{
    db_exec('DELETE FROM product_colors WHERE product_id = :p', ['p' => $productId]);
    db_exec('DELETE FROM product_sizes WHERE product_id = :p', ['p' => $productId]);
    db_exec('DELETE FROM product_variants WHERE product_id = :p', ['p' => $productId]);

    foreach ($input['colors'] as $index => $color) {
        db_exec(
            'INSERT INTO product_colors (product_id, name, hex, sort_order) VALUES (:p, :n, :h, :s)',
            ['p' => $productId, 'n' => $color['name'], 'h' => $color['hex'], 's' => $index]
        );
    }
    foreach ($input['sizes'] as $index => $label) {
        db_exec(
            'INSERT INTO product_sizes (product_id, label, sort_order) VALUES (:p, :l, :s)',
            ['p' => $productId, 'l' => $label, 's' => $index]
        );
    }
    foreach ($input['colors'] as $color) {
        foreach ($input['sizes'] as $label) {
            db_exec(
                'INSERT INTO product_variants (product_id, color_name, size_label, sku) VALUES (:p, :c, :s, :sku)',
                ['p' => $productId, 'c' => $color['name'], 's' => $label, 'sku' => $sku . '::' . $color['name'] . '::' . $label]
            );
        }
    }
}

function replace_product_tiers(int $productId, array $tiers): void
{
    db_exec('DELETE FROM price_tiers WHERE product_id = :p', ['p' => $productId]);
    foreach ($tiers as $tier) {
        db_exec(
            'INSERT INTO price_tiers (product_id, min_packs, discount_bps) VALUES (:p, :m, :d)',
            ['p' => $productId, 'm' => $tier['minPacks'], 'd' => $tier['discountBps']]
        );
    }
}

function replace_product_images(int $productId, ?array $images, string $fallbackAlt): void
{
    if ($images === null) {
        return;
    }
    db_exec('DELETE FROM product_images WHERE product_id = :p', ['p' => $productId]);
    foreach ($images as $index => $image) {
        db_exec(
            'INSERT INTO product_images (product_id, url, alt, sort_order, is_primary) VALUES (:p, :u, :a, :s, :pr)',
            [
                'p' => $productId,
                'u' => $image['url'],
                'a' => $image['alt'] ?: $fallbackAlt,
                's' => $index,
                'pr' => $image['isPrimary'] ? 1 : 0,
            ]
        );
    }
}

/** @return array<string,mixed> */
function admin_create_product(array $input): array
{
    $slug = $input['slug'] ?: slugify($input['name']);
    if (db_one('SELECT id FROM products WHERE slug = :s', ['s' => $slug]) !== null) {
        throw err_conflict('نامک (slug) تکراری است');
    }
    $sku = $input['sku'] !== null && trim($input['sku']) !== '' ? trim($input['sku']) : 'NBL-' . $slug;
    if (db_one('SELECT id FROM products WHERE sku = :s', ['s' => $sku]) !== null) {
        throw err_conflict('SKU تکراری است');
    }
    if (db_one('SELECT id FROM categories WHERE id = :id', ['id' => $input['categoryId']]) === null) {
        throw err_validation('دسته‌بندی انتخابی وجود ندارد');
    }

    $productId = db_transaction(static function () use ($input, $slug, $sku): int {
        db_exec(
            'INSERT INTO products (name, slug, short_name, description, short_description, sku, category_id,
                                   price, compare_price, stock, pack_size, min_packs, status, featured, is_new,
                                   is_best_seller, gender, material, collection, seo_title, seo_description,
                                   tags, created_at, updated_at)
             VALUES (:name, :slug, :shortname, :descr, :shortdescr, :sku, :cat, :price, :compare, :stock,
                     :packsize, 1, :status, :featured, :isnew, :best, :gender, :material, :collection,
                     :seotitle, :seodescr, :tags, NOW(), NOW())',
            [
                'name' => $input['name'], 'slug' => $slug, 'shortname' => $input['shortName'],
                'descr' => $input['description'], 'shortdescr' => $input['shortDescription'], 'sku' => $sku,
                'cat' => $input['categoryId'], 'price' => $input['price'], 'compare' => $input['comparePrice'],
                'stock' => $input['stock'], 'packsize' => $input['packSize'] ?? PACK_SIZE,
                'status' => $input['status'], 'featured' => $input['featured'] ? 1 : 0,
                'isnew' => $input['isNew'] ? 1 : 0, 'best' => $input['isBestSeller'] ? 1 : 0,
                'gender' => $input['gender'], 'material' => $input['material'], 'collection' => $input['collection'],
                'seotitle' => $input['seoTitle'] ?: $input['name'],
                'seodescr' => $input['seoDescription'] ?: $input['shortDescription'],
                'tags' => json_encode($input['tags'], JSON_UNESCAPED_UNICODE),
            ]
        );
        $id = db_last_id();
        sync_product_children($id, $sku, $input);
        replace_product_tiers($id, $input['tiers']);
        replace_product_images($id, $input['images'], $input['name']);

        if ($input['stock'] > 0) {
            db_exec(
                'INSERT INTO inventory_logs (product_id, type, quantity, reason, created_at)
                 VALUES (:p, \'RESTOCK\', :q, \'initial-stock\', NOW())',
                ['p' => $id, 'q' => $input['stock']]
            );
        }
        return $id;
    });

    return admin_get_product($productId);
}

/** @return array<string,mixed> */
function admin_update_product(int $id, array $input): array
{
    $existing = db_one('SELECT * FROM products WHERE id = :id AND deleted_at IS NULL', ['id' => $id]);
    if ($existing === null) {
        throw err_not_found('محصول یافت نشد');
    }

    $slug = $input['slug'] ?: (string) $existing['slug'];
    if ($slug !== (string) $existing['slug'] && db_one('SELECT id FROM products WHERE slug = :s AND id <> :id', ['s' => $slug, 'id' => $id]) !== null) {
        throw err_conflict('نامک (slug) تکراری است');
    }
    $sku = $input['sku'] !== null && trim($input['sku']) !== '' ? trim($input['sku']) : (string) $existing['sku'];
    if ($sku !== (string) $existing['sku'] && db_one('SELECT id FROM products WHERE sku = :s AND id <> :id', ['s' => $sku, 'id' => $id]) !== null) {
        throw err_conflict('SKU تکراری است');
    }
    if (db_one('SELECT id FROM categories WHERE id = :id', ['id' => $input['categoryId']]) === null) {
        throw err_validation('دسته‌بندی انتخابی وجود ندارد');
    }

    db_transaction(static function () use ($id, $input, $slug, $sku, $existing): void {
        db_exec(
            'UPDATE products SET name = :name, slug = :slug, short_name = :shortname, description = :descr,
                    short_description = :shortdescr, sku = :sku, category_id = :cat, price = :price,
                    compare_price = :compare, stock = :stock, pack_size = :packsize, status = :status,
                    featured = :featured, is_new = :isnew, is_best_seller = :best, gender = :gender,
                    material = :material, collection = :collection, seo_title = :seotitle,
                    seo_description = :seodescr, tags = :tags, updated_at = NOW()
              WHERE id = :id',
            [
                'name' => $input['name'], 'slug' => $slug, 'shortname' => $input['shortName'],
                'descr' => $input['description'], 'shortdescr' => $input['shortDescription'], 'sku' => $sku,
                'cat' => $input['categoryId'], 'price' => $input['price'], 'compare' => $input['comparePrice'],
                'stock' => $input['stock'], 'packsize' => $input['packSize'] ?? (int) $existing['pack_size'],
                'status' => $input['status'], 'featured' => $input['featured'] ? 1 : 0,
                'isnew' => $input['isNew'] ? 1 : 0, 'best' => $input['isBestSeller'] ? 1 : 0,
                'gender' => $input['gender'], 'material' => $input['material'], 'collection' => $input['collection'],
                'seotitle' => $input['seoTitle'] ?: $input['name'], 'seodescr' => $input['seoDescription'],
                'tags' => json_encode($input['tags'], JSON_UNESCAPED_UNICODE),
                'id' => $id,
            ]
        );
        sync_product_children($id, $sku, $input);
        replace_product_tiers($id, $input['tiers']);
        replace_product_images($id, $input['images'], $input['name']);

        // Record manual stock corrections made through the product form.
        $delta = $input['stock'] - (int) $existing['stock'];
        if ($delta !== 0) {
            db_exec(
                'INSERT INTO inventory_logs (product_id, type, quantity, reason, created_at)
                 VALUES (:p, :t, :q, \'product-form-edit\', NOW())',
                ['p' => $id, 't' => $delta > 0 ? 'RESTOCK' : 'ADJUSTMENT', 'q' => $delta]
            );
        }
    });

    return admin_get_product($id);
}

function admin_soft_delete_product(int $id): void
{
    $product = db_one('SELECT id FROM products WHERE id = :id AND deleted_at IS NULL', ['id' => $id]);
    if ($product === null) {
        throw err_not_found('محصول یافت نشد');
    }
    db_exec("UPDATE products SET deleted_at = NOW(), status = 'ARCHIVED', updated_at = NOW() WHERE id = :id", ['id' => $id]);
}

/** @return array<string,mixed> */
function admin_duplicate_product(int $id): array
{
    $source = db_one('SELECT * FROM products WHERE id = :id AND deleted_at IS NULL', ['id' => $id]);
    if ($source === null) {
        throw err_not_found('محصول یافت نشد');
    }

    $newId = db_transaction(static function () use ($source, $id): int {
        $slug = '';
        for ($attempt = 0; $attempt < 8; $attempt++) {
            $candidate = $source['slug'] . '-copy-' . substr(bin2hex(random_bytes(4)), 0, 4);
            if (db_one('SELECT id FROM products WHERE slug = :s', ['s' => $candidate]) === null) {
                $slug = $candidate;
                break;
            }
        }
        if ($slug === '') {
            throw new ApiException('DUPLICATE_FAILED', 'کپی محصول ممکن نشد', 500);
        }

        db_exec(
            'INSERT INTO products (name, slug, sku, short_name, description, short_description, category_id,
                                   price, compare_price, stock, pack_size, min_packs, status, gender, material,
                                   collection, seo_title, seo_description, tags, created_at, updated_at)
             VALUES (:name, :slug, :sku, :shortname, :descr, :shortdescr, :cat, :price, :compare, 0, :packsize,
                     :minpacks, \'DRAFT\', :gender, :material, :collection, :seotitle, :seodescr, :tags, NOW(), NOW())',
            [
                'name' => $source['name'] . ' (کپی)', 'slug' => $slug, 'sku' => 'NBL-' . $slug,
                'shortname' => $source['short_name'], 'descr' => $source['description'],
                'shortdescr' => $source['short_description'], 'cat' => (int) $source['category_id'],
                'price' => (int) $source['price'],
                'compare' => $source['compare_price'] !== null ? (int) $source['compare_price'] : null,
                'packsize' => (int) $source['pack_size'], 'minpacks' => (int) $source['min_packs'],
                'gender' => $source['gender'], 'material' => $source['material'], 'collection' => $source['collection'],
                'seotitle' => $source['seo_title'], 'seodescr' => $source['seo_description'], 'tags' => $source['tags'],
            ]
        );
        $copyId = db_last_id();

        $colors = db_all('SELECT name, hex FROM product_colors WHERE product_id = :p ORDER BY sort_order ASC', ['p' => $id]);
        $sizes = db_all('SELECT label FROM product_sizes WHERE product_id = :p ORDER BY sort_order ASC', ['p' => $id]);

        sync_product_children($copyId, 'NBL-' . $slug, [
            'colors' => array_map(static fn (array $c): array => ['name' => (string) $c['name'], 'hex' => $c['hex']], $colors),
            'sizes' => array_map(static fn (array $s): string => (string) $s['label'], $sizes),
        ]);

        foreach (db_all('SELECT min_packs, discount_bps FROM price_tiers WHERE product_id = :p', ['p' => $id]) as $tier) {
            db_exec(
                'INSERT INTO price_tiers (product_id, min_packs, discount_bps) VALUES (:p, :m, :d)',
                ['p' => $copyId, 'm' => (int) $tier['min_packs'], 'd' => (int) $tier['discount_bps']]
            );
        }
        foreach (db_all('SELECT url, alt, sort_order, is_primary FROM product_images WHERE product_id = :p ORDER BY sort_order ASC', ['p' => $id]) as $image) {
            db_exec(
                'INSERT INTO product_images (product_id, url, alt, sort_order, is_primary) VALUES (:p, :u, :a, :s, :pr)',
                ['p' => $copyId, 'u' => $image['url'], 'a' => $image['alt'], 's' => (int) $image['sort_order'], 'pr' => (int) $image['is_primary']]
            );
        }
        return $copyId;
    });

    return admin_get_product($newId);
}

// ───────────────────────────────── Inventory ─────────────────────────────────

/** @return array{stock:int} */
function admin_adjust_stock(int $productId, int $adminId, int $quantity, ?string $reason): array
{
    if ($quantity === 0) {
        throw err_validation('مقدار تغییر نمی‌تواند صفر باشد');
    }

    return db_transaction(static function () use ($productId, $adminId, $quantity, $reason): array {
        $product = db_one('SELECT stock FROM products WHERE id = :id AND deleted_at IS NULL FOR UPDATE', ['id' => $productId]);
        if ($product === null) {
            throw err_not_found('محصول یافت نشد');
        }
        if ((int) $product['stock'] + $quantity < 0) {
            throw err_conflict('موجودی نمی‌تواند منفی شود');
        }
        db_exec('UPDATE products SET stock = stock + :q, updated_at = NOW() WHERE id = :id', ['q' => $quantity, 'id' => $productId]);
        db_exec(
            'INSERT INTO inventory_logs (product_id, type, quantity, reason, admin_id, created_at)
             VALUES (:p, :t, :q, :r, :a, NOW())',
            [
                'p' => $productId,
                't' => $quantity > 0 ? 'RESTOCK' : 'ADJUSTMENT',
                'q' => $quantity,
                'r' => $reason ?: 'manual-adjustment',
                'a' => $adminId,
            ]
        );
        return ['stock' => (int) db_value('SELECT stock FROM products WHERE id = :id', ['id' => $productId])];
    });
}

/** @return array<string,mixed> */
function admin_inventory_logs(int $productId, int $page = 1): array
{
    $pageSize = 20;
    $page = max(1, $page);
    $total = (int) db_value('SELECT COUNT(*) FROM inventory_logs WHERE product_id = :p', ['p' => $productId]);
    $offset = ($page - 1) * $pageSize;
    $rows = db_all(
        "SELECT l.*, u.name AS admin_name, u.mobile AS admin_mobile, o.order_number
           FROM inventory_logs l
           LEFT JOIN users u ON u.id = l.admin_id
           LEFT JOIN orders o ON o.id = l.order_id
          WHERE l.product_id = :p
          ORDER BY l.created_at DESC, l.id DESC LIMIT {$pageSize} OFFSET {$offset}",
        ['p' => $productId]
    );

    return [
        'items' => array_map(static fn (array $r): array => [
            'id' => (string) $r['id'],
            'type' => (string) $r['type'],
            'quantity' => (int) $r['quantity'],
            'reason' => $r['reason'],
            'createdAt' => iso_date((string) $r['created_at']),
            'admin' => $r['admin_name'] !== null || $r['admin_mobile'] !== null
                ? ['name' => $r['admin_name'], 'mobile' => $r['admin_mobile']] : null,
            'order' => $r['order_number'] !== null ? ['orderNumber' => (string) $r['order_number']] : null,
        ], $rows),
        'total' => $total,
        'page' => $page,
        'pageSize' => $pageSize,
        'totalPages' => max(1, (int) ceil($total / $pageSize)),
    ];
}

// ───────────────────────────────── Categories ────────────────────────────────

/**
 * @param array<string,mixed> $input
 * @return array<string,mixed>
 */
function validate_category_input(array $input): array
{
    $slug = field_string($input, 'slug', false, 120);
    if ($slug !== null && $slug !== '' && preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $slug) !== 1) {
        throw err_validation('نامک دسته‌بندی معتبر نیست');
    }
    $image = field_string($input, 'image', false, 500);
    if ($image !== null && $image !== '' && preg_match('#^/[A-Za-z0-9._\-/%]+$#', $image) !== 1) {
        throw err_validation('نشانی تصویر دسته‌بندی باید یک مسیر داخلی معتبر باشد');
    }
    return [
        'name' => (string) field_string($input, 'name', true, 100),
        'slug' => ($slug === '' ? null : $slug),
        'description' => field_string($input, 'description', false, 500),
        'image' => ($image === '' ? null : $image),
        'isActive' => (bool) field_bool($input, 'isActive', false, true),
        'sortOrder' => isset($input['sortOrder']) ? (int) field_int($input, 'sortOrder', true, 0, 10000) : 0,
    ];
}

/** @return array<string,mixed> */
function admin_create_category(array $input): array
{
    $slug = $input['slug'] ?: slugify($input['name']);
    $clash = db_one('SELECT id FROM categories WHERE slug = :s OR name = :n LIMIT 1', ['s' => $slug, 'n' => $input['name']]);
    if ($clash !== null) {
        throw err_conflict('دسته‌بندی با این نام یا نامک وجود دارد');
    }
    db_exec(
        'INSERT INTO categories (name, slug, description, image, is_active, sort_order, created_at, updated_at)
         VALUES (:n, :s, :d, :i, :a, :o, NOW(), NOW())',
        [
            'n' => $input['name'], 's' => $slug, 'd' => $input['description'], 'i' => $input['image'],
            'a' => $input['isActive'] ? 1 : 0, 'o' => $input['sortOrder'],
        ]
    );
    return admin_get_category(db_last_id());
}

/** @return array<string,mixed> */
function admin_get_category(int $id): array
{
    $row = db_one('SELECT * FROM categories WHERE id = :id', ['id' => $id]);
    if ($row === null) {
        throw err_not_found('دسته‌بندی یافت نشد');
    }
    return [
        'id' => (string) $row['id'],
        'name' => (string) $row['name'],
        'slug' => (string) $row['slug'],
        'description' => $row['description'],
        'image' => $row['image'],
        'isActive' => (bool) $row['is_active'],
        'sortOrder' => (int) $row['sort_order'],
    ];
}

/** @return array<string,mixed> */
function admin_update_category(int $id, array $input): array
{
    $existing = db_one('SELECT * FROM categories WHERE id = :id', ['id' => $id]);
    if ($existing === null) {
        throw err_not_found('دسته‌بندی یافت نشد');
    }
    $slug = $input['slug'] ?: (string) $existing['slug'];
    if ($input['name'] !== (string) $existing['name'] || $slug !== (string) $existing['slug']) {
        $clash = db_one(
            'SELECT id FROM categories WHERE id <> :id AND (slug = :s OR name = :n) LIMIT 1',
            ['id' => $id, 's' => $slug, 'n' => $input['name']]
        );
        if ($clash !== null) {
            throw err_conflict('دسته‌بندی با این نام یا نامک وجود دارد');
        }
    }
    db_exec(
        'UPDATE categories SET name = :n, slug = :s, description = :d, image = :i, is_active = :a,
                sort_order = :o, updated_at = NOW() WHERE id = :id',
        [
            'n' => $input['name'], 's' => $slug, 'd' => $input['description'], 'i' => $input['image'],
            'a' => $input['isActive'] ? 1 : 0, 'o' => $input['sortOrder'], 'id' => $id,
        ]
    );
    return admin_get_category($id);
}

function admin_delete_category(int $id): void
{
    $count = (int) db_value('SELECT COUNT(*) FROM products WHERE category_id = :id AND deleted_at IS NULL', ['id' => $id]);
    if ($count > 0) {
        throw err_conflict(sprintf('این دسته‌بندی %s محصول دارد؛ ابتدا محصولات را منتقل کنید', number_format_fa($count)));
    }
    if (db_one('SELECT id FROM categories WHERE id = :id', ['id' => $id]) === null) {
        throw err_not_found('دسته‌بندی یافت نشد');
    }
    db_exec('DELETE FROM categories WHERE id = :id', ['id' => $id]);
}

// ─────────────────────────────────── Orders ──────────────────────────────────

/**
 * @param array<string,mixed> $q
 * @return array<string,mixed>
 */
function admin_list_orders(array $q): array
{
    $page = max(1, (int) ($q['page'] ?? 1));
    $pageSize = min(50, max(5, (int) ($q['pageSize'] ?? 12)));

    $where = ['1 = 1'];
    $params = [];

    if (!empty($q['status']) && in_array((string) $q['status'], ORDER_ALL_STATUSES, true)) {
        $where[] = 'o.status = :status';
        $params['status'] = (string) $q['status'];
    }
    if (!empty($q['paymentStatus']) && in_array((string) $q['paymentStatus'], ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'], true)) {
        $where[] = 'o.payment_status = :pstatus';
        $params['pstatus'] = (string) $q['paymentStatus'];
    }
    if (!empty($q['from'])) {
        $where[] = 'o.created_at >= :from';
        $params['from'] = (string) $q['from'];
    }
    if (!empty($q['to'])) {
        $where[] = 'o.created_at <= :to';
        $params['to'] = (string) $q['to'];
    }
    if (!empty($q['minAmount'])) {
        $where[] = 'o.total >= :minAmount';
        $params['minAmount'] = (int) $q['minAmount'];
    }
    if (!empty($q['maxAmount'])) {
        $where[] = 'o.total <= :maxAmount';
        $params['maxAmount'] = (int) $q['maxAmount'];
    }
    if (!empty($q['q'])) {
        $where[] = '(o.order_number LIKE :q OR o.quotation_number LIKE :q OR o.customer_name LIKE :q OR o.customer_mobile LIKE :q)';
        $params['q'] = like_pattern((string) $q['q']);
    }

    $whereSql = implode(' AND ', $where);
    $total = (int) db_value("SELECT COUNT(*) FROM orders o WHERE {$whereSql}", $params);
    $offset = ($page - 1) * $pageSize;

    $rows = db_all(
        "SELECT o.*, u.name AS user_name,
                (SELECT COUNT(*) FROM order_items i WHERE i.order_id = o.id) AS item_count
           FROM orders o LEFT JOIN users u ON u.id = o.user_id
          WHERE {$whereSql} ORDER BY o.created_at DESC, o.id DESC LIMIT {$pageSize} OFFSET {$offset}",
        $params
    );

    return [
        'items' => array_map(static fn (array $o): array => map_order_summary($o, (int) $o['item_count']) + [
            'customerName' => (string) $o['customer_name'],
            'customerMobile' => (string) $o['customer_mobile'],
            'userName' => $o['user_name'],
        ], $rows),
        'total' => $total,
        'page' => $page,
        'pageSize' => $pageSize,
        'totalPages' => max(1, (int) ceil($total / $pageSize)),
    ];
}

/** @return array<string,mixed> */
function admin_get_order(string $idOrNumber): array
{
    $row = db_one(
        'SELECT * FROM orders WHERE id = :id OR order_number = :num OR quotation_number = :num LIMIT 1',
        ['id' => ctype_digit($idOrNumber) ? (int) $idOrNumber : 0, 'num' => $idOrNumber]
    );
    if ($row === null) {
        throw err_not_found('سفارش یافت نشد');
    }

    $history = json_decode((string) ($row['status_history'] ?? '[]'), true);

    return map_order_detail($row) + [
        'statusHistory' => is_array($history) ? $history : [],
        'allowedNext' => allowed_transitions((string) $row['status']),
    ];
}

/**
 * Applies an admin order update with transition validation and stock release.
 *
 * @param array<string,mixed> $update
 * @return array<string,mixed> changed fields
 */
function admin_update_order(int $orderId, int $adminId, array $update): array
{
    $marksPaid = ($update['paymentStatus'] ?? null) === 'SUCCESS' || ($update['status'] ?? null) === 'PAID';

    // Route "mark as paid" through the idempotent payment path first.
    if ($marksPaid) {
        $order = db_one('SELECT payment_method FROM orders WHERE id = :id', ['id' => $orderId]);
        if ($order === null) {
            throw err_not_found('سفارش یافت نشد');
        }
        if ((string) $order['payment_method'] !== 'MANUAL') {
            throw err_conflict('وضعیت پرداخت سفارش‌های آنلاین فقط از طریق درگاه تغییر می‌کند');
        }
        mark_order_paid($orderId, $adminId, null, null, ['confirmedBy' => 'admin']);
    }

    return db_transaction(static function () use ($orderId, $adminId, $update, $marksPaid): array {
        $order = db_one('SELECT * FROM orders WHERE id = :id FOR UPDATE', ['id' => $orderId]);
        if ($order === null) {
            throw err_not_found('سفارش یافت نشد');
        }

        $changed = [];
        $sets = [];
        $params = ['id' => $orderId];

        if (!empty($update['status']) && (string) $update['status'] !== (string) $order['status']) {
            $to = (string) $update['status'];
            if (!in_array($to, allowed_transitions((string) $order['status']), true)) {
                throw err_conflict(sprintf('تغییر وضعیت از %s به %s مجاز نیست', (string) $order['status'], $to));
            }
            $changed['status'] = ['from' => (string) $order['status'], 'to' => $to];

            $history = json_decode((string) ($order['status_history'] ?? '[]'), true);
            if (!is_array($history)) {
                $history = [];
            }
            $history[] = ['at' => date('c'), 'from' => (string) $order['status'], 'to' => $to, 'by' => 'admin'];

            $sets[] = 'status = :status';
            $sets[] = 'status_history = :history';
            $params['status'] = $to;
            $params['history'] = json_encode($history, JSON_UNESCAPED_UNICODE);
        }

        if (!empty($update['paymentStatus']) && (string) $update['paymentStatus'] !== (string) $order['payment_status'] && !$marksPaid) {
            if ((string) $order['payment_method'] !== 'MANUAL') {
                throw err_conflict('وضعیت پرداخت سفارش‌های آنلاین فقط از طریق درگاه تغییر می‌کند');
            }
            $changed['paymentStatus'] = ['from' => (string) $order['payment_status'], 'to' => (string) $update['paymentStatus']];
            $sets[] = 'payment_status = :pstatus';
            $params['pstatus'] = (string) $update['paymentStatus'];
        }

        if (!empty($update['shippingStatus']) && (string) $update['shippingStatus'] !== (string) $order['shipping_status']) {
            $changed['shippingStatus'] = ['from' => (string) $order['shipping_status'], 'to' => (string) $update['shippingStatus']];
            $sets[] = 'shipping_status = :sstatus';
            $params['sstatus'] = (string) $update['shippingStatus'];
        }

        if (array_key_exists('trackingCode', $update)) {
            $sets[] = 'tracking_code = :tracking';
            $params['tracking'] = $update['trackingCode'];
        }
        if (array_key_exists('internalNote', $update)) {
            $sets[] = 'internal_note = :note';
            $params['note'] = $update['internalNote'];
        }

        if ($sets !== []) {
            $sets[] = 'updated_at = NOW()';
            db_exec('UPDATE orders SET ' . implode(', ', $sets) . ' WHERE id = :id', $params);
        }

        // Cancel / reject / refund puts the reserved packs back on the shelf.
        if (isset($changed['status']) && in_array($changed['status']['to'], ORDER_RELEASING_STATUSES, true)) {
            release_order_stock($orderId, strtolower($changed['status']['to']), $adminId);
        }

        return $changed;
    });
}

// ──────────────────────────────────── Users ──────────────────────────────────

/**
 * @param array<string,mixed> $q
 * @return array<string,mixed>
 */
function admin_list_users(array $q): array
{
    $page = max(1, (int) ($q['page'] ?? 1));
    $pageSize = min(50, max(5, (int) ($q['pageSize'] ?? 12)));

    $where = ['1 = 1'];
    $params = [];
    if (!empty($q['q'])) {
        $where[] = '(u.name LIKE :q OR u.mobile LIKE :q OR u.business_name LIKE :q)';
        $params['q'] = like_pattern((string) $q['q']);
    }
    $whereSql = implode(' AND ', $where);

    $total = (int) db_value("SELECT COUNT(*) FROM users u WHERE {$whereSql}", $params);
    $offset = ($page - 1) * $pageSize;

    $rows = db_all(
        "SELECT u.*, (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS orders_count
           FROM users u WHERE {$whereSql} ORDER BY u.created_at DESC, u.id DESC LIMIT {$pageSize} OFFSET {$offset}",
        $params
    );

    return [
        'items' => array_map('map_admin_user', $rows),
        'total' => $total,
        'page' => $page,
        'pageSize' => $pageSize,
        'totalPages' => max(1, (int) ceil($total / $pageSize)),
    ];
}

/** @return array<string,mixed> */
function map_admin_user(array $row): array
{
    return [
        'id' => (string) $row['id'],
        'mobile' => (string) $row['mobile'],
        'name' => $row['name'],
        'businessName' => $row['business_name'],
        'email' => $row['email'],
        'role' => (string) $row['role'],
        'status' => (string) $row['status'],
        'createdAt' => iso_date((string) $row['created_at']),
        'lastLoginAt' => iso_date($row['last_login_at']),
        '_count' => ['orders' => (int) ($row['orders_count'] ?? 0)],
    ];
}

/** @return array<string,mixed> */
function admin_get_user(int $id): array
{
    $row = db_one(
        'SELECT u.*, (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS orders_count,
                (SELECT COUNT(*) FROM wishlist_items w WHERE w.user_id = u.id) AS wishlist_count
           FROM users u WHERE u.id = :id',
        ['id' => $id]
    );
    if ($row === null) {
        throw err_not_found('کاربر یافت نشد');
    }

    $orders = db_all(
        'SELECT o.*, (SELECT COUNT(*) FROM order_items i WHERE i.order_id = o.id) AS item_count
           FROM orders o WHERE o.user_id = :u ORDER BY o.created_at DESC LIMIT 10',
        ['u' => $id]
    );

    return map_admin_user($row) + [
        'addresses' => list_addresses($id),
        'orders' => array_map(static fn (array $o): array => map_order_summary($o, (int) $o['item_count']), $orders),
        '_count' => ['orders' => (int) $row['orders_count'], 'wishlist' => (int) $row['wishlist_count']],
    ];
}

/**
 * Role/status changes with privilege-escalation guards.
 *
 * @param array<string,mixed> $actor  the acting admin
 * @param array<string,mixed> $input
 * @return array<string,mixed>
 */
function admin_update_user(int $id, array $actor, array $input): array
{
    $target = db_one('SELECT * FROM users WHERE id = :id', ['id' => $id]);
    if ($target === null) {
        throw err_not_found('کاربر یافت نشد');
    }
    $actorRole = (string) $actor['role'];

    if (isset($input['role']) && (string) $input['role'] !== (string) $target['role']) {
        if ($actorRole !== 'SUPER_ADMIN') {
            throw err_conflict('تغییر نقش فقط با دسترسی مدیر ارشد انجام می‌شود');
        }
        if ((string) $target['role'] === 'SUPER_ADMIN') {
            throw err_conflict('نقش مدیر ارشد قابل تغییر نیست');
        }
    }
    if (($input['status'] ?? null) === 'SUSPENDED') {
        if ((int) $actor['id'] === $id) {
            throw err_conflict('نمی‌توانید حساب خودتان را تعلیق کنید');
        }
        if ((string) $target['role'] !== 'CUSTOMER' && $actorRole !== 'SUPER_ADMIN') {
            throw err_conflict('تعلیق مدیر نیازمند دسترسی مدیر ارشد است');
        }
    }

    db_transaction(static function () use ($id, $input, $target): void {
        $sets = [];
        $params = ['id' => $id];
        if (array_key_exists('name', $input)) {
            $sets[] = 'name = :name';
            $params['name'] = $input['name'];
        }
        if (array_key_exists('businessName', $input)) {
            $sets[] = 'business_name = :bname';
            $params['bname'] = $input['businessName'];
        }
        if (isset($input['status'])) {
            $sets[] = 'status = :status';
            $params['status'] = (string) $input['status'];
        }
        if (isset($input['role']) && (string) $input['role'] !== (string) $target['role']) {
            $sets[] = 'role = :role';
            $params['role'] = (string) $input['role'];
        }
        if ($sets !== []) {
            $sets[] = 'updated_at = NOW()';
            db_exec('UPDATE users SET ' . implode(', ', $sets) . ' WHERE id = :id', $params);
        }

        // Suspension kicks the user out of every device immediately.
        if (($input['status'] ?? null) === 'SUSPENDED') {
            db_exec('UPDATE sessions SET revoked_at = NOW() WHERE user_id = :u AND revoked_at IS NULL', ['u' => $id]);
        }
        // Losing admin rights kills any open admin session.
        if (isset($input['role']) && (string) $input['role'] === 'CUSTOMER') {
            db_exec("UPDATE sessions SET revoked_at = NOW() WHERE user_id = :u AND purpose = 'ADMIN' AND revoked_at IS NULL", ['u' => $id]);
        }
    });

    return admin_get_user($id);
}

// ─────────────────────────────────── Coupons ─────────────────────────────────

/** @return list<array<string,mixed>> */
function admin_list_coupons(): array
{
    $rows = db_all(
        'SELECT c.*, (SELECT COUNT(*) FROM coupon_redemptions r WHERE r.coupon_id = c.id) AS redemptions
           FROM coupons c ORDER BY c.created_at DESC, c.id DESC'
    );
    return array_map(static fn (array $c): array => [
        'id' => (string) $c['id'],
        'code' => (string) $c['code'],
        'type' => (string) $c['type'],
        'value' => (int) $c['value'],
        'minOrderTotal' => $c['min_order_total'] !== null ? (int) $c['min_order_total'] : null,
        'maxDiscount' => $c['max_discount'] !== null ? (int) $c['max_discount'] : null,
        'usageLimit' => $c['usage_limit'] !== null ? (int) $c['usage_limit'] : null,
        'perUserLimit' => $c['per_user_limit'] !== null ? (int) $c['per_user_limit'] : null,
        'usedCount' => (int) $c['used_count'],
        'startsAt' => iso_date($c['starts_at']),
        'expiresAt' => iso_date($c['expires_at']),
        'isActive' => (bool) $c['is_active'],
        'createdAt' => iso_date((string) $c['created_at']),
        '_count' => ['redemptions' => (int) $c['redemptions']],
    ], $rows);
}

/**
 * @param array<string,mixed> $input
 * @return array<string,mixed>
 */
function admin_create_coupon(array $input): array
{
    $code = strtoupper(trim((string) ($input['code'] ?? '')));
    if (preg_match('/^[A-Z0-9_-]{3,40}$/', $code) !== 1) {
        throw err_validation('کد تخفیف معتبر نیست');
    }
    if (db_one('SELECT id FROM coupons WHERE code = :c', ['c' => $code]) !== null) {
        throw err_conflict('این کد تخفیف قبلاً تعریف شده است');
    }

    $type = (string) field_enum($input, 'type', ['PERCENT', 'FIXED']);
    $value = (int) field_int($input, 'value', true, 1, 1000000000);
    if ($type === 'PERCENT' && $value > 100) {
        throw err_validation('درصد تخفیف نمی‌تواند بیش از ۱۰۰ باشد');
    }

    $parseDate = static function (mixed $raw): ?string {
        if ($raw === null || $raw === '') {
            return null;
        }
        $ts = strtotime((string) $raw);
        if ($ts === false) {
            throw err_validation('تاریخ وارد شده معتبر نیست');
        }
        return date('Y-m-d H:i:s', $ts);
    };

    db_exec(
        'INSERT INTO coupons (code, type, value, min_order_total, max_discount, usage_limit, per_user_limit,
                              used_count, starts_at, expires_at, is_active, created_at, updated_at)
         VALUES (:c, :t, :v, :min, :max, :ul, :pul, 0, :s, :e, :a, NOW(), NOW())',
        [
            'c' => $code, 't' => $type, 'v' => $value,
            'min' => isset($input['minOrderTotal']) && $input['minOrderTotal'] !== null ? (int) $input['minOrderTotal'] : null,
            'max' => isset($input['maxDiscount']) && $input['maxDiscount'] !== null ? (int) $input['maxDiscount'] : null,
            'ul' => isset($input['usageLimit']) && $input['usageLimit'] !== null ? (int) $input['usageLimit'] : null,
            'pul' => isset($input['perUserLimit']) && $input['perUserLimit'] !== null ? (int) $input['perUserLimit'] : null,
            's' => $parseDate($input['startsAt'] ?? null),
            'e' => $parseDate($input['expiresAt'] ?? null),
            'a' => (bool) field_bool($input, 'isActive', false, true) ? 1 : 0,
        ]
    );

    $id = db_last_id();
    foreach (admin_list_coupons() as $coupon) {
        if ($coupon['id'] === (string) $id) {
            return $coupon;
        }
    }
    throw err_not_found('کد تخفیف یافت نشد');
}

/** @return array<string,mixed> */
function admin_toggle_coupon(int $id, bool $isActive): array
{
    if (db_one('SELECT id FROM coupons WHERE id = :id', ['id' => $id]) === null) {
        throw err_not_found('کد تخفیف یافت نشد');
    }
    db_exec('UPDATE coupons SET is_active = :a, updated_at = NOW() WHERE id = :id', ['a' => $isActive ? 1 : 0, 'id' => $id]);
    foreach (admin_list_coupons() as $coupon) {
        if ($coupon['id'] === (string) $id) {
            return $coupon;
        }
    }
    throw err_not_found('کد تخفیف یافت نشد');
}

// ────────────────────────── Audit logs & contact messages ────────────────────

/** @return array<string,mixed> */
function admin_list_audit_logs(?string $entity, int $page = 1): array
{
    $pageSize = 20;
    $page = max(1, $page);
    $where = $entity !== null && $entity !== '' ? 'WHERE a.entity = :entity' : '';
    $params = $where !== '' ? ['entity' => $entity] : [];

    $total = (int) db_value("SELECT COUNT(*) FROM audit_logs a {$where}", $params);
    $offset = ($page - 1) * $pageSize;

    $rows = db_all(
        "SELECT a.*, u.name AS admin_name, u.mobile AS admin_mobile
           FROM audit_logs a LEFT JOIN users u ON u.id = a.admin_id
           {$where} ORDER BY a.created_at DESC, a.id DESC LIMIT {$pageSize} OFFSET {$offset}",
        $params
    );

    return [
        'items' => array_map(static function (array $r): array {
            $metadata = $r['metadata'] !== null ? json_decode((string) $r['metadata'], true) : null;
            return [
                'id' => (string) $r['id'],
                'action' => (string) $r['action'],
                'entity' => (string) $r['entity'],
                'entityId' => $r['entity_id'],
                'metadata' => is_array($metadata) ? $metadata : null,
                'ip' => $r['ip'],
                'createdAt' => iso_date((string) $r['created_at']),
                'admin' => $r['admin_name'] !== null || $r['admin_mobile'] !== null
                    ? ['name' => $r['admin_name'], 'mobile' => $r['admin_mobile']] : null,
            ];
        }, $rows),
        'total' => $total,
        'page' => $page,
        'pageSize' => $pageSize,
        'totalPages' => max(1, (int) ceil($total / $pageSize)),
    ];
}

/** @return array<string,mixed> */
function admin_list_contact_messages(int $page = 1): array
{
    $pageSize = 20;
    $page = max(1, $page);
    $total = (int) db_value('SELECT COUNT(*) FROM contact_messages');
    $offset = ($page - 1) * $pageSize;
    $rows = db_all("SELECT * FROM contact_messages ORDER BY created_at DESC, id DESC LIMIT {$pageSize} OFFSET {$offset}");

    return [
        'items' => array_map(static fn (array $m): array => [
            'id' => (string) $m['id'],
            'name' => (string) $m['name'],
            'mobile' => (string) $m['mobile'],
            'subject' => $m['subject'],
            'message' => (string) $m['message'],
            'status' => (string) $m['status'],
            'createdAt' => iso_date((string) $m['created_at']),
        ], $rows),
        'total' => $total,
        'page' => $page,
        'pageSize' => $pageSize,
        'totalPages' => max(1, (int) ceil($total / $pageSize)),
    ];
}
