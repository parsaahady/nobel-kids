<?php
/** GET /api/admin/audit-logs.php?entity&page — admin action trail. */
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/admin.php';

handle(['GET'], function (): never {
    require_admin();
    json_ok(admin_list_audit_logs(query_string_param('entity', null, 40), query_int_param('page', 1, 1, 10000)));
});
