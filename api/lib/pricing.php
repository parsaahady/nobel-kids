<?php
/**
 * Nobel Kids — wholesale pricing engine (SERVER AUTHORITY).
 *
 * This is an exact port of lib/pricing.ts. The browser mirrors the same maths
 * for display only; every amount that is stored or charged is computed HERE
 * from live database values. No price, discount, quantity, stock or total is
 * ever accepted from the client.
 *
 * Business rules preserved verbatim from the original application:
 *   • PACK_SIZE          = 5 pieces per pack (per-product override allowed)
 *   • minimum order      = 1 pack  → 5 pieces  (quantities are multiples of 5)
 *   • default tiers      = 3+ packs → 4% off, 6+ packs → 8% off
 *   • rounding           = unit price rounded to the nearest 1,000 Toman
 *   • line total         = unitPrice × packSize × packCount
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

const PACK_SIZE = 5;

/** Default stepped wholesale discounts: 3+ packs → 4%, 6+ packs → 8%. */
const DEFAULT_TIERS = [
    ['minPacks' => 3, 'discountBps' => 400],
    ['minPacks' => 6, 'discountBps' => 800],
];

/** Money is always rounded to the nearest 1000 Toman — same rule as the TS engine. */
function round_money(float $amount): int
{
    // PHP's round() is half-away-from-zero, matching JS Math.round for positives.
    return (int) (round($amount / 1000) * 1000);
}

/**
 * @param list<array{minPacks:int,discountBps:int}>|null $tiers
 * @return list<array{minPacks:int,discountBps:int}>
 */
function effective_tiers(?array $tiers): array
{
    return ($tiers !== null && count($tiers) > 0) ? $tiers : DEFAULT_TIERS;
}

/**
 * Best applicable discount (basis points) for a pack count.
 *
 * @param list<array{minPacks:int,discountBps:int}>|null $tiers
 */
function tier_discount_bps(int $packCount, ?array $tiers = null): int
{
    $best = 0;
    foreach (effective_tiers($tiers) as $tier) {
        if ($packCount >= (int) $tier['minPacks']) {
            $best = max($best, (int) $tier['discountBps']);
        }
    }
    return $best;
}

/**
 * Price per piece after the tier discount.
 *
 * @param list<array{minPacks:int,discountBps:int}>|null $tiers
 */
function wholesale_unit_price(int $basePrice, int $packCount, ?array $tiers = null): int
{
    $bps = tier_discount_bps($packCount, $tiers);
    return round_money($basePrice * (1 - $bps / 10000));
}

/** @param list<array{minPacks:int,discountBps:int}>|null $tiers */
function wholesale_line_total(int $basePrice, int $packCount, int $packSize, ?array $tiers = null): int
{
    return wholesale_unit_price($basePrice, $packCount, $tiers) * $packSize * $packCount;
}

function base_line_total(int $basePrice, int $packCount, int $packSize): int
{
    return $basePrice * $packSize * $packCount;
}

/**
 * Coupon maths — mirrors the client-side couponDiscount().
 *
 * @param array{type:string,value:int,maxDiscount:?int,minOrderTotal:?int} $coupon
 */
function coupon_discount_amount(array $coupon, int $subtotal): int
{
    $min = $coupon['minOrderTotal'] ?? null;
    if ($min !== null && $min > 0 && $subtotal < $min) {
        return 0;
    }
    if (strtoupper((string) $coupon['type']) === 'PERCENT') {
        $amount = round_money(($subtotal * (int) $coupon['value']) / 100);
        $max = $coupon['maxDiscount'] ?? null;
        return ($max !== null && $max > 0) ? min($amount, (int) $max) : $amount;
    }
    return min((int) $coupon['value'], $subtotal);
}

/**
 * Validates a requested pack quantity against the product's wholesale rules.
 * Quantities are counted in PACKS; pieces are always packs × packSize, which
 * guarantees the "multiple of 5" rule of the original application.
 *
 * @throws ApiException
 */
function assert_valid_pack_quantity(int $packCount, int $minPacks = 1, int $maxPacks = 500): void
{
    if ($packCount < $minPacks) {
        throw err_validation(sprintf('حداقل سفارش این مدل %s پک است', number_format_fa($minPacks)));
    }
    if ($packCount > $maxPacks) {
        throw err_validation('تعداد پک درخواستی بیش از حد مجاز است');
    }
}

/** Formats an integer with Persian digits (for error messages). */
function number_format_fa(int $value): string
{
    $en = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    $fa = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return str_replace($en, $fa, number_format($value));
}
