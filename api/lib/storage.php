<?php
/**
 * Nobel Kids — hardened image upload.
 *
 * Defence in depth, because an uploads directory is the classic way a shared
 * host gets taken over:
 *   1. admin session required (checked by the endpoint)
 *   2. PHP upload error codes handled explicitly
 *   3. hard size cap (config) checked before anything is read
 *   4. real content sniffing with getimagesize()/finfo — NOT the client's
 *      Content-Type and NOT the file extension
 *   5. allow-list of image mime types only
 *   6. server-generated random filename with a forced safe extension, so a
 *      "shell.php.jpg" can never keep its .php part
 *   7. the file is written outside any executable context and the uploads
 *      dir ships with an .htaccess that disables PHP + forces downloads
 *   8. permissions set to 0644 (never 0777)
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
require_once __DIR__ . '/../config/response.php';
require_once __DIR__ . '/pricing.php';

/** mime → canonical extension. Anything not listed is rejected. */
const UPLOAD_ALLOWED_MIME = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp',
    'image/gif' => 'gif',
];

function upload_dir(): string
{
    // An empty value in config.php means "use the default", not "use /".
    $configured = trim((string) cfg('uploads.dir', ''));
    return rtrim($configured !== '' ? $configured : NOBEL_ROOT . '/uploads', '/');
}

function upload_public_base(): string
{
    $configured = trim((string) cfg('uploads.public_path', ''));
    return rtrim($configured !== '' ? $configured : '/uploads', '/');
}

/**
 * Validates and stores one uploaded image.
 *
 * @param array<string,mixed> $file one entry of $_FILES
 * @return array{url:string,path:string,size:int,mime:string,width:int,height:int}
 * @throws ApiException
 */
function store_uploaded_image(array $file): array
{
    $error = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);
    if ($error !== UPLOAD_ERR_OK) {
        throw match ($error) {
            UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => err_validation('حجم فایل بیش از حد مجاز است'),
            UPLOAD_ERR_NO_FILE => err_validation('فایلی انتخاب نشده است'),
            UPLOAD_ERR_PARTIAL => err_validation('آپلود فایل ناقص ماند؛ دوباره تلاش کنید'),
            default => new ApiException('UPLOAD_FAILED', 'آپلود فایل ممکن نشد', 500),
        };
    }

    $tmp = (string) ($file['tmp_name'] ?? '');
    // Guarantees the path really came from a PHP upload (blocks LFI tricks).
    if ($tmp === '' || !is_uploaded_file($tmp)) {
        throw err_validation('فایل ارسالی معتبر نیست');
    }

    $maxBytes = max(1, (int) cfg('uploads.max_bytes', 5 * 1024 * 1024));
    $size = (int) ($file['size'] ?? 0);
    if ($size <= 0 || $size > $maxBytes) {
        throw err_validation(sprintf('حجم تصویر نباید از %s مگابایت بیشتر باشد', number_format_fa((int) round($maxBytes / 1048576))));
    }

    // Real content inspection — the client's mime and filename are ignored.
    $imageInfo = @getimagesize($tmp);
    if ($imageInfo === false) {
        throw err_validation('فایل ارسالی یک تصویر معتبر نیست');
    }
    [$width, $height] = $imageInfo;
    $mime = strtolower((string) ($imageInfo['mime'] ?? ''));

    if (function_exists('finfo_open')) {
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        if ($finfo !== false) {
            $sniffed = strtolower((string) finfo_file($finfo, $tmp));
            finfo_close($finfo);
            // Both detectors must agree.
            if ($sniffed !== $mime) {
                throw err_validation('نوع فایل ارسالی معتبر نیست');
            }
        }
    }

    if (!isset(UPLOAD_ALLOWED_MIME[$mime])) {
        throw err_validation('فقط تصاویر JPG، PNG، WebP و GIF پذیرفته می‌شوند');
    }

    // Reject polyglots: files that are a valid image AND executable script.
    // Scanned before the dimension check so the rejection reason is accurate,
    // and across the whole file (images here are capped at a few MB) because
    // payloads are usually appended after the image data, not prepended.
    $contents = (string) @file_get_contents($tmp);
    foreach (['<?php', '<?=', '<script', '<%'] as $needle) {
        if (stripos($contents, $needle) !== false) {
            nobel_log('warn', 'upload.rejected_polyglot', ['mime' => $mime, 'size' => $size, 'marker' => $needle]);
            throw err_validation('محتوای فایل مجاز نیست');
        }
    }
    unset($contents);

    $maxWidth = max(100, (int) cfg('uploads.max_width', 4000));
    $maxHeight = max(100, (int) cfg('uploads.max_height', 4000));
    if ($width < 10 || $height < 10 || $width > $maxWidth || $height > $maxHeight) {
        throw err_validation(sprintf('ابعاد تصویر باید حداکثر %s×%s پیکسل باشد', number_format_fa($maxWidth), number_format_fa($maxHeight)));
    }

    $extension = UPLOAD_ALLOWED_MIME[$mime];
    $dir = upload_dir() . '/' . date('Y/m');
    if (!is_dir($dir) && !@mkdir($dir, 0755, true) && !is_dir($dir)) {
        nobel_log('error', 'upload.mkdir_failed', ['dir' => $dir]);
        throw new ApiException('UPLOAD_FAILED', 'پوشه آپلود قابل نوشتن نیست', 500);
    }

    // Filename comes entirely from the server: no client string is reused.
    $name = bin2hex(random_bytes(16)) . '.' . $extension;
    $target = $dir . '/' . $name;

    if (!move_uploaded_file($tmp, $target)) {
        nobel_log('error', 'upload.move_failed', ['target' => $target]);
        throw new ApiException('UPLOAD_FAILED', 'ذخیره فایل ممکن نشد', 500);
    }
    @chmod($target, 0644);

    $url = upload_public_base() . '/' . date('Y/m') . '/' . $name;
    nobel_log('info', 'upload.stored', ['url' => $url, 'mime' => $mime, 'size' => $size]);

    return [
        'url' => $url,
        'path' => $target,
        'size' => $size,
        'mime' => $mime,
        'width' => (int) $width,
        'height' => (int) $height,
    ];
}
