/**
 * Wholesale pricing engine — pure functions, shared by client UI and server.
 * The SERVER is always the authority; the client only mirrors the math for UX.
 */

export const PACK_SIZE = 5;

export type Tier = { minPacks: number; discountBps: number };

/** Default stepped wholesale discounts: 3+ packs → 4%, 6+ packs → 8%. */
export const DEFAULT_TIERS: Tier[] = [
  { minPacks: 3, discountBps: 400 },
  { minPacks: 6, discountBps: 800 },
];

/** Money is always rounded to the nearest 1000 Toman — same rule as before the rewrite. */
export function roundMoney(amount: number): number {
  return Math.round(amount / 1000) * 1000;
}

export function effectiveTiers(tiers: Tier[] | null | undefined): Tier[] {
  return tiers && tiers.length > 0 ? tiers : DEFAULT_TIERS;
}

/** Best applicable discount (in basis points) for a given pack count. */
export function tierDiscountBps(packCount: number, tiers?: Tier[] | null): number {
  let best = 0;
  for (const tier of effectiveTiers(tiers)) {
    if (packCount >= tier.minPacks) best = Math.max(best, tier.discountBps);
  }
  return best;
}

export function tierLabel(packCount: number, tiers?: Tier[] | null): string {
  const bps = tierDiscountBps(packCount, tiers);
  if (bps >= 800) return 'همکار ویژه';
  if (bps > 0) return `تخفیف حجمی ${toFa(bps / 100)}٪`;
  return 'قیمت همکاری';
}

function toFa(value: number): string {
  return value.toLocaleString('fa-IR');
}

/** Server- & client-side identical: price per piece after tier discount. */
export function wholesaleUnitPrice(basePrice: number, packCount: number, tiers?: Tier[] | null): number {
  const bps = tierDiscountBps(packCount, tiers);
  const discounted = basePrice * (1 - bps / 10_000);
  return roundMoney(discounted);
}

export function wholesaleLineTotal(basePrice: number, packCount: number, packSize: number, tiers?: Tier[] | null): number {
  return wholesaleUnitPrice(basePrice, packCount, tiers) * packSize * packCount;
}

export function baseLineTotal(basePrice: number, packCount: number, packSize: number): number {
  return basePrice * packSize * packCount;
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('fa-IR').format(Math.round(price));
}

/** Coupon math — mirrors server-side coupon validation. */
export function couponDiscount(
  coupon: { type: 'PERCENT' | 'FIXED'; value: number; maxDiscount: number | null; minOrderTotal: number | null },
  subtotal: number,
): number {
  if (coupon.minOrderTotal && subtotal < coupon.minOrderTotal) return 0;
  if (coupon.type === 'PERCENT') {
    const amount = roundMoney((subtotal * coupon.value) / 100);
    return coupon.maxDiscount ? Math.min(amount, coupon.maxDiscount) : amount;
  }
  return Math.min(coupon.value, subtotal);
}
