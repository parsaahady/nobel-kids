'use client';

import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { BadgePercent, Check, ChevronLeft, ChevronRight, Heart, Minus, PackageCheck, Plus, Ruler, Share2, ShieldCheck, ShoppingBag, Truck, X, ZoomIn } from 'lucide-react';
import { useState } from 'react';
import { formatPrice, tierDiscountBps, tierLabel, wholesaleLineTotal, wholesaleUnitPrice } from '@/lib/pricing';
import type { ProductDetailDTO, ProductListItemDTO } from '@/types';
import { useStore } from './Providers';
import ProductCard from './ProductCard';
import SectionHeader from './SectionHeader';

export default function ProductDetailClient({ product, related }: { product: ProductDetailDTO; related: ProductListItemDTO[] }) {
  const [activeImage, setActiveImage] = useState(0);
  const [packMode, setPackMode] = useState<'assorted' | 'single'>('assorted');
  const [singleSize, setSingleSize] = useState(product.sizes[0]?.label ?? '');
  const [color, setColor] = useState(product.colors[0]?.name ?? '');
  const [quantity, setQuantity] = useState(1);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const { addToCart, toggleWishlist, wishlistIds, notify } = useStore();
  const liked = wishlistIds.includes(product.id);
  const outOfStock = product.stock <= 0;
  const selectedSizeLabel = packMode === 'assorted' ? 'جور سایز' : singleSize;
  const unitPrice = wholesaleUnitPrice(product.price, quantity, product.tiers);
  const lineTotal = wholesaleLineTotal(product.price, quantity, product.packSize, product.tiers);
  const discountBps = tierDiscountBps(quantity, product.tiers);
  const gallery = product.gallery.length ? product.gallery : [];

  const handleAdd = async (event: React.MouseEvent<HTMLButtonElement>) => {
    if (adding || outOfStock) return;
    setAdding(true);
    const rect = event.currentTarget.getBoundingClientRect();
    try {
      await addToCart(
        { productId: product.id, packMode, colorName: color, sizeLabel: selectedSizeLabel, packCount: quantity },
        gallery[0] ? { image: gallery[0].url, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : undefined,
      );
    } finally {
      setAdding(false);
    }
  };

  const share = async () => {
    const payload = { title: product.name, text: `${product.name}؛ سفارش عمده از نوبل کیدز`, url: window.location.href };
    if (navigator.share) await navigator.share(payload).catch(() => undefined);
    else { await navigator.clipboard.writeText(window.location.href); notify('لینک محصول کپی شد'); }
  };

  const moveImage = (delta: number) => setActiveImage((current) => (current + delta + gallery.length) % Math.max(gallery.length, 1));

  return (
    <>
      <div className="container breadcrumbs">
        <Link href="/">خانه</Link><ChevronLeft /><Link href="/products">خرید عمده</Link><ChevronLeft /><span>{product.shortName || product.name}</span>
      </div>
      <section className="container product-detail">
        <div className="product-gallery">
          <div className="gallery-main">
            {gallery.length > 0 && (
              <AnimatePresence mode="wait">
                <motion.div key={gallery[Math.min(activeImage, gallery.length - 1)].url} initial={{ opacity: 0, scale: 0.985 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                  <Image src={gallery[Math.min(activeImage, gallery.length - 1)].url} alt={`${product.name}، نمای ${activeImage + 1}`} fill sizes="(max-width: 900px) 100vw, 48vw" priority />
                </motion.div>
              </AnimatePresence>
            )}
            <button className="zoom-button" onClick={() => setZoomOpen(true)}><ZoomIn /> بزرگ‌نمایی</button>
            <span className="detail-badge wholesale">فروش عمده · پک {product.packSize.toLocaleString('fa-IR')} عددی</span>
            {gallery.length > 1 && (
              <div className="gallery-arrows">
                <button onClick={() => moveImage(-1)} aria-label="تصویر قبلی"><ChevronRight /></button>
                <button onClick={() => moveImage(1)} aria-label="تصویر بعدی"><ChevronLeft /></button>
              </div>
            )}
          </div>
          {gallery.length > 1 && (
            <div className="gallery-thumbs">
              {gallery.map((image, index) => (
                <button key={image.id} onClick={() => setActiveImage(index)} className={activeImage === index ? 'active' : ''}>
                  <Image src={image.url} alt={image.alt ?? `تصویر ${index + 1} ${product.name}`} fill sizes="90px" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="product-detail-copy">
          <div className="detail-topline">
            <span>{product.collection ?? product.category.name} · کد {product.sku}</span>
            {product.category.name && <span className="detail-category-pill">{product.category.name}</span>}
          </div>
          <h1>{product.name}</h1>
          {product.shortDescription && <p className="product-description product-short-desc">{product.shortDescription}</p>}

          <div className="wholesale-detail-price">
            <div>
              <small>قیمت همکاری هر عدد</small>
              <span><strong>{formatPrice(unitPrice)}</strong> تومان</span>
              {product.comparePrice && product.comparePrice > product.price && quantity === 1 && <del>{formatPrice(product.comparePrice)} تومان</del>}
            </div>
            <div><small>جمع {quantity.toLocaleString('fa-IR')} پک · {(quantity * product.packSize).toLocaleString('fa-IR')} عدد</small><strong>{formatPrice(lineTotal)} تومان</strong></div>
          </div>
          <div className={`stock-line ${outOfStock ? 'out' : ''}`}>
            <i />{outOfStock ? 'این مدل فعلاً ناموجود است' : product.stock > 5 ? `${product.stock.toLocaleString('fa-IR')} پک آماده سفارش` : `تنها ${product.stock.toLocaleString('fa-IR')} پک باقی مانده`}
          </div>

          {product.colors.length > 0 && (
            <div className="option-block">
              <div className="option-head"><strong>رنگ پک</strong><span>{color}</span></div>
              <div className="detail-colors">
                {product.colors.map((item) => (
                  <button key={item.id} onClick={() => setColor(item.name)} className={color === item.name ? 'active' : ''}>
                    <i style={{ backgroundColor: item.hex ?? '#ddd' }} />{item.name}{color === item.name && <Check />}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="option-block pack-composition">
            <div className="option-head">
              <strong>چیدمان سایز داخل پک</strong>
              {product.sizes.length > 0 && <button onClick={() => setGuideOpen(true)}><Ruler /> جدول اندازه</button>}
            </div>
            <div className="pack-mode-buttons">
              <button className={packMode === 'assorted' ? 'active' : ''} onClick={() => setPackMode('assorted')}>
                <PackageCheck /><span><strong>جور سایز پیشنهادی</strong><small>{product.packSize.toLocaleString('fa-IR')} عدد با سایزبندی مناسب فروش</small></span>{packMode === 'assorted' && <Check />}
              </button>
              <button className={packMode === 'single' ? 'active' : ''} onClick={() => setPackMode('single')} disabled={product.sizes.length === 0}>
                <span className="five-mark">{product.packSize}×</span><span><strong>پک تک‌سایز</strong><small>{product.packSize.toLocaleString('fa-IR')} عدد از یک سایز مشخص</small></span>{packMode === 'single' && <Check />}
              </button>
            </div>
            {packMode === 'single' && product.sizes.length > 0 && (
              <motion.div className="detail-sizes single-size-row" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}>
                {product.sizes.map((item) => (
                  <button key={item.id} onClick={() => setSingleSize(item.label)} className={singleSize === item.label ? 'active' : ''}>{item.label}</button>
                ))}
              </motion.div>
            )}
          </div>

          <div className="wholesale-tiers">
            <div className="tier-title"><BadgePercent /><span><strong>قیمت پلکانی همین مدل</strong><small>تخفیف با افزایش تعداد پک به‌صورت خودکار اعمال می‌شود.</small></span></div>
            <div>
              <span className={quantity < 3 ? 'active' : ''}><small>۱–۲ پک</small><strong>قیمت پایه</strong></span>
              <span className={quantity >= 3 && quantity < 6 ? 'active' : ''}><small>۳–۵ پک</small><strong>۴٪ کمتر</strong></span>
              <span className={quantity >= 6 ? 'active' : ''}><small>۶+ پک</small><strong>۸٪ کمتر</strong></span>
            </div>
          </div>

          <div className="pack-quantity-label">
            <span><strong>تعداد پک</strong><small>هر پک شامل {product.packSize.toLocaleString('fa-IR')} عدد است</small></span>
            <b>{tierLabel(quantity, product.tiers)}{discountBps > 0 ? ` · ٪${Math.round(discountBps / 100).toLocaleString('fa-IR')}` : ''}</b>
          </div>
          <div className="detail-actions">
            <div className="quantity-control">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="کاهش"><Minus /></button>
              <strong>{quantity.toLocaleString('fa-IR')}</strong>
              <button onClick={() => setQuantity(Math.min(product.stock || 1, quantity + 1))} aria-label="افزایش" disabled={outOfStock || quantity >= product.stock}><Plus /></button>
            </div>
            <button className="primary-button add-main" onClick={handleAdd} disabled={adding || outOfStock || !color || !selectedSizeLabel}>
              {outOfStock ? 'ناموجود' : adding ? <span className="custom-loader" /> : <><ShoppingBag /> افزودن {(quantity).toLocaleString('fa-IR')} پک ({(quantity * product.packSize).toLocaleString('fa-IR')} عدد)</>}
            </button>
            <button className={`heart-main ${liked ? 'liked' : ''}`} onClick={() => void toggleWishlist(product.id)} aria-label="علاقه‌مندی">
              <Heart fill={liked ? 'currentColor' : 'none'} />
            </button>
          </div>

          <div className="product-assurances">
            <div><span><ShieldCheck /></span><p><strong>تضمین کیفیت تولید</strong><small>کنترل پارچه و دوخت نهایی</small></p></div>
            <div><span><Truck /></span><p><strong>ارسال عمده</strong><small>باربری، تیپاکس یا تحویل حضوری</small></p></div>
          </div>
          <div className="product-specs">
            {product.material && <p><span>جنس پارچه</span><strong>{product.material}</strong></p>}
            <p><span>حداقل سفارش</span><strong>۱ پک · {product.packSize.toLocaleString('fa-IR')} عدد</strong></p>
            <p><span>نوع فروش</span><strong>عمده مستقیم از تولید</strong></p>
          </div>
          <button className="share-button" onClick={share}><Share2 /> اشتراک‌گذاری این مدل با همکار</button>
        </div>
      </section>

      {related.length > 0 && (
        <section className="container related-section">
          <SectionHeader eyebrow="تکمیل سفارش عمده" title="مدل‌های پیشنهادی برای ویترین شما" href="/products" />
          <div className="product-grid home-product-grid">{related.map((item) => <ProductCard key={item.id} product={item} />)}</div>
        </section>
      )}

      <AnimatePresence>
        {zoomOpen && gallery.length > 0 && (
          <motion.div className="zoom-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setZoomOpen(false)}>
            <button className="zoom-close" aria-label="بستن"><X /></button>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} onClick={(e) => e.stopPropagation()}>
              <Image src={gallery[Math.min(activeImage, gallery.length - 1)].url} alt={product.name} fill sizes="90vw" />
            </motion.div>
          </motion.div>
        )}
        {guideOpen && (
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setGuideOpen(false)}>
            <motion.div className="size-guide-modal" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-head">
                <div><Ruler /><span><strong>راهنمای سایزبندی پک</strong><small>اندازه‌ها تقریبی و به سانتی‌متر هستند</small></span></div>
                <button onClick={() => setGuideOpen(false)} aria-label="بستن"><X /></button>
              </div>
              <div className="size-table">
                <div><strong>سایز</strong><strong>قد لباس</strong><strong>عرض سینه</strong></div>
                {product.sizes.map((item, index) => (
                  <div key={item.id}>
                    <strong>{item.label}</strong><span>{(36 + index * 3).toLocaleString('fa-IR')}</span><span>{(28 + index * 2).toLocaleString('fa-IR')}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
