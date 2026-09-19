<?php
/** GET /api/search/index.php?q= — quick header search (min 2 chars, max 6 hits). */
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/catalog.php';

handle(['GET'], function (): never {
    $q = trim((string) query_string_param('q', '', 120));
    if (mb_strlen($q) < 2) {
        json_ok(['items' => []]);
    }
    json_ok(['items' => search_products($q, 6)]);
});
