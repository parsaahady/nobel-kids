<?php
/**
 * Nobel Kids — customer profile & address book.
 *
 * Every query is scoped by user_id so a customer can never read or modify
 * another customer's address, even with a guessed numeric id (IDOR guard).
 */

declare(strict_types=1);

// ─────────────────────────── Direct-access guard ────────────────────────────
// This file is a library include, never a web endpoint. api/.htaccess already
// blocks the path, but a host with AllowOverride None would ignore that, so we
// refuse to run when requested directly. Defence in depth, zero cost.
if (isset($_SERVER['SCRIPT_FILENAME']) && realpath($_SERVER['SCRIPT_FILENAME']) === realpath(__FILE__)) {
    http_response_code(404);
    exit;
}

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/response.php';
require_once __DIR__ . '/../config/security.php';

/**
 * Validates and normalises an address payload (mirrors addressSchema in zod).
 *
 * @param array<string,mixed> $input
 * @return array<string,mixed>
 * @throws ApiException
 */
function validate_address_input(array $input): array
{
    $address = (string) field_string($input, 'address', true, 500);
    if (mb_strlen($address) < 5) {
        throw err_validation('آدرس را کامل‌تر وارد کنید');
    }

    $postalCode = field_string($input, 'postalCode', false, 20);
    if ($postalCode !== null && $postalCode !== '') {
        $postalCode = normalize_digits($postalCode);
        if (preg_match('/^\d{10}$/', $postalCode) !== 1) {
            throw err_validation('کد پستی باید ۱۰ رقم باشد');
        }
    } else {
        $postalCode = null;
    }

    return [
        'title' => field_string($input, 'title', false, 60),
        'recipient_name' => (string) field_string($input, 'recipientName', true, 100),
        'mobile' => field_mobile($input, 'mobile'),
        'province' => (string) field_string($input, 'province', true, 60),
        'city' => (string) field_string($input, 'city', true, 60),
        'address' => $address,
        'postal_code' => $postalCode,
        'unit' => field_string($input, 'unit', false, 20),
        'plate' => field_string($input, 'plate', false, 20),
        'is_default' => (bool) field_bool($input, 'isDefault', false, false),
    ];
}

/** @param array<string,mixed> $data */
function create_address(int $userId, array $data): int
{
    return db_transaction(static function () use ($userId, $data): int {
        $count = (int) db_value('SELECT COUNT(*) FROM addresses WHERE user_id = :u', ['u' => $userId]);
        if ($count >= 20) {
            throw err_conflict('حداکثر ۲۰ آدرس می‌توانید ذخیره کنید');
        }
        // The very first address is always the default.
        $isDefault = $data['is_default'] || $count === 0;
        if ($isDefault) {
            db_exec('UPDATE addresses SET is_default = 0 WHERE user_id = :u', ['u' => $userId]);
        }

        db_exec(
            'INSERT INTO addresses (user_id, title, recipient_name, mobile, province, city, address,
                                    postal_code, unit, plate, is_default, created_at, updated_at)
             VALUES (:u, :t, :r, :m, :p, :c, :a, :pc, :un, :pl, :d, NOW(), NOW())',
            [
                'u' => $userId, 't' => $data['title'], 'r' => $data['recipient_name'], 'm' => $data['mobile'],
                'p' => $data['province'], 'c' => $data['city'], 'a' => $data['address'],
                'pc' => $data['postal_code'], 'un' => $data['unit'], 'pl' => $data['plate'],
                'd' => $isDefault ? 1 : 0,
            ]
        );
        return db_last_id();
    });
}

/** @param array<string,mixed> $data */
function update_address(int $userId, int $addressId, array $data): void
{
    db_transaction(static function () use ($userId, $addressId, $data): void {
        $owned = db_one('SELECT id FROM addresses WHERE id = :id AND user_id = :u', ['id' => $addressId, 'u' => $userId]);
        if ($owned === null) {
            throw err_not_found('آدرس یافت نشد');
        }
        if ($data['is_default']) {
            db_exec('UPDATE addresses SET is_default = 0 WHERE user_id = :u', ['u' => $userId]);
        }
        db_exec(
            'UPDATE addresses SET title = :t, recipient_name = :r, mobile = :m, province = :p, city = :c,
                    address = :a, postal_code = :pc, unit = :un, plate = :pl,
                    is_default = CASE WHEN :d = 1 THEN 1 ELSE is_default END, updated_at = NOW()
              WHERE id = :id AND user_id = :u',
            [
                't' => $data['title'], 'r' => $data['recipient_name'], 'm' => $data['mobile'],
                'p' => $data['province'], 'c' => $data['city'], 'a' => $data['address'],
                'pc' => $data['postal_code'], 'un' => $data['unit'], 'pl' => $data['plate'],
                'd' => $data['is_default'] ? 1 : 0, 'id' => $addressId, 'u' => $userId,
            ]
        );
    });
}

function delete_address(int $userId, int $addressId): void
{
    db_transaction(static function () use ($userId, $addressId): void {
        $row = db_one('SELECT is_default FROM addresses WHERE id = :id AND user_id = :u', ['id' => $addressId, 'u' => $userId]);
        if ($row === null) {
            throw err_not_found('آدرس یافت نشد');
        }
        db_exec('DELETE FROM addresses WHERE id = :id AND user_id = :u', ['id' => $addressId, 'u' => $userId]);

        // Promote another address to default if we deleted the default one.
        if ((int) $row['is_default'] === 1) {
            $next = db_one('SELECT id FROM addresses WHERE user_id = :u ORDER BY created_at ASC LIMIT 1', ['u' => $userId]);
            if ($next !== null) {
                db_exec('UPDATE addresses SET is_default = 1 WHERE id = :id', ['id' => (int) $next['id']]);
            }
        }
    });
}

function set_default_address(int $userId, int $addressId): void
{
    db_transaction(static function () use ($userId, $addressId): void {
        $owned = db_one('SELECT id FROM addresses WHERE id = :id AND user_id = :u', ['id' => $addressId, 'u' => $userId]);
        if ($owned === null) {
            throw err_not_found('آدرس یافت نشد');
        }
        db_exec('UPDATE addresses SET is_default = 0 WHERE user_id = :u', ['u' => $userId]);
        db_exec('UPDATE addresses SET is_default = 1, updated_at = NOW() WHERE id = :id', ['id' => $addressId]);
    });
}

/** @return list<array<string,mixed>> */
function list_addresses(int $userId): array
{
    $rows = db_all(
        'SELECT * FROM addresses WHERE user_id = :u ORDER BY is_default DESC, created_at DESC',
        ['u' => $userId]
    );
    return array_map(static fn (array $r): array => [
        'id' => (string) $r['id'],
        'title' => $r['title'],
        'recipientName' => (string) $r['recipient_name'],
        'mobile' => (string) $r['mobile'],
        'province' => (string) $r['province'],
        'city' => (string) $r['city'],
        'address' => (string) $r['address'],
        'postalCode' => $r['postal_code'],
        'unit' => $r['unit'],
        'plate' => $r['plate'],
        'isDefault' => (bool) $r['is_default'],
    ], $rows);
}
