#!/bin/sh
# ═══════════════════════════════════════════════════════════════════════════
# Nobel Kids — container entrypoint
#
# Runs before Apache starts, every time the container boots:
#
#   1. Generate a PERSISTENT app.secret (once) so sessions survive restarts
#   2. Write config/config.php from the env-driven template (if absent)
#   3. Wait for MySQL to accept connections
#   4. Import schema.sql + seed.sql the first time only
#   5. Fix ownership on the mounted volumes
#
# Everything is idempotent: restarting never wipes data or re-seeds.
# ═══════════════════════════════════════════════════════════════════════════
set -e

APP_DIR=/var/www/html
STATE_DIR="$APP_DIR/storage"

log() { echo "[nobel] $*"; }

# ─────────────────── 1. Persistent application secret ───────────────────────
# app.secret signs sessions and hashes OTP codes. If it changed on every boot,
# every logged-in user would be kicked out. Generate once, store in the
# storage/ volume, reuse forever. An explicit APP_SECRET env always wins.
SECRET_FILE="$STATE_DIR/.app_secret"
mkdir -p "$STATE_DIR/logs"

if [ -z "${APP_SECRET:-}" ]; then
    if [ -f "$SECRET_FILE" ]; then
        APP_SECRET=$(cat "$SECRET_FILE")
    else
        APP_SECRET=$(php -r 'echo bin2hex(random_bytes(32));')
        printf '%s' "$APP_SECRET" > "$SECRET_FILE"
        chmod 600 "$SECRET_FILE"
        log "generated a new app.secret (stored in the storage volume)"
    fi
    export APP_SECRET
fi

# ─────────────────── 2. Configuration file ──────────────────────────────────
# A user-supplied config/config.php (bind-mounted) is always respected.
if [ -f "$APP_DIR/config/config.php" ]; then
    log "using the existing config/config.php"
else
    cp "$APP_DIR/config/config.docker.php" "$APP_DIR/config/config.php"
    log "created config/config.php from the Docker template (reads env vars)"
fi
chown www-data:www-data "$APP_DIR/config/config.php" 2>/dev/null || true
chmod 640 "$APP_DIR/config/config.php" 2>/dev/null || true

# ─────────────────── 3. Wait for the database ───────────────────────────────
DB_HOST="${DB_HOST:-db}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_NAME:-nobel_kids}"
DB_USER="${DB_USER:-nobel}"
DB_PASSWORD="${DB_PASSWORD:-nobel}"

if [ "${SKIP_DB_WAIT:-0}" != "1" ]; then
    log "waiting for MySQL at $DB_HOST:$DB_PORT ..."
    attempt=0
    max_attempts=60
    until php -r '
        $h=getenv("DB_HOST"); $p=(int)getenv("DB_PORT");
        $u=getenv("DB_USER"); $w=getenv("DB_PASSWORD"); $d=getenv("DB_NAME");
        try { new PDO("mysql:host=$h;port=$p;dbname=$d", $u, $w, [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]); exit(0); }
        catch (Throwable $e) { exit(1); }
    ' 2>/dev/null; do
        attempt=$((attempt + 1))
        if [ "$attempt" -ge "$max_attempts" ]; then
            log "ERROR: database not reachable after ${max_attempts}s."
            log "       Check DB_HOST/DB_USER/DB_PASSWORD and that the db service is healthy."
            exit 1
        fi
        sleep 1
    done
    log "database is up"
fi

# ─────────────────── 4. Schema and seed (first boot only) ───────────────────
# "Has the schema been imported?" is answered by counting real tables, not by a
# marker file — so a fresh database with an old volume still gets set up.
TABLE_COUNT=$(php -r '
    $h=getenv("DB_HOST"); $p=(int)getenv("DB_PORT");
    $u=getenv("DB_USER"); $w=getenv("DB_PASSWORD"); $d=getenv("DB_NAME");
    try {
        $pdo = new PDO("mysql:host=$h;port=$p;dbname=$d", $u, $w, [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
        $n = $pdo->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = \"BASE TABLE\"")->fetchColumn();
        echo (int) $n;
    } catch (Throwable $e) { echo "-1"; }
' 2>/dev/null || echo "-1")

if [ "$TABLE_COUNT" -lt 20 ] 2>/dev/null; then
    log "database looks empty ($TABLE_COUNT tables) — importing schema.sql"
    mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$APP_DIR/database/schema.sql"
    log "schema imported"

    if [ "${SKIP_SEED:-0}" != "1" ]; then
        log "importing seed.sql (products, categories, settings)"
        mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$APP_DIR/database/seed.sql"
        log "seed imported"
    else
        log "SKIP_SEED=1 — skipping seed data"
    fi
else
    log "schema already present ($TABLE_COUNT tables) — skipping import"
fi

# ─────────────────── 5. Optional admin bootstrap ────────────────────────────
# seed.sql intentionally ships the admin with NO password. Setting
# ADMIN_MOBILE + ADMIN_PASSWORD lets you bootstrap non-interactively.
# Without them, use the /rescue/ panel (set RESCUE_TOKEN) as documented.
if [ -n "${ADMIN_MOBILE:-}" ] && [ -n "${ADMIN_PASSWORD:-}" ]; then
    php -r '
        require "/var/www/html/api/config/database.php";
        require "/var/www/html/api/config/security.php";
        $mobile = getenv("ADMIN_MOBILE");
        $password = getenv("ADMIN_PASSWORD");
        if (strlen($password) < 8) {
            fwrite(STDERR, "[nobel] ADMIN_PASSWORD is shorter than 8 characters — refusing.\n");
            exit(0);
        }
        $existing = db_one("SELECT id, password_hash FROM users WHERE mobile = :m", ["m" => $mobile]);
        if ($existing && $existing["password_hash"] !== null) {
            echo "[nobel] admin $mobile already has a password — left untouched\n";
            exit(0);
        }
        if ($existing) {
            db_exec("UPDATE users SET password_hash = :h, role = \"SUPER_ADMIN\", status = \"ACTIVE\", must_change_password = 0 WHERE id = :id",
                ["h" => hash_admin_password($password), "id" => (int) $existing["id"]]);
        } else {
            db_exec("INSERT INTO users (mobile, name, role, status, password_hash, must_change_password, created_at, updated_at)
                     VALUES (:m, :n, \"SUPER_ADMIN\", \"ACTIVE\", :h, 0, NOW(), NOW())",
                ["m" => $mobile, "n" => "مدیر", "h" => hash_admin_password($password)]);
        }
        echo "[nobel] admin password set for $mobile\n";
    ' || log "WARNING: admin bootstrap failed (continuing)"
fi

# ─────────────────── 6. Volume ownership ────────────────────────────────────
# Named volumes mount as root; Apache runs as www-data and must be able to
# write uploads and logs.
chown -R www-data:www-data "$APP_DIR/uploads" "$APP_DIR/storage" 2>/dev/null || true
chmod -R 755 "$APP_DIR/uploads" "$APP_DIR/storage" 2>/dev/null || true

log "ready — starting $*"
exec "$@"
