'use client';

import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronLeft, ChevronRight, Heart, Minus, Plus, Ruler, Share2, ShieldCheck, ShoppingBag, Star, Truck, X, ZoomIn } from 'lucide-react';
import { useState } from 'react';
import { Product } from '@/types';
import { formatPrice } from '@/data/products';
import { useStore } from './Providers';
import ProductCard from './ProductCard';
import SectionHeader from './SectionHeader';

export default function ProductDetailClient({ product, related }: { product: Product; related: Product[] }) {
  const [activeImage, setActiveImage] = useState(0);
  const [size, setSize] = useState(product.sizes[0]);
  const [color, setColor] = useState(product.colors[0].name);
  const [quantity, setQuantity] = useState(1);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const { addToCart, toggleWishlist, wishlist, notify } = useStore();
  const liked = wishlist.includes(product.id);

  const handleAdd = (event: React.MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    addToCart({ productId: product.id, quantity, size, color }, { image: product.image, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  };

  const share = async () => {
    const payload = { title: product.name, text: `${product.name} از نوبل کیدز`, url: window.location.href };
    if (navigator.share) await navigator.share(payload);
    else { await navigator.clipboard.writeText(window.location.href); notify('لینک محصول کپی شد'); }
  };

  const moveImage = (delta: number) => setActiveImage((current) => (current + delta + product.gallery.length) % product.gallery.length);

  return (
    <>
      <div className="container breadcrumbs"><Link href="/">خانه</Link><ChevronLeft /><Link href="/products">فروشگاه</Link><ChevronLeft /><span>{product.shortName}</span></div>
      <section className="container product-detail">
        <div className="product-gallery">
          <div className="gallery-main">
            <AnimatePresence mode="wait"><motion.div key={product.gallery[activeImage]} initial={{ opacity: 0, scale: .985 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}><Image src={product.gallery[activeImage]} alt={`${product.name}، نمای ${activeImage + 1}`} fill sizes="(max-width: 900px) 100vw, 48vw" priority /></motion.div></AnimatePresence>
            <button className="zoom-button" onClick={() => setZoomOpen(true)}><ZoomIn /> بزرگ‌نمایی</button>
            {product.isNew && <span className="detail-badge">جدید</span>}
            {product.gallery.length > 1 && <div className="gallery-arrows"><button onClick={() => moveImage(-1)}><ChevronRight /></button><button onClick={() => moveImage(1)}><ChevronLeft /></button></div>}
          </div>
          <div className="gallery-thumbs">{product.gallery.map((image, index) => <button key={image} onClick={() => setActiveImage(index)} className={activeImage === index ? 'active' : ''}><Image src={image} alt={`تصویر ${index + 1} ${product.name}`} fill sizes="90px" /></button>)}</div>
        </div>

        <div className="product-detail-copy">
          <div className="detail-topline"><span>{product.collection}</span><div><Star fill="currentColor" />{product.rating.toLocaleString('fa-IR')} <small>کیفیت تأییدشده</small></div></div>
          <h1>{product.name}</h1>
          <p className="product-description">{product.description}</p>
          <div className="detail-price"><span><strong>{formatPrice(product.price)}</strong> تومان</span>{product.oldPrice && <del>{formatPrice(product.oldPrice)} تومان</del>}</div>
          <div className="stock-line"><i />{product.stock > 5 ? 'موجود و آماده سفارش' : `تنها ${product.stock.toLocaleString('fa-IR')} عدد باقی مانده`}</div>

          <div className="option-block">
            <div className="option-head"><strong>رنگ</strong><span>{color}</span></div>
            <div className="detail-colors">{product.colors.map((item) => <button key={item.name} onClick={() => setColor(item.name)} className={color === item.name ? 'active' : ''}><i style={{ backgroundColor: item.hex }} />{item.name}{color === item.name && <Check />}</button>)}</div>
          </div>
          <div className="option-block">
            <div className="option-head"><strong>انتخاب سایز</strong><button onClick={() => setGuideOpen(true)}><Ruler /> راهنمای سایز</button></div>
            <div className="detail-sizes">{product.sizes.map((item) => <button key={item} onClick={() => setSize(item)} className={size === item ? 'active' : ''}>{item}</button>)}</div>
          </div>

          <div className="detail-actions">
            <div className="quantity-control"><button onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus /></button><strong>{quantity.toLocaleString('fa-IR')}</strong><button onClick={() => setQuantity(quantity + 1)}><Plus /></button></div>
            <button className="primary-button add-main" onClick={handleAdd}><ShoppingBag /> افزودن به سبد خرید</button>
            <button className={`heart-main ${liked ? 'liked' : ''}`} onClick={() => toggleWishlist(product.id)} aria-label="علاقه‌مندی"><Heart fill={liked ? 'currentColor' : 'none'} /></button>
          </div>

          <div className="product-assurances"><div><span><ShieldCheck /></span><p><strong>تضمین در کیفیت</strong><small>کنترل پارچه و دوخت نهایی</small></p></div><div><span><Truck /></span><p><strong>هماهنگی ارسال</strong><small>از بازار بزرگ تهران</small></p></div></div>
          <div className="product-specs"><p><span>جنس پارچه</span><strong>{product.material}</strong></p><p><span>مدل</span><strong>{product.gender}</strong></p><p><span>کد محصول</span><strong dir="ltr">NBL-{String(product.id).padStart(3, '0')}</strong></p></div>
          <button className="share-button" onClick={share}><Share2 /> اشتراک‌گذاری این محصول</button>
        </div>
      </section>

      <section className="container related-section"><SectionHeader eyebrow="پیشنهاد نوبل" title="شاید این‌ها را هم بپسندید" href="/products" /><div className="product-grid home-product-grid">{related.map((item) => <ProductCard key={item.id} product={item} />)}</div></section>

      <AnimatePresence>
        {zoomOpen && <motion.div className="zoom-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setZoomOpen(false)}><button className="zoom-close"><X /></button><motion.div initial={{ scale: .9 }} animate={{ scale: 1 }} onClick={(e) => e.stopPropagation()}><Image src={product.gallery[activeImage]} alt={product.name} fill sizes="90vw" /></motion.div></motion.div>}
        {guideOpen && <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setGuideOpen(false)}><motion.div className="size-guide-modal" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} onClick={(e) => e.stopPropagation()}><div className="modal-head"><div><Ruler /><span><strong>راهنمای انتخاب سایز</strong><small>اندازه‌ها تقریبی و به سانتی‌متر هستند</small></span></div><button onClick={() => setGuideOpen(false)}><X /></button></div><div className="size-table"><div><strong>سایز</strong><strong>قد لباس</strong><strong>عرض سینه</strong></div>{product.sizes.map((item, index) => <div key={item}><span>{item}</span><span>{(44 + index * 4).toLocaleString('fa-IR')}</span><span>{(40 + index * 3).toLocaleString('fa-IR')}</span></div>)}</div><p>برای انتخاب دقیق‌تر، یکی از لباس‌های مناسب کودک را روی سطح صاف اندازه بگیرید و با جدول مقایسه کنید.</p><button className="primary-button" onClick={() => setGuideOpen(false)}>متوجه شدم</button></motion.div></motion.div>}
      </AnimatePresence>
    </>
  );
}
