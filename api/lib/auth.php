<?php
/**
 * Nobel Kids — server-side authentication & authorization.
 *
 * Two fully independent gateways (identical to the previous architecture):
 *
 *   CUSTOMERS  → OTP login          → cookie nbl_session        (purpose CUSTOMER)
 *   ADMINS     → password login     → cookie nbl_admin_session  (purpose ADMIN)
 *
 * An OTP-minted customer session can NEVER open the admin panel, even if the
 * user's role is ADMIN — the admin guard only accepts ADMIN-purpose sessions.
 *
 * Cookies are HttpOnly + SameSite=Lax (+ Secure on HTTPS). The browser only
 * ever holds an opaque random token; the database stores its SHA-256 HMAC.
 * Roles are ALWAYS read from the database, never from the request.
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

require_once __DIR__ . '/../config/app.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/security.php';
require_once __DIR__ . '/../config/response.php';

function session_ttl_seconds(): int
{
    return max(1, (int) cfg('session.ttl_days', 30)) * 86400;
}

function cookie_secure_flag(): bool
{
    $setting = cfg('session.secure', 'auto');
    if (is_bool($setting)) {
        return $setting;
    }
    if (!empty($_SERVER['HTTPS']) && strtolower((string) $_SERVER['HTTPS']) !== 'off') {
        return true;
    }
    if (strtolower((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https') {
        return true;
    }
    return str_starts_with(strtolower(nobel_site_url()), 'https://');
}

function set_auth_cookie(string $name, string $value, int $maxAge): void
{
    if (headers_sent()) {
        return;
    }
    setcookie($name, $value, [
        'expires'  => $maxAge > 0 ? time() + $maxAge : 1,
        'path'     => '/',
        'secure'   => cookie_secure_flag(),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    $_COOKIE[$name] = $maxAge > 0 ? $value : '';
}

function clear_auth_cookie(string $name): void
{
    set_auth_cookie($name, '', -1);
    unset($_COOKIE[$name]);
}

function cookie_name_customer(): string { return (string) cfg('session.cookie_customer', 'nbl_session'); }
function cookie_name_admin(): string    { return (string) cfg('session.cookie_admin', 'nbl_admin_session'); }
function cookie_name_guest(): string    { return (string) cfg('session.cookie_guest', 'nbl_guest'); }

/**
 * Creates a DB-backed session and returns the raw token (only time it exists).
 */
function create_session(int $userId, string $purpose = 'CUSTOMER'): string
{
    $token = random_token(32);
    db_exec(
        'INSERT INTO sessions (user_id, token_hash, purpose, user_agent, ip, expires_at, last_used_at, created_at)
         VALUES (:uid, :hash, :purpose, :ua, :ip, DATE_ADD(NOW(), INTERVAL :ttl SECOND), NOW(), NOW())',
        [
            'uid' => $userId,
            'hash' => hash_session_token($token),
            'purpose' => $purpose,
            'ua' => client_user_agent(),
            'ip' => client_ip(),
            'ttl' => session_ttl_seconds(),
        ]
    );
    return $token;
}

/**
 * Resolves a session token to its user, applying sliding renewal.
 *
 * @return array{user:array<string,mixed>,session_id:int}|null
 */
function resolve_session(?string $token, string $expectedPurpose): ?array
{
    if ($token === null || $token === '' || strlen($token) < 20) {
        return null;
    }
    $row = db_one(
        'SELECT s.id AS session_id, s.user_id, s.expires_at, s.purpose,
                u.id, u.mobile, u.name, u.business_name, u.email, u.role, u.status,
                u.must_change_password, u.created_at, u.last_login_at
           FROM sessions s
           JOIN users u ON u.id = s.user_id
          WHERE s.token_hash = :hash
            AND s.revoked_at IS NULL
            AND s.expires_at > NOW()
            AND s.purpose = :purpose
          LIMIT 1',
        ['hash' => hash_session_token($token), 'purpose' => $expectedPurpose]
    );

    if ($row === null) {
        return null;
    }
    if (($row['status'] ?? '') !== 'ACTIVE') {
        return null;
    }

    // Sliding expiry: keep active users logged in without rotating the token
    // on every request (rotation happens on login / password change).
    db_exec(
        'UPDATE sessions
            SET last_used_at = NOW(), expires_at = DATE_ADD(NOW(), INTERVAL :ttl SECOND)
          WHERE id = :id',
        ['ttl' => session_ttl_seconds(), 'id' => (int) $row['session_id']]
    );

    return [
        'user' => [
            'id' => (int) $row['id'],
            'mobile' => (string) $row['mobile'],
            'name' => $row['name'],
            'business_name' => $row['business_name'],
            'email' => $row['email'],
            'role' => (string) $row['role'],
            'status' => (string) $row['status'],
            'must_change_password' => (int) ($row['must_change_password'] ?? 0) === 1,
            'created_at' => (string) $row['created_at'],
            'last_login_at' => $row['last_login_at'],
        ],
        'session_id' => (int) $row['session_id'],
    ];
}

function revoke_session_token(string $token): void
{
    db_exec('UPDATE sessions SET revoked_at = NOW() WHERE token_hash = :h AND revoked_at IS NULL', ['h' => hash_session_token($token)]);
}

function revoke_all_sessions(int $userId, ?string $purpose = null): void
{
    if ($purpose === null) {
        db_exec('UPDATE sessions SET revoked_at = NOW() WHERE user_id = :u AND revoked_at IS NULL', ['u' => $userId]);
        return;
    }
    db_exec('UPDATE sessions SET revoked_at = NOW() WHERE user_id = :u AND purpose = :p AND revoked_at IS NULL', ['u' => $userId, 'p' => $purpose]);
}

// ─────────────────────────── Customer (OTP) gateway ─────────────────────────

/** @return array<string,mixed>|null */
function current_user(): ?array
{
    static $cached = false;
    static $user = null;
    if ($cached) {
        return $user;
    }
    $cached = true;
    $resolved = resolve_session($_COOKIE[cookie_name_customer()] ?? null, 'CUSTOMER');
    $user = $resolved['user'] ?? null;
    return $user;
}

/**
 * @return array<string,mixed>
 * @throws ApiException 401
 */
function require_user(): array
{
    $user = current_user();
    if ($user === null) {
        throw err_unauthorized('نشست شما منقضی شده است؛ دوباره وارد شوید');
    }
    return $user;
}

// ───────────────────────────── Admin gateway ────────────────────────────────

function is_admin_role(string $role): bool
{
    return $role === 'ADMIN' || $role === 'SUPER_ADMIN';
}

/** @return array<string,mixed>|null */
function current_admin(): ?array
{
    static $cached = false;
    static $admin = null;
    if ($cached) {
        return $admin;
    }
    $cached = true;
    $resolved = resolve_session($_COOKIE[cookie_name_admin()] ?? null, 'ADMIN');
    $user = $resolved['user'] ?? null;
    $admin = ($user !== null && is_admin_role((string) $user['role'])) ? $user : null;
    return $admin;
}

/**
 * Admin guard for API endpoints: 401 when not authenticated, 403 when the
 * account is not an admin. Authorization is decided by the DB role only.
 *
 * @return array<string,mixed>
 * @throws ApiException
 */
function require_admin(): array
{
    $admin = current_admin();
    if ($admin === null) {
        // Distinguish "no admin session" (401) from "logged in but not admin" (403).
        if (current_user() !== null) {
            throw err_forbidden('برای ورود به پنل مدیریت باید با رمز عبور مدیر وارد شوید');
        }
        throw err_unauthorized('برای دسترسی به پنل مدیریت وارد شوید');
    }
    return $admin;
}

/**
 * @return array<string,mixed>
 * @throws ApiException
 */
function require_super_admin(): array
{
    $admin = require_admin();
    if (($admin['role'] ?? '') !== 'SUPER_ADMIN') {
        throw err_forbidden('این عملیات فقط با دسترسی مدیر ارشد انجام می‌شود');
    }
    return $admin;
}

// ─────────────────────────────── Guest carts ────────────────────────────────

/** Stable anonymous token so guests keep their cart across visits. */
function guest_token(bool $createIfMissing = true): ?string
{
    $name = cookie_name_guest();
    $token = $_COOKIE[$name] ?? '';
    if (is_string($token) && preg_match('/^[A-Za-z0-9_-]{20,64}$/', $token) === 1) {
        return $token;
    }
    if (!$createIfMissing) {
        return null;
    }
    $fresh = random_token(24);
    set_auth_cookie($name, $fresh, 180 * 86400); // 6 months, like a shop basket
    return $fresh;
}

// ─────────────────────────────── Audit trail ────────────────────────────────

/** @param array<string,mixed>|null $metadata */
function record_audit(?int $adminId, string $action, string $entity, ?string $entityId = null, ?array $metadata = null): void
{
    try {
        db_exec(
            'INSERT INTO audit_logs (admin_id, action, entity, entity_id, metadata, ip, user_agent, created_at)
             VALUES (:admin, :action, :entity, :eid, :meta, :ip, :ua, NOW())',
            [
                'admin' => $adminId,
                'action' => $action,
                'entity' => $entity,
                'eid' => $entityId,
                'meta' => $metadata === null ? null : json_encode($metadata, JSON_UNESCAPED_UNICODE),
                'ip' => client_ip(),
                'ua' => client_user_agent(),
            ]
        );
    } catch (Throwable $e) {
        nobel_log('warn', 'audit.write_failed', ['message' => $e->getMessage(), 'action' => $action]);
    }
}
