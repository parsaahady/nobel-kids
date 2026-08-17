import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Instagram, ShieldCheck } from 'lucide-react';
import Hero from '@/components/Hero';
import CategoryScroller from '@/components/CategoryScroller';
import FeatureCards from '@/components/FeatureCards';
import ProductCard from '@/components/ProductCard';
import Reveal from '@/components/Reveal';
import SectionHeader from '@/components/SectionHeader';
import { products } from '@/data/products';
import { siteInfo } from '@/data/site';

export default function HomePage() {
  const newest = products.filter((product) => product.isNew).slice(0, 4);
  const best = products.filter((product) => product.isBestSeller).slice(0, 4);
  return (
    <>
      <Hero />
      <div className="container home-overlap"><FeatureCards /></div>

      <section className="page-section categories-section">
        <div className="container">
          <Reveal><SectionHeader eyebrow="انتخاب سریع" title="برای هر استایل، یک نوبل" href="/products" /></Reveal>
          <Reveal delay={.08}><CategoryScroller /></Reveal>
        </div>
      </section>

      <section className="page-section products-section">
        <div className="container">
          <Reveal><SectionHeader eyebrow="تازه رسیده" title="مدل‌های جدید" href="/products?sort=newest" /></Reveal>
          <div className="product-grid home-product-grid">{newest.map((product, index) => <Reveal key={product.id} delay={index * .06}><ProductCard product={product} priority={index < 2} /></Reveal>)}</div>
        </div>
      </section>

      <section className="editorial-section">
        <div className="container editorial-grid">
          <Reveal className="editorial-image-wrap">
            <div className="editorial-image"><Image src="/products/photo_1.webp" alt="کالکشن نوجوان نوبل کیدز" fill sizes="(max-width: 800px) 100vw, 50vw" /></div>
            <div className="editorial-tag"><span>از ۱۳۹۶</span><strong>ساخته‌شده<br />برای حرکت</strong></div>
          </Reveal>
          <Reveal className="editorial-copy" delay={.1}>
            <span className="tiny-label">درباره نوبل کیدز</span>
            <h2>لباسی که کودک،<br /><em>خودش انتخاب می‌کند.</em></h2>
            <p>{siteInfo.history}</p>
            <div className="editorial-points"><div><ShieldCheck /><span><strong>{siteInfo.slogan}</strong><small>در انتخاب پارچه و کیفیت دوخت</small></span></div><div><span className="big-number">۱۳۹۶</span><span><strong>شروع فعالیت</strong><small>طراحی و تولید پوشاک بچه‌گانه</small></span></div></div>
            <Link className="line-link" href="/contact">آشنایی و راه‌های ارتباطی <ArrowLeft /></Link>
          </Reveal>
        </div>
      </section>

      <section className="page-section bestseller-section">
        <div className="container">
          <Reveal><SectionHeader eyebrow="انتخاب شما" title="پرفروش‌های نوبل" href="/products?sort=bestseller" /></Reveal>
          <div className="product-grid home-product-grid">{best.map((product, index) => <Reveal key={product.id} delay={index * .06}><ProductCard product={product} /></Reveal>)}</div>
        </div>
      </section>

      <section className="container instagram-banner">
        <Reveal className="instagram-copy"><span><Instagram /></span><div><small>پشت صحنه و تازه‌ها</small><h2>ما را در اینستاگرام ببینید</h2><p>تصاویر کالکشن‌ها و هماهنگی سفارش با مسئول فروش نوبل.</p></div><a href={siteInfo.instagramUrl} target="_blank" rel="noreferrer">{siteInfo.instagram}<ArrowLeft /></a></Reveal>
        <div className="instagram-images"><div><Image src="/products/photo_2.webp" alt="کالکشن نوبل در اینستاگرام" fill sizes="25vw" /></div><div><Image src="/products/photo_22.webp" alt="استایل راه راه نوبل" fill sizes="25vw" /></div><div><Image src="/products/photo_7.webp" alt="ست سبز نوبل" fill sizes="25vw" /></div></div>
      </section>
    </>
  );
}
