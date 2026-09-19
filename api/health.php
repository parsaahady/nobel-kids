<?php
/**
 * GET /api/health.php — deployment smoke test.
 * Reports DB connectivity, schema presence, PHP version and writability of
 * the uploads directory. Details are only revealed outside production.
 */
declare(strict_types=1);
require_once __DIR__ . '/lib/bootstrap.php';
require_once __DIR__ . '/lib/storage.php';

handle(['GET'], function (): never {
    $checks = ['db' => 'down', 'schema' => 'unknown', 'uploads' => 'unknown'];
    $healthy = false;

    try {
        db_value('SELECT 1');
        $checks['db'] = 'up';
        $tables = (int) db_value(
            'SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = \'BASE TABLE\''
        );
        $checks['schema'] = $tables >= 20 ? 'ok' : 'incomplete (' . $tables . ' tables)';
        $healthy = $tables >= 20;
        rate_limit_gc();
    } catch (Throwable $e) {
        nobel_log('error', 'health.db_down', ['message' => $e->getMessage()]);
    }

    $uploadDir = upload_dir();
    $checks['uploads'] = is_dir($uploadDir) && is_writable($uploadDir) ? 'writable' : 'not-writable';

    $payload = ['status' => $healthy ? 'ok' : 'degraded', 'ts' => date('c')];
    if (!nobel_is_production()) {
        $payload['checks'] = $checks;
        $payload['php'] = PHP_VERSION;
        $payload['env'] = (string) cfg('app.env', 'production');
    }

    json_ok($payload, $healthy ? 200 : 503);
});
