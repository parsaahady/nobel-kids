import { Product } from '@/types';

export const PACK_SIZE = 5;

export const getTierDiscount = (packCount: number) => {
  if (packCount >= 6) return 0.08;
  if (packCount >= 3) return 0.04;
  return 0;
};

export const getTierLabel = (packCount: number) => {
  if (packCount >= 6) return 'همکار ویژه';
  if (packCount >= 3) return 'تخفیف حجمی ۴٪';
  return 'قیمت همکاری';
};

export const getWholesaleUnitPrice = (product: Product, packCount = 1) => {
  const discounted = product.price * (1 - getTierDiscount(packCount));
  return Math.round(discounted / 1000) * 1000;
};

export const getWholesaleLineTotal = (product: Product, packCount = 1) =>
  getWholesaleUnitPrice(product, packCount) * PACK_SIZE * packCount;

export const getBaseLineTotal = (product: Product, packCount = 1) =>
  (product.oldPrice || product.price) * PACK_SIZE * packCount;
