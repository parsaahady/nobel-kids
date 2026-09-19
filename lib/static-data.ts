/**
 * Build-time data access for the static export.
 *
 * `scripts/fetch-static-data.mjs` writes JSON into `.static-data/` before
 * `next build` runs. These helpers read those files synchronously so page
 * components stay server components with zero async database work.
 *
 * Everything degrades to empty: if the API was unreachable at build time the
 * pages still render and the browser fills them in from the live API.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import type {
  CategoryDTO,
  ProductDetailDTO,
  ProductListItemDTO,
  ProductListResult,
  ShippingMethod,
} from '@/types';

const DATA_DIR = path.join(process.cwd(), '.static-data');

function read<T>(name: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(path.join(DATA_DIR, `${name}.json`), 'utf8')) as T;
  } catch {
    return fallback;
  }
}

const EMPTY_LIST: ProductListResult = { items: [], total: 0, page: 1, pageSize: 8, totalPages: 0 };

export type HomeSections = {
  featured: ProductListItemDTO[];
  newest: ProductListItemDTO[];
  bestsellers: ProductListItemDTO[];
};

export function staticHomeSections(): HomeSections {
  return read<HomeSections>('home', { featured: [], newest: [], bestsellers: [] });
}

export type CatalogBootstrap = {
  initial: ProductListResult;
  categories: CategoryDTO[];
  sizeOptions: string[];
  collections: string[];
};

export function staticCatalog(): CatalogBootstrap {
  return read<CatalogBootstrap>('catalog', {
    initial: EMPTY_LIST, categories: [], sizeOptions: [], collections: [],
  });
}

export type ProductDetailBundle = { product: ProductDetailDTO; related: ProductListItemDTO[] };

export function staticProducts(): Record<string, ProductDetailBundle> {
  return read<Record<string, ProductDetailBundle>>('products', {});
}

export function staticProduct(slug: string): ProductDetailBundle | null {
  return staticProducts()[slug] ?? null;
}

export function staticProductSlugs(): string[] {
  return Object.keys(staticProducts());
}

export function staticShippingMethods(): ShippingMethod[] {
  return read<{ methods: ShippingMethod[] }>('shipping', { methods: [] }).methods;
}

export type SiteConfig = { gatewayEnabled: boolean; siteUrl: string; packSize: number };

export function staticSiteConfig(): SiteConfig {
  return read<SiteConfig>('config', {
    gatewayEnabled: false,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://nobelkids.ir',
    packSize: 5,
  });
}

/** Canonical site URL for metadata: env wins, then baked config, then default. */
export function siteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '');
  if (fromEnv) return fromEnv;
  const baked = staticSiteConfig().siteUrl?.replace(/\/+$/, '');
  if (baked && !baked.includes('localhost') && !baked.includes('127.0.0.1')) return baked;
  return 'https://nobelkids.ir';
}
