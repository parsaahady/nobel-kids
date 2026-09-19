<?php
/**
 * GET /api/products/detail.php?slug=<slug>
 * Replaces the dynamic route /api/products/[slug]. Returns { product, related }.
 */
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/catalog.php';

handle(['GET'], function (): never {
    $slug = query_string_param('slug', null, 220);
    if ($slug === null || $slug === '') {
        throw err_validation('نامک محصول مشخص نشده است');
    }
    $product = get_product_by_slug($slug);
    if ($product === null) {
        throw err_not_found('محصول یافت نشد');
    }
    json_ok(['product' => $product, 'related' => get_related_products($slug)]);
});
