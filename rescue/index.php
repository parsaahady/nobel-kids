<?php
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Nobel Kids — پنل نجات (emergency rescue panel)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * A single self-contained PHP page for the two situations where the React
 * admin cannot help you:
 *
 *   1. Nobody can log in     → set a new admin password
 *   2. "Something is broken" → check DB connectivity, schema and permissions
 *
 * ACCESS CONTROL
 * --------------
 * This page is protected by a rescue token that you put in config/config.php:
 *
 *     'security' => [ 'rescue_token' => '<a long random string>' ],
 *
 * If the token is missing or left empty the panel refuses to run at all.
 * Attempts are rate limited (5 per 15 minutes per IP) and every action is
 * written to audit_logs.
 *
 * ⚠  DELETE THIS FOLDER once the emergency is over. It is a deliberate
 *    back door and should not live on a healthy production site.
 */

declare(strict_types=1);

require_once __DIR__ . '/../api/config/app.php';
require_once __DIR__ . '/../api/config/database.php';
require_once __DIR__ . '/../api/config/security.php';

security_headers();
header('Content-Type: text/html; charset=utf-8');

$configuredToken = (string) cfg('security.rescue_token', '');
$ip = client_ip();

/** @var list<array{type:string,text:string}> $messages */
$messages = [];
$authenticated = false;

// ───────────────────────── Gate 1: the panel must be enabled ────────────────
$panelEnabled = strlen($configuredToken) >= 16;

// ───────────────────────── Gate 2: token check ──────────────────────────────
$submittedToken = (string) ($_POST['rescue_token'] ?? '');
if ($panelEnabled && $submittedToken !== '') {
    try {
        rate_limit('rescue:' . $ip, 5, 900);
        if (hash_equals($configuredToken, $submittedToken)) {
            $authenticated = true;
        } else {
            rate_limit('rescue:' . $ip, 5, 900);
            $messages[] = ['type' => 'error', 'text' => 'توکن نجات نادرست است.'];
            nobel_log('warn', 'rescue.bad_token', ['ip' => $ip]);
        }
    } catch (Throwable $e) {
        $messages[] = ['type' => 'error', 'text' => 'تعداد تلاش‌ها بیش از حد مجاز است؛ ۱۵ دقیقه صبر کنید.'];
    }
}

$action = (string) ($_POST['action'] ?? '');

// ─────────────────────────── Action: reset password ─────────────────────────
if ($authenticated && $action === 'reset_password') {
    try {
        $mobile = normalize_mobile((string) ($_POST['mobile'] ?? ''));
        $password = (string) ($_POST['new_password'] ?? '');
        $confirm = (string) ($_POST['confirm_password'] ?? '');

        if (!is_valid_mobile($mobile)) {
            throw new RuntimeException('شماره موبایل معتبر نیست.');
        }
        if (strlen($password) < 10) {
            throw new RuntimeException('رمز جدید باید دست‌کم ۱۰ نویسه باشد.');
        }
        if ($password !== $confirm) {
            throw new RuntimeException('رمز جدید و تکرار آن یکسان نیستند.');
        }

        $user = db_one('SELECT id, role, name FROM users WHERE mobile = :m LIMIT 1', ['m' => $mobile]);
        if ($user === null) {
            throw new RuntimeException('کاربری با این شماره یافت نشد. ابتدا در phpMyAdmin کاربر را بسازید یا seed.sql را وارد کنید.');
        }

        $userId = (int) $user['id'];
        $role = (string) $user['role'];
        $promoted = false;
        if ($role !== 'ADMIN' && $role !== 'SUPER_ADMIN') {
            db_exec("UPDATE users SET role = 'SUPER_ADMIN' WHERE id = :id", ['id' => $userId]);
            $promoted = true;
        }

        db_exec(
            "UPDATE users SET password_hash = :h, must_change_password = 0, status = 'ACTIVE', updated_at = NOW() WHERE id = :id",
            ['h' => hash_admin_password($password), 'id' => $userId]
        );

        // Kick every existing admin session: if an attacker was inside, they are out now.
        db_exec("UPDATE sessions SET revoked_at = NOW() WHERE user_id = :id AND purpose = 'ADMIN' AND revoked_at IS NULL", ['id' => $userId]);

        // Clear the admin login lockout for this identifier.
        db_exec('DELETE FROM rate_limits WHERE bucket_key LIKE :k', ['k' => 'admin-login:%' . $mobile]);

        db_exec(
            'INSERT INTO audit_logs (admin_id, action, entity, entity_id, metadata, ip, created_at)
             VALUES (:a, :act, \'auth\', :eid, :meta, :ip, NOW())',
            [
                'a' => $userId, 'act' => 'rescue.password_reset', 'eid' => (string) $userId,
                'meta' => json_encode(['promoted' => $promoted], JSON_UNESCAPED_UNICODE), 'ip' => $ip,
            ]
        );
        nobel_log('warn', 'rescue.password_reset', ['userId' => $userId, 'ip' => $ip]);

        $messages[] = ['type' => 'success', 'text' => 'رمز عبور با موفقیت تغییر کرد.'
            . ($promoted ? ' این کاربر به «مدیر ارشد» ارتقا یافت.' : '')
            . ' اکنون از /admin وارد شوید و سپس پوشه rescue را حذف کنید.'];
    } catch (Throwable $e) {
        $messages[] = ['type' => 'error', 'text' => $e->getMessage()];
    }
}

// ─────────────────────────── Action: health check ───────────────────────────
/** @var list<array{label:string,ok:bool,detail:string}> $checks */
$checks = [];
if ($authenticated && $action === 'health_check') {
    $checks[] = ['label' => 'نسخه PHP', 'ok' => PHP_VERSION_ID >= 80100, 'detail' => PHP_VERSION . (PHP_VERSION_ID >= 80100 ? ' (مناسب)' : ' — حداقل ۸.۱ لازم است')];

    foreach (['pdo_mysql' => 'اتصال به دیتابیس', 'mbstring' => 'پردازش متن فارسی', 'json' => 'JSON', 'gd' => 'پردازش تصویر', 'curl' => 'پیامک و درگاه پرداخت', 'openssl' => 'رمزنگاری'] as $ext => $why) {
        $loaded = extension_loaded($ext);
        $checks[] = ['label' => 'افزونه ' . $ext, 'ok' => $loaded, 'detail' => $loaded ? 'فعال — ' . $why : 'غیرفعال! لازم برای: ' . $why];
    }

    try {
        db_value('SELECT 1');
        $checks[] = ['label' => 'اتصال به دیتابیس', 'ok' => true, 'detail' => 'برقرار'];

        $tables = (int) db_value("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'");
        $checks[] = ['label' => 'جدول‌های دیتابیس', 'ok' => $tables >= 20, 'detail' => $tables . ' جدول' . ($tables >= 20 ? '' : ' — schema.sql را وارد کنید')];

        $products = (int) db_value('SELECT COUNT(*) FROM products WHERE deleted_at IS NULL');
        $checks[] = ['label' => 'محصولات', 'ok' => $products > 0, 'detail' => $products . ' محصول' . ($products > 0 ? '' : ' — seed.sql را وارد کنید')];

        $admins = (int) db_value("SELECT COUNT(*) FROM users WHERE role IN ('ADMIN','SUPER_ADMIN') AND password_hash IS NOT NULL");
        $checks[] = ['label' => 'مدیر فعال', 'ok' => $admins > 0, 'detail' => $admins . ' مدیر با رمز' . ($admins > 0 ? '' : ' — از همین صفحه رمز تعیین کنید')];

        $badTables = (int) db_value("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE' AND (engine <> 'InnoDB' OR table_collation <> 'utf8mb4_unicode_ci')");
        $checks[] = ['label' => 'موتور و کدگذاری', 'ok' => $badTables === 0, 'detail' => $badTables === 0 ? 'همه جدول‌ها InnoDB / utf8mb4' : $badTables . ' جدول نامنطبق'];

        $orders = (int) db_value('SELECT COUNT(*) FROM orders');
        $checks[] = ['label' => 'سفارش‌ها', 'ok' => true, 'detail' => $orders . ' سفارش ثبت شده'];
    } catch (Throwable $e) {
        $checks[] = ['label' => 'اتصال به دیتابیس', 'ok' => false, 'detail' => 'ناموفق: ' . $e->getMessage()];
    }

    $uploadDir = NOBEL_ROOT . '/uploads';
    $configured = trim((string) cfg('uploads.dir', ''));
    if ($configured !== '') {
        $uploadDir = $configured;
    }
    $writable = is_dir($uploadDir) && is_writable($uploadDir);
    $checks[] = ['label' => 'پوشه uploads', 'ok' => $writable, 'detail' => $writable ? 'قابل نوشتن' : $uploadDir . ' — دسترسی ۷۵۵ بدهید'];

    $htaccess = is_file($uploadDir . '/.htaccess');
    $checks[] = ['label' => 'محافظت uploads', 'ok' => $htaccess, 'detail' => $htaccess ? 'فایل .htaccess موجود است' : 'خطر! uploads/.htaccess را آپلود کنید'];

    $logDir = nobel_log_dir();
    $logOk = is_dir($logDir) && is_writable($logDir);
    $checks[] = ['label' => 'پوشه لاگ', 'ok' => $logOk, 'detail' => $logOk ? 'قابل نوشتن' : $logDir . ' — دسترسی ۷۵۵ بدهید'];

    $isProd = nobel_is_production();
    $checks[] = ['label' => 'حالت اجرا', 'ok' => $isProd, 'detail' => $isProd ? 'production (درست)' : 'development — در سایت واقعی به production تغییر دهید'];

    $secret = (string) cfg('app.secret', '');
    $secretOk = strlen($secret) >= 32 && !str_contains($secret, 'CHANGE_ME');
    $checks[] = ['label' => 'کلید امنیتی', 'ok' => $secretOk, 'detail' => $secretOk ? 'تنظیم شده' : 'app.secret را به یک رشته تصادفی بلند تغییر دهید'];

    $https = str_starts_with(nobel_site_url(), 'https://');
    $checks[] = ['label' => 'HTTPS', 'ok' => $https, 'detail' => $https ? 'فعال' : 'app.url با https شروع نمی‌شود — کوکی‌ها بدون Secure ارسال می‌شوند'];

    $exposeOtp = (bool) cfg('otp.expose_dev_code', false);
    $checks[] = ['label' => 'کد OTP در پاسخ', 'ok' => !$exposeOtp || !$isProd, 'detail' => $exposeOtp ? ($isProd ? 'در production نادیده گرفته می‌شود' : 'فعال (فقط برای توسعه)') : 'غیرفعال'];
}
?>
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive">
<title>پنل نجات — نوبل کیدز</title>
<style>
  :root { --bg:#0f1115; --card:#181b22; --line:#2a2f3a; --txt:#e8eaf0; --mut:#9aa3b2;
          --ok:#3ecf8e; --err:#ff6b6b; --warn:#ffb648; --accent:#7aa2f7; }
  * { box-sizing:border-box; }
  body { margin:0; padding:24px 16px; background:var(--bg); color:var(--txt);
         font-family:Tahoma,"Segoe UI",system-ui,sans-serif; line-height:1.8; font-size:15px; }
  .wrap { max-width:720px; margin:0 auto; }
  h1 { font-size:22px; margin:0 0 4px; }
  h2 { font-size:17px; margin:0 0 14px; padding-bottom:10px; border-bottom:1px solid var(--line); }
  .sub { color:var(--mut); font-size:13px; margin-bottom:22px; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:20px; margin-bottom:18px; }
  label { display:block; font-size:13px; color:var(--mut); margin:12px 0 5px; }
  input { width:100%; padding:11px 13px; border-radius:8px; border:1px solid var(--line);
          background:#11141a; color:var(--txt); font-family:inherit; font-size:14px; }
  input:focus { outline:none; border-color:var(--accent); }
  button { margin-top:16px; padding:11px 22px; border-radius:8px; border:0; cursor:pointer;
           background:var(--accent); color:#0b0d12; font-weight:700; font-family:inherit; font-size:14px; }
  button:hover { filter:brightness(1.1); }
  button.ghost { background:transparent; color:var(--accent); border:1px solid var(--accent); }
  .msg { padding:12px 14px; border-radius:8px; margin-bottom:12px; font-size:14px; }
  .msg.success { background:rgba(62,207,142,.12); border:1px solid var(--ok); color:var(--ok); }
  .msg.error { background:rgba(255,107,107,.12); border:1px solid var(--err); color:var(--err); }
  .note { background:rgba(255,182,72,.1); border:1px solid var(--warn); color:var(--warn);
          padding:12px 14px; border-radius:8px; font-size:13px; margin-bottom:18px; }
  table { width:100%; border-collapse:collapse; font-size:14px; }
  td { padding:9px 4px; border-bottom:1px solid var(--line); vertical-align:top; }
  td:first-child { width:34%; color:var(--mut); }
  .pill { display:inline-block; min-width:62px; text-align:center; padding:2px 10px;
          border-radius:20px; font-size:12px; font-weight:700; }
  .pill.ok { background:rgba(62,207,142,.15); color:var(--ok); }
  .pill.no { background:rgba(255,107,107,.15); color:var(--err); }
  code { background:#11141a; padding:2px 6px; border-radius:4px; font-size:13px; direction:ltr;
         display:inline-block; }
  .row { display:flex; gap:10px; flex-wrap:wrap; }
  .row form { flex:1; min-width:200px; }
</style>
</head>
<body>
<div class="wrap">
  <h1>🛟 پنل نجات نوبل کیدز</h1>
  <p class="sub">فقط برای مواقع اضطراری — بازیابی رمز مدیر و بررسی سلامت سرور</p>

<?php if (!$panelEnabled): ?>
  <div class="card">
    <h2>این پنل غیرفعال است</h2>
    <p>برای فعال‌سازی، یک توکن تصادفی و طولانی در <code>config/config.php</code> قرار دهید:</p>
    <p><code>'security' =&gt; [ 'rescue_token' =&gt; '...' ],</code></p>
    <p class="sub">برای ساخت توکن این دستور را اجرا کنید:<br>
      <code>php -r "echo bin2hex(random_bytes(32));"</code><br>
      یا در DirectAdmin از بخش «Random Password» یک رشته طولانی بسازید.</p>
  </div>

<?php elseif (!$authenticated): ?>
  <?php foreach ($messages as $m): ?>
    <div class="msg <?= e($m['type']) ?>"><?= e($m['text']) ?></div>
  <?php endforeach; ?>
  <div class="card">
    <h2>ورود با توکن نجات</h2>
    <form method="post" autocomplete="off">
      <label for="t">توکن نجات (از فایل config.php)</label>
      <input id="t" type="password" name="rescue_token" required autofocus>
      <button type="submit">ورود</button>
    </form>
    <p class="sub" style="margin-top:14px">حداکثر ۵ تلاش در هر ۱۵ دقیقه. همه تلاش‌ها ثبت می‌شوند.</p>
  </div>

<?php else: ?>
  <div class="note">
    ⚠ پس از رفع مشکل، پوشه <code>rescue/</code> را از هاست حذف کنید.
  </div>

  <?php foreach ($messages as $m): ?>
    <div class="msg <?= e($m['type']) ?>"><?= e($m['text']) ?></div>
  <?php endforeach; ?>

  <div class="card">
    <h2>۱) تعیین رمز عبور مدیر</h2>
    <p class="sub">اگر کاربر مدیر نباشد، به «مدیر ارشد» ارتقا می‌یابد. همه نشست‌های باز مدیریت بسته می‌شوند.</p>
    <form method="post" autocomplete="off">
      <input type="hidden" name="rescue_token" value="<?= e($submittedToken) ?>">
      <input type="hidden" name="action" value="reset_password">
      <label for="m">شماره موبایل مدیر</label>
      <input id="m" type="text" name="mobile" inputmode="tel" placeholder="09121234567" required>
      <label for="p">رمز عبور جدید (حداقل ۱۰ نویسه)</label>
      <input id="p" type="password" name="new_password" minlength="10" required>
      <label for="c">تکرار رمز عبور جدید</label>
      <input id="c" type="password" name="confirm_password" minlength="10" required>
      <button type="submit">تغییر رمز عبور</button>
    </form>
  </div>

  <div class="card">
    <h2>۲) بررسی سلامت سیستم</h2>
    <form method="post">
      <input type="hidden" name="rescue_token" value="<?= e($submittedToken) ?>">
      <input type="hidden" name="action" value="health_check">
      <button type="submit" class="ghost">اجرای بررسی</button>
    </form>
    <?php if ($checks !== []): ?>
      <table style="margin-top:18px">
        <?php foreach ($checks as $c): ?>
          <tr>
            <td><?= e($c['label']) ?></td>
            <td>
              <span class="pill <?= $c['ok'] ? 'ok' : 'no' ?>"><?= $c['ok'] ? 'سالم' : 'ایراد' ?></span>
              <span style="margin-right:8px"><?= e($c['detail']) ?></span>
            </td>
          </tr>
        <?php endforeach; ?>
      </table>
    <?php endif; ?>
  </div>
<?php endif; ?>

  <p class="sub" style="text-align:center">نوبل کیدز — پنل نجات نسخه ۱.۰</p>
</div>
</body>
</html>
