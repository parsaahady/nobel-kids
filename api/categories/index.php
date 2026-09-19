<?php
/** GET /api/categories/index.php — active categories with product counts. */
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/catalog.php';

handle(['GET'], function (): never {
    json_ok(['items' => list_categories(true, true)]);
});
