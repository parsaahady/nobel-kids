<?php
/**
 * GET|POST /api/payments/callback.php
 *
 * The gateway redirects the customer back here. This is an EXTERNAL entry
 * point, so the same-origin CSRF check does not apply — safety comes from the
 * server-to-server verification inside handle_gateway_callback().
 *
 * Always ends in a 303 redirect to the static result page.
 */
declare(strict_types=1);
require_once __DIR__ . '/../config/app.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/response.php';
require_once __DIR__ . '/../config/security.php';
require_once __DIR__ . '/../lib/payments.php';

security_headers();

$siteUrl = rtrim(nobel_site_url(), '/');
$params = array_map('strval', array_merge($_GET, $_POST));

try {
    $result = handle_gateway_callback($params);
    $status = $result['ok'] ? 'success' : 'failed';
    $target = $siteUrl . '/checkout/result/?status=' . $status;
    if ($result['orderNumber'] !== null) {
        $target .= '&order=' . rawurlencode($result['orderNumber']);
    }
} catch (Throwable $e) {
    nobel_log('error', 'payment.callback_error', ['message' => $e->getMessage()]);
    $target = $siteUrl . '/checkout/result/?status=error';
}

header('Location: ' . $target, true, 303);
exit;
