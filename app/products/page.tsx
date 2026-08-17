import { Suspense } from 'react';
import { Metadata } from 'next';
import ProductCatalog from '@/components/ProductCatalog';

export const metadata: Metadata = {
  title: 'فروشگاه پوشاک بچه‌گانه',
  description: 'خرید پوشاک دخترانه و پسرانه نوبل کیدز؛ مدل‌های راحت، باکیفیت و تولید نوبل.'
};

function CatalogLoading() {
  return <div className="container catalog-loading"><div /><div /><div /><div /></div>;
}

export default function ProductsPage() {
  return (
    <>
      <section className="shop-hero"><div className="container"><span>فروشگاه نوبل</span><h1>لباس‌هایی برای<br /><em>کودکیِ راحت‌تر</em></h1><p>مدل‌های دخترانه و پسرانه با طراحی آزاد، رنگ‌های آرام و کیفیت تولید نوبل.</p></div><i className="shop-blob one" /><i className="shop-blob two" /><span className="shop-turtle">🐢</span></section>
      <Suspense fallback={<CatalogLoading />}><ProductCatalog /></Suspense>
    </>
  );
}
