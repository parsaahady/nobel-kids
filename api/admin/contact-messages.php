<?php
/** GET /api/admin/contact-messages.php?page — contact form inbox. */
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/admin.php';

handle(['GET'], function (): never {
    require_admin();
    json_ok(admin_list_contact_messages(query_int_param('page', 1, 1, 10000)));
});
