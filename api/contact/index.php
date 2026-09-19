<?php
/**
 * POST /api/contact/index.php  { name, mobile, subject?, message }
 * Stores a contact message. Rate limited to stop form spam.
 */
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';

handle(['POST'], function (array $body): never {
    $name    = (string) field_string($body, 'name', true, 100);
    $mobile  = field_mobile($body, 'mobile');
    $subject = field_string($body, 'subject', false, 150);
    $message = (string) field_string($body, 'message', true, 1000);

    if (mb_strlen($message) < 5) {
        throw err_validation('متن پیام باید دست‌کم ۵ نویسه باشد');
    }

    rate_limit('contact:ip:' . client_ip(), 5, 600);
    rate_limit('contact:mobile:' . $mobile, 5, 3600);

    db_exec(
        'INSERT INTO contact_messages (name, mobile, subject, message, status, ip, created_at)
         VALUES (:n, :m, :s, :msg, \'NEW\', :ip, NOW())',
        ['n' => $name, 'm' => $mobile, 's' => $subject, 'msg' => $message, 'ip' => client_ip()]
    );

    nobel_log('info', 'contact.received', ['mobile' => $mobile]);
    json_ok(['received' => true], 201, 'پیام شما ثبت شد؛ به‌زودی تماس می‌گیریم');
});
