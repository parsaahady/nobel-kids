import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProductDetailClient from '@/components/ProductDetailClient';
import { findProduct, products } from '@/data/products';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = findProduct(slug);
  if (!product) return { title: 'محصول یافت نشد' };
  return {
    title: product.name,
    description: `${product.description} فروش عمده در پک‌های ۵ عددی و بیشتر، مستقیم از تولید نوبل.`,
    openGraph: { title: `خرید عمده ${product.name}`, description: `${product.description} حداقل سفارش یک پک ۵ عددی.`, images: [product.image] }
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = findProduct(slug);
  if (!product) notFound();
  const related = products.filter((item) => item.id !== product.id && (item.collection === product.collection || item.category === product.category)).slice(0, 4);
  return <ProductDetailClient product={product} related={related} />;
}
