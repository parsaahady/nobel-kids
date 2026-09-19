<?php
/**
 * POST /api/cart/items.php  { productId, packMode, colorName, sizeLabel, packCount }
 *
 * Adds a pack line. The server independently verifies that the product is
 * purchasable, that the colour/size combination really exists, and that stock
 * is sufficient — the client cannot inject prices or bypass the pack rules.
 */
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/cart.php';

handle(['POST'], function (array $body): never {
    $productId = (string) field_string($body, 'productId', true, 40);
    if (!ctype_digit($productId)) {
        throw err_validation('شناسه محصول معتبر نیست');
    }
    $packMode  = field_enum($body, 'packMode', ['assorted', 'single']);
    $colorName = (string) field_string($body, 'colorName', true, 60);
    $sizeLabel = (string) field_string($body, 'sizeLabel', true, 60);
    $packCount = field_int($body, 'packCount', true, 1, 500);

    $cartId = current_cart_id(true);
    cart_add_item($cartId, (int) $productId, (string) $packMode, $colorName, $sizeLabel, (int) $packCount);

    json_ok(cart_to_dto($cartId), 201, 'به سبد خرید اضافه شد');
});
