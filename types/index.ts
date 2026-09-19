/**
 * Shared DTO types — the contract between server services, API routes and UI.
 * These contain NO Prisma types so client bundles never touch the ORM.
 */
import type { Tier } from '@/lib/pricing';

export type CategoryDTO = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  isActive: boolean;
  sortOrder: number;
  productCount?: number;
};

export type ProductImageDTO = { id: string; url: string; alt: string | null; sortOrder: number; isPrimary: boolean };
export type ProductColorDTO = { id: string; name: string; hex: string | null };
export type ProductSizeDTO = { id: string; label: string };

export type ProductListItemDTO = {
  id: string;
  slug: string;
  name: string;
  shortName: string | null;
  price: number;
  comparePrice: number | null;
  stock: number;
  packSize: number;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  featured: boolean;
  isNew: boolean;
  isBestSeller: boolean;
  category: { id: string; name: string; slug: string };
  collection: string | null;
  gender: string | null;
  image: string | null;
  colors: ProductColorDTO[];
  sizes: ProductSizeDTO[];
};

export type ProductDetailDTO = Omit<ProductListItemDTO, 'image'> & {
  description: string | null;
  shortDescription: string | null;
  material: string | null;
  sku: string;
  tags: string[];
  gallery: ProductImageDTO[];
  tiers: Tier[];
  seoTitle: string | null;
  seoDescription: string | null;
};

export type ProductListResult = {
  items: ProductListItemDTO[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

// ───── Auth / account ─────

export type UserDTO = {
  id: string;
  mobile: string;
  name: string | null;
  businessName: string | null;
  email: string | null;
  role: 'CUSTOMER' | 'ADMIN' | 'SUPER_ADMIN';
  status: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  createdAt: string;
  lastLoginAt: string | null;
};

export type AddressDTO = {
  id: string;
  title: string | null;
  recipientName: string;
  mobile: string;
  province: string;
  city: string;
  address: string;
  postalCode: string | null;
  unit: string | null;
  plate: string | null;
  isDefault: boolean;
};

// ───── Cart / wishlist ─────

export type CartItemDTO = {
  id: string;
  productId: string;
  packMode: 'assorted' | 'single';
  colorName: string;
  colorHex: string | null;
  sizeLabel: string;
  packCount: number;
  unitPrice: number;
  product: {
    name: string;
    shortName: string | null;
    slug: string;
    image: string | null;
    packSize: number;
    stock: number;
    price: number;
    status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
    tiers: Tier[];
  };
};

export type CartDTO = {
  id: string | null;
  items: CartItemDTO[];
  subtotal: number;
  baseTotal: number;
  totalPacks: number;
  totalPieces: number;
};

export type WishlistDTO = { items: ProductListItemDTO[] };

// ───── Orders / payments ─────

export type OrderStatusDTO =
  | 'PENDING' | 'AWAITING_PAYMENT' | 'PAID' | 'PROCESSING' | 'PACKED'
  | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';

export type OrderItemDTO = {
  id: string;
  productId: string | null;
  productName: string;
  sku: string;
  variantName: string | null;
  packMode: string;
  quantity: number;
  packSize: number;
  unitPrice: number;
  total: number;
};

export type OrderSummaryDTO = {
  id: string;
  orderNumber: string;
  status: OrderStatusDTO;
  paymentStatus: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
  shippingStatus: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED';
  paymentMethod: 'MANUAL' | 'GATEWAY';
  subtotal: number;
  discount: number;
  shippingCost: number;
  total: number;
  createdAt: string;
  itemCount: number;
  trackingCode: string | null;
};

export type AddressSnapshotDTO = {
  recipientName?: string;
  mobile?: string;
  province?: string;
  city?: string;
  address?: string;
  postalCode?: string | null;
};

export type OrderDetailDTO = OrderSummaryDTO & {
  currency: string;
  customerName: string;
  customerMobile: string;
  businessName: string | null;
  shippingMethod: string;
  addressSnapshot: AddressSnapshotDTO;
  notes: string | null;
  trackingCode: string | null;
  items: OrderItemDTO[];
  payments: Array<{
    id: string;
    provider: string;
    amount: number;
    status: string;
    referenceId: string | null;
    paidAt: string | null;
    createdAt: string;
  }>;
};

export type CheckoutQuoteDTO = {
  items: CartItemDTO[];
  subtotal: number;
  baseTotal: number;
  tierDiscount: number;
  couponDiscount: number;
  coupon?: { code: string; type: string; value: number } | null;
  shippingCost: number;
  shippingMethod: string;
  total: number;
  totalPacks: number;
  totalPieces: number;
};

export type CheckoutResultDTO = {
  order: OrderSummaryDTO;
  payment:
    | { kind: 'manual' }
    | { kind: 'gateway'; redirectUrl: string };
};

// ───── Admin ─────

export type AdminDashboardDTO = {
  salesToday: number;
  salesMonth: number;
  salesTotal: number;
  ordersTotal: number;
  ordersToday: number;
  ordersAwaitingPayment: number;
  ordersProcessing: number;
  ordersShipped: number;
  usersTotal: number;
  productsTotal: number;
  lowStock: Array<{ id: string; name: string; sku: string; stock: number; image: string | null }>;
  topProducts: Array<{ id: string | null; name: string; quantity: number; revenue: number }>;
  chart: Array<{ date: string; sales: number; orders: number }>;
  recentOrders: Array<OrderSummaryDTO & { customerName: string }>;
  activity: Array<{ id: string; action: string; entity: string; createdAt: string }>;
};

/** Shipping option as returned by GET /api/checkout/shipping.php. */
export type ShippingMethod = { id: string; label: string; description: string; cost: number; note: string };

export type PagedResult<T> = { items: T[]; total: number; page: number; pageSize: number; totalPages: number };
