import { Suspense } from 'react';
import { Metadata } from 'next';
import ProductCatalog from '@/components/ProductCatalog';

export const metadata: Metadata = {
  title: 'خرید عمده پوشاک بچه‌گانه',
  description: 'خرید عمده پوشاک دخترانه و پسرانه نوبل کیدز در پک‌های ۵ عددی و بیشتر، مستقیم از تولید.'
};

function CatalogLoading() {
  return <div className="container catalog-loading"><div /><div /><div /><div /></div>;
}

export default function ProductsPage() {
  return (
    <>
      <section className="shop-hero"><div className="container"><span>ویترین عمده نوبل</span><h1>هر مدل، یک انتخاب<br /><em>برای فروش بهتر</em></h1><p>قیمت‌ها برای هر عدد نمایش داده می‌شوند؛ حداقل سفارش هر مدل یک پک ۵ عددی است و با افزایش تعداد پک، تخفیف پلکانی اعمال می‌شود.</p><div className="shop-pack-note"><strong>۵×</strong><span>پک پایه<br />هر مدل</span></div></div><i className="shop-blob one" /><i className="shop-blob two" /><span className="shop-turtle">🐢</span></section>
      <Suspense fallback={<CatalogLoading />}><ProductCatalog /></Suspense>
    </>
  );
}
