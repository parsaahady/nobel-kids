import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProductDetailClient from '@/components/ProductDetailClient';
import { siteUrl, staticProduct, staticProductSlugs } from '@/lib/static-data';

type Props = { params: Promise<{ slug: string }> };

/**
 * Static export: one HTML file per product slug, generated from the data that
 * scripts/fetch-static-data.mjs pulled out of the PHP API at build time.
 * Re-run the fetch + build whenever you add products (see README-DEPLOYMENT.md).
 */
export function generateStaticParams() {
  return staticProductSlugs().map((slug) => ({ slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const bundle = staticProduct(slug);
  if (!bundle) return { title: 'محصول یافت نشد' };
  const { product } = bundle;
  const title = product.seoTitle || product.name;
  const description = product.seoDescription
    || product.description
    || `خرید عمده ${product.name} در پک‌های ${product.packSize} عددی، مستقیم از تولید نوبل کیدز.`;
  return {
    title,
    description,
    alternates: { canonical: `${siteUrl()}/products/${product.slug}` },
    openGraph: {
      title: `خرید عمده ${product.name}`,
      description,
      images: product.gallery[0] ? [product.gallery[0].url] : undefined,
      type: 'website',
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const bundle = staticProduct(slug);
  if (!bundle) notFound();
  const { product, related } = bundle;
  const base = siteUrl();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description ?? product.shortDescription ?? undefined,
    image: product.gallery.map((img) => `${base}${img.url}`),
    sku: product.sku,
    brand: { '@type': 'Brand', name: 'Nobel Kids' },
    category: product.category.name,
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'IRT',
      lowPrice: product.price,
      highPrice: product.price,
      offerCount: product.packSize,
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  };
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'خانه', item: base },
      { '@type': 'ListItem', position: 2, name: 'خرید عمده', item: `${base}/products` },
      { '@type': 'ListItem', position: 3, name: product.name, item: `${base}/products/${product.slug}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <ProductDetailClient product={product} related={related} />
    </>
  );
}
