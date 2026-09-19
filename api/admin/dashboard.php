<?php
/** GET /api/admin/dashboard.php — KPI cards, 30-day chart, low stock, activity. */
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/admin.php';

handle(['GET'], function (): never {
    require_admin();
    json_ok(admin_dashboard());
});
