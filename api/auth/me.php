<?php
/**
 * GET /api/auth/me.php
 *
 * Returns the current customer (or null) plus their wishlist product ids.
 * Shape matches what components/Providers.tsx already expects.
 */

declare(strict_types=1);

require_once __DIR__ . '/../lib/bootstrap.php';

handle(['GET'], function (): never {
    $user = current_user();
    if ($user === null) {
        json_ok(['user' => null, 'wishlistIds' => []]);
    }

    $rows = db_all('SELECT product_id FROM wishlist_items WHERE user_id = :u', ['u' => (int) $user['id']]);

    json_ok([
        'user' => [
            'id' => (string) $user['id'],
            'mobile' => $user['mobile'],
            'name' => $user['name'],
            'businessName' => $user['business_name'],
            'email' => $user['email'],
            'role' => $user['role'],
            'status' => $user['status'],
            'createdAt' => iso_date((string) $user['created_at']),
            'lastLoginAt' => iso_date($user['last_login_at']),
        ],
        'wishlistIds' => array_map(static fn (array $r): string => (string) $r['product_id'], $rows),
    ]);
});
