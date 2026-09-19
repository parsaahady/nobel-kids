<?php
/**
 * PATCH /api/account/profile.php  { name, businessName?, email? }
 * Updates the signed-in customer's own profile. Role/status/mobile are NOT
 * editable here — privilege escalation via this endpoint is impossible.
 */
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';

handle(['PATCH', 'POST'], function (array $body): never {
    $user = require_user();
    $userId = (int) $user['id'];

    $name = (string) field_string($body, 'name', true, 100);
    $businessName = field_string($body, 'businessName', false, 150);
    $email = field_email($body, 'email', false);

    db_exec(
        'UPDATE users SET name = :n, business_name = :b, email = :e, updated_at = NOW() WHERE id = :id',
        ['n' => $name, 'b' => $businessName, 'e' => $email, 'id' => $userId]
    );

    $fresh = db_one('SELECT * FROM users WHERE id = :id', ['id' => $userId]);
    json_ok(['user' => [
        'id' => (string) $fresh['id'],
        'mobile' => $fresh['mobile'],
        'name' => $fresh['name'],
        'businessName' => $fresh['business_name'],
        'email' => $fresh['email'],
        'role' => $fresh['role'],
        'status' => $fresh['status'],
        'createdAt' => iso_date((string) $fresh['created_at']),
        'lastLoginAt' => iso_date($fresh['last_login_at']),
    ]], 200, 'اطلاعات حساب به‌روز شد');
});
