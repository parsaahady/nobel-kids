'use client';

import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ChevronLeft, ChevronRight, PackageCheck, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { assetPath } from '@/lib/asset-path';

const slides = [
  {
    eyebrow: 'کالکشن عمده نوبل',
    title: <>جورِ درست،<br /><em>فروشِ بهتر.</em></>,
    text: 'مدل‌های انتخاب‌شده برای ویترین فروشگاه شما؛ هر مدل از یک پک ۵ عددی با قیمت مستقیم تولید.',
    image: assetPath('/products/photo_13.webp'),
    second: assetPath('/products/photo_16.webp'),
    tone: 'rose',
    href: '/products'
  },
  {
    eyebrow: 'پک‌های منعطف برای همکاران',
    title: <>پنج‌تایی شروع کن،<br /><em>هوشمندانه بیشتر کن.</em></>,
    text: 'یک پک برای تست فروش یا چند پک برای قیمت پلکانی؛ تعداد سفارش را متناسب با ظرفیت فروشگاهتان بالا ببرید.',
    image: assetPath('/products/photo_7.webp'),
    second: assetPath('/products/photo_20.webp'),
    tone: 'mint',
    href: '/products?collection=ست+راحتی'
  },
  {
    eyebrow: 'خرید مستقیم از تولید',
    title: <>از خط تولید،<br /><em>مستقیم تا رگال شما.</em></>,
    text: 'پوشاک بچه‌گانه با دوخت کنترل‌شده، رنگ‌بندی کاربردی و ساختار سفارش مناسب فروشگاه‌داران.',
    image: assetPath('/products/photo_24.webp'),
    second: assetPath('/products/photo_3.webp'),
    tone: 'sky',
    href: '/products?category=پسرانه'
  }
];

export default function Hero() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setActive((current) => (current + 1) % slides.length), 6000);
    return () => window.clearInterval(timer);
  }, []);
  const slide = slides[active];
  const navigate = (delta: number) => setActive((current) => (current + delta + slides.length) % slides.length);

  return (
    <section className={`hero hero-${slide.tone}`}>
      <div className="container hero-grid">
        <AnimatePresence mode="wait">
          <motion.div key={`copy-${active}`} className="hero-copy" initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: .5 }}>
            <span className="hero-eyebrow"><Sparkles />{slide.eyebrow}</span>
            <h1>{slide.title}</h1>
            <p>{slide.text}</p>
            <div className="hero-actions"><Link className="primary-button" href={slide.href}>شروع سفارش عمده <ArrowLeft /></Link><Link className="text-button" href="#wholesale-guide">روش سفارش</Link></div>
            <div className="hero-proof"><PackageCheck /><span><strong>پک پایه ۵ عددی</strong><small>امکان سفارش ۱۰، ۱۵، ۲۰ عدد و بیشتر از هر مدل</small></span></div>
          </motion.div>
        </AnimatePresence>
        <div className="hero-visual">
          <div className="hero-sticker"><span>🐢</span><b>عمده</b><small>NOBEL</small></div>
          <AnimatePresence mode="popLayout">
            <motion.div key={`main-${active}`} className="hero-image-main" initial={{ opacity: 0, y: 30, rotate: 2 }} animate={{ opacity: 1, y: 0, rotate: 0 }} exit={{ opacity: 0, y: -15, scale: .96 }} transition={{ duration: .55 }}>
              <Image src={slide.image} alt="پوشاک عمده کودک نوبل کیدز" fill sizes="(max-width: 760px) 80vw, 38vw" priority />
            </motion.div>
            <motion.div key={`second-${active}`} className="hero-image-second" initial={{ opacity: 0, x: -20, rotate: -5 }} animate={{ opacity: 1, x: 0, rotate: -3 }} exit={{ opacity: 0, scale: .9 }} transition={{ duration: .6, delay: .08 }}>
              <Image src={slide.second} alt="مدل مکمل پک عمده نوبل" fill sizes="22vw" priority />
            </motion.div>
          </AnimatePresence>
          <span className="hero-doodle">پک جور<br />فروش بهتر</span>
        </div>
      </div>
      <div className="container hero-controls">
        <div className="hero-dots">{slides.map((_, index) => <button key={index} className={active === index ? 'active' : ''} onClick={() => setActive(index)} aria-label={`اسلاید ${index + 1}`}><i /></button>)}</div>
        <div><button onClick={() => navigate(-1)} aria-label="اسلاید قبلی"><ChevronRight /></button><span>{(active + 1).toLocaleString('fa-IR')} / {slides.length.toLocaleString('fa-IR')}</span><button onClick={() => navigate(1)} aria-label="اسلاید بعدی"><ChevronLeft /></button></div>
      </div>
    </section>
  );
}
