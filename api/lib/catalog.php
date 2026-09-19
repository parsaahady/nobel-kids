<?php
/**
 * Nobel Kids — catalog repository.
 *
 * Produces EXACTLY the DTO shapes the existing React UI already consumes
 * (types/index.ts): ProductListItemDTO, ProductDetailDTO, CategoryDTO…
 * IDs are serialised as strings so the frontend types stay untouched.
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
require_once __DIR__ . '/../config/security.php';
require_once __DIR__ . '/pricing.php';

/** Public visibility filter: active, not soft-deleted, inside an active category. */
const CATALOG_PUBLIC_WHERE = "p.status = 'ACTIVE' AND p.deleted_at IS NULL AND c.is_active = 1";

/**
 * @param array<string,mixed> $row
 * @return array<string,mixed>
 */
function map_product_list_item(array $row): array
{
    $productId = (int) $row['id'];
    return [
        'id' => (string) $productId,
        'slug' => (string) $row['slug'],
        'name' => (string) $row['name'],
        'shortName' => $row['short_name'] !== null ? (string) $row['short_name'] : null,
        'price' => (int) $row['price'],
        'comparePrice' => $row['compare_price'] !== null ? (int) $row['compare_price'] : null,
        'stock' => (int) $row['stock'],
        'packSize' => (int) $row['pack_size'],
        'status' => (string) $row['status'],
        'featured' => (bool) $row['featured'],
        'isNew' => (bool) $row['is_new'],
        'isBestSeller' => (bool) $row['is_best_seller'],
        'category' => [
            'id' => (string) $row['category_id'],
            'name' => (string) $row['category_name'],
            'slug' => (string) $row['category_slug'],
        ],
        'collection' => $row['collection'] !== null ? (string) $row['collection'] : null,
        'gender' => $row['gender'] !== null ? (string) $row['gender'] : null,
        'image' => $row['image'] ?? null,
        'colors' => product_colors($productId),
        'sizes' => product_sizes($productId),
        // sku is extra data the admin list uses; harmless for the storefront.
        'sku' => (string) ($row['sku'] ?? ''),
    ];
}

/** @return list<array{id:string,name:string,hex:?string}> */
function product_colors(int $productId): array
{
    $rows = db_all('SELECT id, name, hex FROM product_colors WHERE product_id = :p ORDER BY sort_order ASC, id ASC', ['p' => $productId]);
    return array_map(
        static fn (array $r): array => ['id' => (string) $r['id'], 'name' => (string) $r['name'], 'hex' => $r['hex'] !== null ? (string) $r['hex'] : null],
        $rows
    );
}

/** @return list<array{id:string,label:string}> */
function product_sizes(int $productId): array
{
    $rows = db_all('SELECT id, label FROM product_sizes WHERE product_id = :p ORDER BY sort_order ASC, id ASC', ['p' => $productId]);
    return array_map(static fn (array $r): array => ['id' => (string) $r['id'], 'label' => (string) $r['label']], $rows);
}

/** @return list<array{id:string,url:string,alt:?string,sortOrder:int,isPrimary:bool}> */
function product_gallery(int $productId): array
{
    $rows = db_all('SELECT id, url, alt, sort_order, is_primary FROM product_images WHERE product_id = :p ORDER BY sort_order ASC, id ASC', ['p' => $productId]);
    return array_map(static fn (array $r): array => [
        'id' => (string) $r['id'],
        'url' => (string) $r['url'],
        'alt' => $r['alt'] !== null ? (string) $r['alt'] : null,
        'sortOrder' => (int) $r['sort_order'],
        'isPrimary' => (bool) $r['is_primary'],
    ], $rows);
}

/** @return list<array{minPacks:int,discountBps:int}> */
function product_tiers(int $productId): array
{
    $rows = db_all('SELECT min_packs, discount_bps FROM price_tiers WHERE product_id = :p ORDER BY min_packs ASC', ['p' => $productId]);
    return array_map(static fn (array $r): array => ['minPacks' => (int) $r['min_packs'], 'discountBps' => (int) $r['discount_bps']], $rows);
}

/** Base SELECT used by every list query (single primary image joined in). */
function product_list_select(): string
{
    return "SELECT p.id, p.slug, p.name, p.short_name, p.price, p.compare_price, p.stock,
                   p.pack_size, p.status, p.featured, p.is_new, p.is_best_seller,
                   p.collection, p.gender, p.sku, p.category_id,
                   c.name AS category_name, c.slug AS category_slug,
                   (SELECT i.url FROM product_images i WHERE i.product_id = p.id
                     ORDER BY i.is_primary DESC, i.sort_order ASC, i.id ASC LIMIT 1) AS image
              FROM products p
              JOIN categories c ON c.id = p.category_id";
}

/**
 * Storefront product listing with search / filter / sort / pagination.
 *
 * @param array<string,mixed> $query
 * @return array{items:list<array<string,mixed>>,total:int,page:int,pageSize:int,totalPages:int}
 */
function list_products(array $query): array
{
    $page = max(1, (int) ($query['page'] ?? 1));
    $pageSize = min(48, max(4, (int) ($query['pageSize'] ?? 12)));

    $where = [CATALOG_PUBLIC_WHERE];
    $params = [];

    if (!empty($query['category'])) {
        $where[] = '(c.slug = :cat OR c.name = :cat)';
        $params['cat'] = (string) $query['category'];
    }
    if (!empty($query['collection'])) {
        $where[] = 'p.collection = :collection';
        $params['collection'] = (string) $query['collection'];
    }
    if (!empty($query['available'])) {
        $where[] = 'p.stock > 0';
    }
    if (!empty($query['featuredOnly'])) {
        $where[] = 'p.featured = 1';
    }
    if (!empty($query['minPrice'])) {
        $where[] = 'p.price >= :minPrice';
        $params['minPrice'] = (int) $query['minPrice'];
    }
    if (!empty($query['maxPrice'])) {
        $where[] = 'p.price <= :maxPrice';
        $params['maxPrice'] = (int) $query['maxPrice'];
    }
    if (!empty($query['size'])) {
        $where[] = 'EXISTS (SELECT 1 FROM product_sizes s WHERE s.product_id = p.id AND s.label = :size)';
        $params['size'] = (string) $query['size'];
    }
    if (!empty($query['color'])) {
        $where[] = 'EXISTS (SELECT 1 FROM product_colors pc WHERE pc.product_id = p.id AND pc.name LIKE :color)';
        $params['color'] = like_pattern((string) $query['color']);
    }
    if (!empty($query['q'])) {
        $where[] = '(p.name LIKE :q OR p.short_name LIKE :q OR p.description LIKE :q OR p.collection LIKE :q OR p.sku LIKE :q OR JSON_SEARCH(p.tags, \'one\', :qexact) IS NOT NULL)';
        $params['q'] = like_pattern((string) $query['q']);
        $params['qexact'] = (string) $query['q'];
    }

    $whereSql = implode(' AND ', $where);

    $orderBy = match ((string) ($query['sort'] ?? 'newest')) {
        'cheapest'   => 'p.price ASC, p.id DESC',
        'expensive'  => 'p.price DESC, p.id DESC',
        'bestseller' => 'p.is_best_seller DESC, p.created_at DESC, p.id DESC',
        default      => 'p.created_at DESC, p.id DESC',
    };

    $total = (int) db_value(
        "SELECT COUNT(*) FROM products p JOIN categories c ON c.id = p.category_id WHERE {$whereSql}",
        $params
    );

    $offset = ($page - 1) * $pageSize;
    $rows = db_all(
        product_list_select() . " WHERE {$whereSql} ORDER BY {$orderBy} LIMIT {$pageSize} OFFSET {$offset}",
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

/** @return array<string,mixed>|null */
function get_product_by_slug(string $slug): ?array
{
    $row = db_one(
        product_list_select() . ' WHERE ' . CATALOG_PUBLIC_WHERE . ' AND p.slug = :slug LIMIT 1',
        ['slug' => $slug]
    );
    return $row === null ? null : map_product_detail($row);
}

/** @return array<string,mixed>|null */
function get_product_by_id(int $id, bool $publicOnly = true): ?array
{
    $sql = product_list_select() . ' WHERE p.id = :id' . ($publicOnly ? ' AND ' . CATALOG_PUBLIC_WHERE : ' AND p.deleted_at IS NULL') . ' LIMIT 1';
    $row = db_one($sql, ['id' => $id]);
    return $row === null ? null : map_product_detail($row);
}

/**
 * @param array<string,mixed> $row
 * @return array<string,mixed>
 */
function map_product_detail(array $row): array
{
    $id = (int) $row['id'];
    $base = map_product_list_item($row);
    unset($base['image']);

    $full = db_one('SELECT description, short_description, material, tags, seo_title, seo_description, min_packs FROM products WHERE id = :id', ['id' => $id]) ?? [];
    $tags = [];
    if (!empty($full['tags'])) {
        $decoded = json_decode((string) $full['tags'], true);
        if (is_array($decoded)) {
            $tags = array_values(array_map('strval', $decoded));
        }
    }

    return $base + [
        'description' => $full['description'] !== null ? (string) $full['description'] : null,
        'shortDescription' => $full['short_description'] !== null ? (string) $full['short_description'] : null,
        'material' => $full['material'] !== null ? (string) $full['material'] : null,
        'minPacks' => (int) ($full['min_packs'] ?? 1),
        'tags' => $tags,
        'gallery' => product_gallery($id),
        'tiers' => product_tiers($id),
        'seoTitle' => $full['seo_title'] !== null ? (string) $full['seo_title'] : null,
        'seoDescription' => $full['seo_description'] !== null ? (string) $full['seo_description'] : null,
    ];
}

/** @return list<array<string,mixed>> */
function get_related_products(string $slug, int $take = 4): array
{
    $product = db_one(
        'SELECT p.id, p.category_id, p.collection FROM products p JOIN categories c ON c.id = p.category_id
          WHERE p.slug = :slug AND ' . CATALOG_PUBLIC_WHERE . ' LIMIT 1',
        ['slug' => $slug]
    );
    if ($product === null) {
        return [];
    }
    $rows = db_all(
        product_list_select() . ' WHERE ' . CATALOG_PUBLIC_WHERE . '
             AND p.id <> :id
             AND (p.category_id = :cat OR (p.collection IS NOT NULL AND p.collection = :collection))
           ORDER BY p.is_best_seller DESC, p.created_at DESC
           LIMIT ' . max(1, $take),
        ['id' => (int) $product['id'], 'cat' => (int) $product['category_id'], 'collection' => $product['collection']]
    );
    return array_map('map_product_list_item', $rows);
}

/** @return list<array<string,mixed>> */
function search_products(string $term, int $take = 6): array
{
    $rows = db_all(
        product_list_select() . ' WHERE ' . CATALOG_PUBLIC_WHERE . '
             AND (p.name LIKE :q OR p.short_name LIKE :q OR p.collection LIKE :q OR p.sku LIKE :q)
           ORDER BY p.is_best_seller DESC, p.created_at DESC
           LIMIT ' . max(1, $take),
        ['q' => like_pattern($term)]
    );
    return array_map('map_product_list_item', $rows);
}

/** @return array{featured:list<array<string,mixed>>,newest:list<array<string,mixed>>,bestsellers:list<array<string,mixed>>} */
function home_sections(): array
{
    $featured = db_all(product_list_select() . ' WHERE ' . CATALOG_PUBLIC_WHERE . ' AND p.featured = 1 ORDER BY p.updated_at DESC LIMIT 4');
    $newest = db_all(product_list_select() . ' WHERE ' . CATALOG_PUBLIC_WHERE . ' ORDER BY p.created_at DESC LIMIT 4');
    $best = db_all(product_list_select() . ' WHERE ' . CATALOG_PUBLIC_WHERE . ' AND p.is_best_seller = 1 ORDER BY p.updated_at DESC LIMIT 4');
    return [
        'featured' => array_map('map_product_list_item', $featured),
        'newest' => array_map('map_product_list_item', $newest),
        'bestsellers' => array_map('map_product_list_item', $best),
    ];
}

/** @return list<array<string,mixed>> */
function list_categories(bool $withCounts = false, bool $onlyActive = false): array
{
    $where = $onlyActive ? 'WHERE is_active = 1' : '';
    $rows = db_all("SELECT id, name, slug, description, image, is_active, sort_order FROM categories {$where} ORDER BY sort_order ASC, name ASC");
    return array_map(static function (array $row) use ($withCounts): array {
        $item = [
            'id' => (string) $row['id'],
            'name' => (string) $row['name'],
            'slug' => (string) $row['slug'],
            'description' => $row['description'] !== null ? (string) $row['description'] : null,
            'image' => $row['image'] !== null ? (string) $row['image'] : null,
            'isActive' => (bool) $row['is_active'],
            'sortOrder' => (int) $row['sort_order'],
        ];
        if ($withCounts) {
            $item['productCount'] = (int) db_value(
                "SELECT COUNT(*) FROM products WHERE category_id = :c AND deleted_at IS NULL AND status = 'ACTIVE'",
                ['c' => (int) $row['id']]
            );
        }
        return $item;
    }, $rows);
}

/** @return list<string> */
function list_sizes_facet(): array
{
    $rows = db_all(
        'SELECT DISTINCT s.label FROM product_sizes s
           JOIN products p ON p.id = s.product_id
           JOIN categories c ON c.id = p.category_id
          WHERE ' . CATALOG_PUBLIC_WHERE . '
          ORDER BY s.label ASC'
    );
    return array_map(static fn (array $r): string => (string) $r['label'], $rows);
}

/** @return list<string> */
function list_collections(): array
{
    $rows = db_all(
        'SELECT DISTINCT p.collection FROM products p JOIN categories c ON c.id = p.category_id
          WHERE ' . CATALOG_PUBLIC_WHERE . ' AND p.collection IS NOT NULL AND p.collection <> \'\'
          ORDER BY p.collection ASC'
    );
    return array_map(static fn (array $r): string => (string) $r['collection'], $rows);
}

// ─────────────────────────────── Settings ───────────────────────────────────

/** @return mixed */
function get_setting(string $key, mixed $default = null): mixed
{
    $raw = db_value('SELECT `value` FROM settings WHERE `key` = :k', ['k' => $key]);
    if ($raw === null) {
        return $default;
    }
    $decoded = json_decode((string) $raw, true);
    return $decoded ?? $default;
}

function put_setting(string $key, mixed $value): void
{
    db_exec(
        'INSERT INTO settings (`key`, `value`) VALUES (:k, :v) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)',
        ['k' => $key, 'v' => json_encode($value, JSON_UNESCAPED_UNICODE)]
    );
}

/** Shipping methods (DB-configurable, same defaults as the old code). */
function shipping_methods(): array
{
    $stored = get_setting('shipping');
    if (is_array($stored) && !empty($stored['methods']) && is_array($stored['methods'])) {
        return array_values($stored['methods']);
    }
    return [
        ['id' => 'freight', 'label' => 'باربری یا تیپاکس', 'description' => 'مناسب سفارش‌های عمده شهرستان', 'cost' => 0, 'note' => 'پس‌کرایه'],
        ['id' => 'pickup', 'label' => 'تحویل حضوری', 'description' => 'بازار بزرگ تهران', 'cost' => 0, 'note' => 'رایگان'],
    ];
}

/** @throws ApiException */
function get_shipping_method(string $id): array
{
    foreach (shipping_methods() as $method) {
        if (($method['id'] ?? '') === $id) {
            return $method;
        }
    }
    throw err_bad_request('روش ارسال معتبر نیست', 'INVALID_SHIPPING');
}
