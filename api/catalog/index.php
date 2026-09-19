<?php
/**
 * GET /api/catalog/index.php
 *
 * Catalogue bootstrap payload: the first page of products plus the facets the
 * filter sidebar needs (categories, sizes, collections). Baked into the static
 * /products page at build time, then re-fetched live in the browser so prices
 * and stock are always current.
 */
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/catalog.php';

handle(['GET'], function (): never {
    json_ok([
        'initial' => list_products([
            'q'          => query_string_param('q'),
            'category'   => query_string_param('category', null, 120),
            'collection' => query_string_param('collection', null, 120),
            'available'  => true,
            'sort'       => query_string_param('sort', 'newest', 20),
            'page'       => 1,
            'pageSize'   => query_int_param('pageSize', 8, 1, 60),
        ]),
        'categories'  => list_categories(true, true),
        'sizeOptions' => list_sizes_facet(),
        'collections' => list_collections(),
    ]);
});
