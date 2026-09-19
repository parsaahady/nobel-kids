<?php
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Cron: expire unpaid gateway orders
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * A customer who starts an online payment and never finishes it leaves an
 * AWAITING_PAYMENT order holding reserved stock. This job cancels those orders
 * after a grace period and returns their stock to inventory.
 *
 * ── Set up in DirectAdmin ──────────────────────────────────────────────────
 * Advanced Features → Cronjobs → Create. Run every 15 minutes with the
 * schedule fields: minute "0,15,30,45", and "*" for hour, day, month, weekday.
 * Command:
 *
 *     /usr/local/bin/php /home/USERNAME/domains/DOMAIN/public_html/api/cron/expire-orders.php
 *
 * (Adjust the PHP path — DirectAdmin usually shows it on the Cronjobs page.)
 *
 * ── If your host does not offer cron ───────────────────────────────────────
 * Call it over HTTPS from an external scheduler (cron-job.org, UptimeRobot):
 *
 *     https://DOMAIN/api/cron/expire-orders.php?token=YOUR_CRON_TOKEN
 *
 * The token must match security.cron_token in config/config.php. Without a
 * configured token, HTTP access is refused outright — CLI always works.
 */

declare(strict_types=1);

require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/payments.php';

$isCli = PHP_SAPI === 'cli';

// ── Access control for the HTTP entry point ─────────────────────────────────
if (!$isCli) {
    $configured = (string) cfg('security.cron_token', '');
    $provided = (string) ($_GET['token'] ?? $_SERVER['HTTP_X_CRON_TOKEN'] ?? '');

    if (strlen($configured) < 16 || !hash_equals($configured, $provided)) {
        nobel_log('warn', 'cron.unauthorized', ['ip' => client_ip(), 'job' => 'expire-orders']);
        http_response_code(403);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'ok' => false,
            'error' => ['code' => 'FORBIDDEN', 'message' => 'دسترسی به این مسیر مجاز نیست'],
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
}

// ── Run ─────────────────────────────────────────────────────────────────────
$minutes = max(5, (int) cfg('payment.unpaid_expire_minutes', 60));
$started = microtime(true);

try {
    $cancelled = expire_unpaid_orders($minutes);

    // Opportunistic housekeeping: drop expired rate-limit and OTP rows so the
    // tables stay small on a shared host with no other scheduled maintenance.
    rate_limit_gc();
    db_exec('DELETE FROM otp_codes WHERE expires_at < (NOW() - INTERVAL 1 DAY)');
    db_exec("DELETE FROM sessions WHERE (expires_at < NOW() OR revoked_at IS NOT NULL) AND created_at < (NOW() - INTERVAL 7 DAY)");

    $elapsed = (int) round((microtime(true) - $started) * 1000);
    nobel_log('info', 'cron.expire_orders', [
        'cancelled' => $cancelled, 'minutes' => $minutes, 'ms' => $elapsed,
    ]);

    if ($isCli) {
        printf("expire-orders: cancelled %d unpaid order(s) older than %d minutes (%dms)\n", $cancelled, $minutes, $elapsed);
        exit(0);
    }
    echo json_encode([
        'ok' => true,
        'data' => ['cancelled' => $cancelled, 'olderThanMinutes' => $minutes, 'ms' => $elapsed],
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    nobel_log('error', 'cron.expire_orders.failed', ['error' => $e->getMessage()]);
    if ($isCli) {
        fwrite(STDERR, 'expire-orders FAILED: ' . $e->getMessage() . "\n");
        exit(1);
    }
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => ['code' => 'INTERNAL', 'message' => 'اجرای وظیفه زمان‌بندی‌شده ناموفق بود'],
    ], JSON_UNESCAPED_UNICODE);
}
