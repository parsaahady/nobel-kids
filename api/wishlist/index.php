<?php
/**
 * GET  /api/wishlist/index.php          → { items, ids }
 * POST /api/wishlist/index.php {productId} → toggles, returns { wished, ids }
 */
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/catalog.php';

handle(['GET', 'POST'], function (array $body): never {
    $user = require_user();
    $userId = (int) $user['id'];

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $productId = (string) field_string($body, 'productId', true, 40);
        if (!ctype_digit($productId)) {
            throw err_validation('شناسه محصول معتبر نیست');
        }
        $pid = (int) $productId;

        $exists = db_one('SELECT id FROM products WHERE id = :id AND deleted_at IS NULL', ['id' => $pid]);
        if ($exists === null) {
            throw err_not_found('محصول یافت نشد');
        }

        $removed = db_exec('DELETE FROM wishlist_items WHERE user_id = :u AND product_id = :p', ['u' => $userId, 'p' => $pid]);
        if ($removed === 0) {
            db_exec(
                'INSERT INTO wishlist_items (user_id, product_id, created_at) VALUES (:u, :p, NOW())
                 ON DUPLICATE KEY UPDATE created_at = created_at',
                ['u' => $userId, 'p' => $pid]
            );
        }

        $ids = db_all('SELECT product_id FROM wishlist_items WHERE user_id = :u', ['u' => $userId]);
        json_ok([
            'wished' => $removed === 0,
            'ids' => array_map(static fn (array $r): string => (string) $r['product_id'], $ids),
        ]);
    }

    // product_list_select() already supplies "FROM products p JOIN categories c",
    // so the wishlist is attached as an extra join rather than a new FROM.
    $rows = db_all(
        product_list_select() . '
           JOIN wishlist_items w ON w.product_id = p.id
          WHERE w.user_id = :u AND p.deleted_at IS NULL
          ORDER BY w.created_at DESC, w.id DESC',
        ['u' => $userId]
    );

    json_ok([
        'items' => array_map('map_product_list_item', $rows),
        'ids' => array_map(static fn (array $r): string => (string) $r['id'], $rows),
    ]);
});
