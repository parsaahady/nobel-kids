<?php
/**
 * GET /api/site/index.php
 *
 * Public, non-secret runtime configuration the frontend legitimately needs:
 * whether the online gateway is enabled (decides the default payment radio)
 * and the canonical site URL (for JSON-LD / canonical tags in the export).
 *
 * NOTHING secret is exposed here. No DB credentials, no API keys, no tokens.
 */
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';

handle(['GET'], function (): never {
    json_ok([
        'gatewayEnabled' => (bool) cfg('payment.gateway_enabled', false),
        'siteUrl'        => nobel_site_url(),
        'packSize'       => 5,
    ]);
});
