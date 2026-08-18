import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Instagram, ShieldCheck } from 'lucide-react';
import Hero from '@/components/Hero';
import CategoryScroller from '@/components/CategoryScroller';
import FeatureCards from '@/components/FeatureCards';
import ProductCard from '@/components/ProductCard';
import Reveal from '@/components/Reveal';
import SectionHeader from '@/components/SectionHeader';
import WholesaleGuide from '@/components/WholesaleGuide';
import { products } from '@/data/products';
import { siteInfo } from '@/data/site';
import { assetPath } from '@/lib/asset-path';

export default function HomePage() {
  const newest = products.filter((product) => product.isNew).slice(0, 4);
  const best = products.filter((product) => product.isBestSeller).slice(0, 4);
  return (
    <>
      <Hero />
      <div className="container home-overlap"><FeatureCards /></div>

      <section className="page-section categories-section">
        <div className="container">
          <Reveal><SectionHeader eyebrow="چیدمان سفارش" title="مدل‌های مناسب ویترین شما" href="/products" linkLabel="همه مدل‌های عمده" /></Reveal>
          <Reveal delay={.08}><CategoryScroller /></Reveal>
        </div>
      </section>

      <section className="page-section products-section">
        <div className="container">
          <Reveal><SectionHeader eyebrow="تازه‌های تولید" title="مدل‌های جدید برای همکاران" href="/products?sort=newest" /></Reveal>
          <div className="product-grid home-product-grid">{newest.map((product, index) => <Reveal key={product.id} delay={index * .06}><ProductCard product={product} priority={index < 2} /></Reveal>)}</div>
        </div>
      </section>

      <section className="editorial-section">
        <div className="container editorial-grid">
          <Reveal className="editorial-image-wrap">
            <div className="editorial-image"><Image src={assetPath('/products/photo_1.webp')} alt="کالکشن عمده نوجوان نوبل کیدز" fill sizes="(max-width: 800px) 100vw, 50vw" /></div>
            <div className="editorial-tag"><span>شروع سفارش</span><strong>از یک پک<br />۵ عددی</strong></div>
          </Reveal>
          <Reveal className="editorial-copy" delay={.1}>
            <span className="tiny-label">همکاری با نوبل کیدز</span>
            <h2>برای رگال‌هایی که<br /><em>هوشمندانه انتخاب می‌شوند.</em></h2>
            <p>{siteInfo.history} امروز مدل‌های نوبل به‌صورت پک‌های عمده ۵ عددی و بیشتر، مستقیم در اختیار فروشگاه‌داران قرار می‌گیرند.</p>
            <div className="editorial-points"><div><ShieldCheck /><span><strong>تولید مستقیم و تضمین کیفیت</strong><small>کنترل پارچه، دوخت و خروجی نهایی</small></span></div><div><span className="big-number">۵+</span><span><strong>تعداد هر مدل</strong><small>قابل افزایش در مضرب‌های پنج</small></span></div></div>
            <Link className="line-link" href="#wholesale-guide">دیدن شرایط سفارش عمده <ArrowLeft /></Link>
          </Reveal>
        </div>
      </section>

      <WholesaleGuide />

      <section className="page-section bestseller-section">
        <div className="container">
          <Reveal><SectionHeader eyebrow="انتخاب همکاران" title="پرفروش‌های عمده نوبل" href="/products?sort=bestseller" /></Reveal>
          <div className="product-grid home-product-grid">{best.map((product, index) => <Reveal key={product.id} delay={index * .06}><ProductCard product={product} /></Reveal>)}</div>
        </div>
      </section>

      <section className="container instagram-banner">
        <Reveal className="instagram-copy"><span><Instagram /></span><div><small>کالکشن‌ها و موجودی تازه</small><h2>ویترین بعدی‌تان را اینجا پیدا کنید</h2><p>مدل‌های تازه تولید و هماهنگی سفارش عمده با مسئول فروش نوبل.</p></div><a href={siteInfo.instagramUrl} target="_blank" rel="noreferrer">{siteInfo.instagram}<ArrowLeft /></a></Reveal>
        <div className="instagram-images"><div><Image src={assetPath('/products/photo_2.webp')} alt="کالکشن عمده نوبل" fill sizes="25vw" /></div><div><Image src={assetPath('/products/photo_22.webp')} alt="مدل عمده راه راه نوبل" fill sizes="25vw" /></div><div><Image src={assetPath('/products/photo_7.webp')} alt="ست عمده سبز نوبل" fill sizes="25vw" /></div></div>
      </section>
    </>
  );
}
