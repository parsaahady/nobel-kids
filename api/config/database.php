<?php
/**
 * Nobel Kids — PDO / MySQL access layer.
 *
 * Rules enforced here:
 *   • PDO only, ERRMODE_EXCEPTION, real prepared statements (no emulation).
 *   • Every query is parameterised — user input is NEVER concatenated into SQL.
 *   • Credentials live in config/config.php and are never echoed to the client.
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

require_once __DIR__ . '/app.php';

/** Shared PDO connection (lazily created once per request). */
function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $host    = (string) cfg('db.host', 'localhost');
    $port    = (int) cfg('db.port', 3306);
    $name    = (string) cfg('db.name', '');
    $user    = (string) cfg('db.user', '');
    $pass    = (string) cfg('db.password', '');
    $charset = (string) cfg('db.charset', 'utf8mb4');

    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $host, $port, $name, $charset);

    try {
        $pdo = new PDO($dsn, $user, $pass, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,   // real server-side prepares
            PDO::ATTR_STRINGIFY_FETCHES  => false,
        ]);
        // Strict mode so silent truncation/invalid dates become real errors.
        $pdo->exec("SET SESSION sql_mode='STRICT_ALL_TABLES,NO_ENGINE_SUBSTITUTION'");
        $pdo->exec("SET time_zone = '+03:30'");
    } catch (PDOException $e) {
        // Log the real reason server-side; show a friendly Persian message.
        nobel_log('error', 'db.connect_failed', ['message' => $e->getMessage(), 'host' => $host, 'db' => $name]);
        nobel_fail_hard(
            'DB_UNAVAILABLE',
            'اتصال به پایگاه داده برقرار نشد؛ لطفاً چند لحظه بعد دوباره تلاش کنید.',
            503
        );
    }

    return $pdo;
}

/**
 * Expands a named placeholder that appears more than once.
 *
 * With EMULATE_PREPARES=false the MySQL driver uses real server-side
 * placeholders, and those are positional: reusing :q three times in one
 * statement raises "Invalid parameter number". Rather than forcing every
 * caller to invent :q1/:q2/:q3, we rewrite the SQL here and fan the value out.
 * Keeping this in one place means all call sites stay readable AND every query
 * in the codebase remains a true prepared statement (no string interpolation).
 *
 * @param array<string|int,mixed> $params
 * @return array{0:string,1:array<string|int,mixed>}
 */
function db_expand_repeated_params(string $sql, array $params): array
{
    foreach ($params as $key => $value) {
        if (is_int($key)) {
            continue;
        }
        $name = ltrim((string) $key, ':');
        // Count real occurrences (word boundary stops :q matching :qexact).
        $pattern = '/:' . preg_quote($name, '/') . '\b/';
        $count = preg_match_all($pattern, $sql);
        if ($count === false || $count < 2) {
            continue;
        }

        $index = 0;
        $sql = (string) preg_replace_callback(
            $pattern,
            static function () use (&$index, $name, &$params, $value): string {
                $index++;
                $alias = $name . '__r' . $index;
                $params[$alias] = $value;
                return ':' . $alias;
            },
            $sql
        );
        unset($params[$key]);
    }
    return [$sql, $params];
}

/**
 * Prepared query helper. Every statement in this application goes through here,
 * so user input is ALWAYS bound, never concatenated into SQL.
 *
 * @param array<string|int,mixed> $params
 */
function db_query(string $sql, array $params = []): PDOStatement
{
    [$sql, $params] = db_expand_repeated_params($sql, $params);

    $stmt = db()->prepare($sql);
    foreach ($params as $key => $value) {
        $param = is_int($key) ? $key + 1 : (str_starts_with((string) $key, ':') ? $key : ':' . $key);
        $type = match (true) {
            is_int($value)  => PDO::PARAM_INT,
            is_bool($value) => PDO::PARAM_BOOL,
            $value === null => PDO::PARAM_NULL,
            default         => PDO::PARAM_STR,
        };
        $stmt->bindValue($param, $value, $type);
    }
    $stmt->execute();
    return $stmt;
}

/**
 * @param array<string|int,mixed> $params
 * @return array<string,mixed>|null
 */
function db_one(string $sql, array $params = []): ?array
{
    $row = db_query($sql, $params)->fetch();
    return $row === false ? null : $row;
}

/**
 * @param array<string|int,mixed> $params
 * @return list<array<string,mixed>>
 */
function db_all(string $sql, array $params = []): array
{
    /** @var list<array<string,mixed>> $rows */
    $rows = db_query($sql, $params)->fetchAll();
    return $rows;
}

/**
 * Single scalar value.
 *
 * @param array<string|int,mixed> $params
 */
function db_value(string $sql, array $params = []): mixed
{
    $value = db_query($sql, $params)->fetchColumn();
    return $value === false ? null : $value;
}

/**
 * @param array<string|int,mixed> $params
 */
function db_exec(string $sql, array $params = []): int
{
    return db_query($sql, $params)->rowCount();
}

function db_last_id(): int
{
    return (int) db()->lastInsertId();
}

/**
 * Runs a callback inside a transaction; rolls back on any exception.
 * Nested calls reuse the outer transaction (savepoint-free, good enough here).
 *
 * @template T
 * @param callable(PDO):T $callback
 * @return T
 */
function db_transaction(callable $callback): mixed
{
    $pdo = db();
    if ($pdo->inTransaction()) {
        return $callback($pdo);
    }
    $pdo->beginTransaction();
    try {
        $result = $callback($pdo);
        $pdo->commit();
        return $result;
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
}

/** True when the exception is a duplicate-key (unique index) violation. */
function db_is_duplicate(Throwable $e): bool
{
    return $e instanceof PDOException && ($e->errorInfo[1] ?? 0) === 1062;
}
