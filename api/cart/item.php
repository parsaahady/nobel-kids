<?php
/**
 * PATCH  /api/cart/item.php?id=<cartItemId>   { packCount }   (0 = remove)
 * DELETE /api/cart/item.php?id=<cartItemId>
 *
 * Ownership is enforced by cart id, so one shopper can never touch another's
 * line even by guessing the numeric id.
 */
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/cart.php';

handle(['PATCH', 'DELETE'], function (array $body): never {
    $id = query_string_param('id', null, 40);
    if ($id === null || !ctype_digit($id)) {
        throw err_validation('شناسه ردیف سبد معتبر نیست');
    }
    $itemId = (int) $id;

    $cartId = current_cart_id(false);
    if ($cartId === null) {
        throw err_not_found('سبد خریدی یافت نشد');
    }

    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        cart_remove_item($cartId, $itemId);
        json_ok(cart_to_dto($cartId), 200, 'از سبد حذف شد');
    }

    $packCount = field_int($body, 'packCount', true, 0, 500);
    cart_update_item($cartId, $itemId, (int) $packCount);
    json_ok(cart_to_dto($cartId));
});
