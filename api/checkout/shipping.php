<?php
/**
 * GET /api/checkout/shipping.php
 *
 * Shipping methods, from the `settings` table. Public: the checkout page shows
 * them before the customer commits, and the static export bakes them in.
 * The authoritative copy is still read server-side during checkout — this is
 * display only.
 */
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/catalog.php';

handle(['GET'], function (): never {
    json_ok(['methods' => shipping_methods()]);
});
