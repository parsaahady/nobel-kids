<?php
/**
 * POST /api/admin/upload.php   multipart/form-data, field "files" (max 8)
 *
 * Admin-only image upload. Returns { files: [{ url, ... }] } — exactly what
 * components/admin/ProductForm.tsx already expects.
 *
 * Note: this endpoint reads multipart form data, so it does NOT use the JSON
 * body helper; CSRF is still enforced by the shared same-origin check.
 */
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/storage.php';

handle(['POST'], function (): never {
    $admin = require_admin();
    rate_limit('upload:admin:' . $admin['id'], 60, 600);

    if (empty($_FILES['files'])) {
        throw err_validation('فایلی ارسال نشده است');
    }

    // Normalise both the single-file and files[] shapes into one list.
    $entries = [];
    $raw = $_FILES['files'];
    if (is_array($raw['name'])) {
        $count = count($raw['name']);
        for ($i = 0; $i < $count; $i++) {
            $entries[] = [
                'name' => $raw['name'][$i],
                'type' => $raw['type'][$i],
                'tmp_name' => $raw['tmp_name'][$i],
                'error' => $raw['error'][$i],
                'size' => $raw['size'][$i],
            ];
        }
    } else {
        $entries[] = $raw;
    }

    if (count($entries) > 8) {
        throw err_validation('حداکثر ۸ تصویر در هر بار قابل بارگذاری است');
    }

    $stored = [];
    foreach ($entries as $entry) {
        $result = store_uploaded_image($entry);
        $stored[] = ['url' => $result['url'], 'size' => $result['size'], 'mime' => $result['mime'], 'width' => $result['width'], 'height' => $result['height']];
    }

    record_audit((int) $admin['id'], 'admin.upload', 'media', null, ['count' => count($stored)]);
    json_ok(['files' => $stored], 201, 'تصاویر بارگذاری شدند');
});
