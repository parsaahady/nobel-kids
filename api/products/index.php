<?php
/**
 * GET /api/products/index.php
 *   ?q & category & collection & minPrice & maxPrice & size & color
 *   &available=true|false &featured=true &sort=newest|cheapest|expensive|bestseller
 *   &page &pageSize
 *
 * Public catalogue listing. Mirrors the old /api/products route exactly.
 */
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/catalog.php';

handle(['GET'], function (): never {
    json_ok(list_products([
        'q'           => query_string_param('q'),
        'category'    => query_string_param('category', null, 120),
        'collection'  => query_string_param('collection', null, 120),
        'minPrice'    => isset($_GET['minPrice']) ? query_int_param('minPrice', 0, 0) : null,
        'maxPrice'    => isset($_GET['maxPrice']) ? query_int_param('maxPrice', 0, 0) : null,
        'size'        => query_string_param('size', null, 60),
        'color'       => query_string_param('color', null, 60),
        'available'   => query_string_param('available') !== 'false',
        'featuredOnly'=> query_string_param('featured') === 'true',
        'sort'        => query_string_param('sort', 'newest', 20),
        'page'        => query_int_param('page', 1, 1, 10000),
        'pageSize'    => query_int_param('pageSize', 12, 1, 60),
    ]));
});
