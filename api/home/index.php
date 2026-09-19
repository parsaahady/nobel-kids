<?php
/**
 * GET /api/home/index.php
 *
 * Everything the homepage needs in one request: featured / newest / bestseller
 * strips. Used at BUILD time by scripts/fetch-static-data.mjs to bake the
 * homepage, and at RUNTIME by the client to refresh prices and stock.
 */
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/catalog.php';

handle(['GET'], function (): never {
    json_ok(home_sections());
});
