<?php
/**
 * GET    /api/cart/index.php  → current cart (guest or logged-in)
 * DELETE /api/cart/index.php  → empty the cart
 *
 * Guests get an httpOnly nbl_guest cookie; after login the guest cart is
 * merged automatically by verify-otp.php.
 */
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/cart.php';

handle(['GET', 'DELETE'], function (): never {
    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        $cartId = current_cart_id(false);
        if ($cartId !== null) {
            cart_clear($cartId);
        }
        json_ok(cart_to_dto($cartId));
    }

    json_ok(cart_to_dto(current_cart_id(false)));
});
