'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, BadgePercent, Minus, PackageCheck, Plus, ShieldCheck, ShoppingBag, Trash2 } from 'lucide-react';
import { formatPrice, tierLabel } from '@/lib/pricing';
import { useStore } from './Providers';

export default function CartClient() {
  const { cart, cartLoading, updatePackCount, removeFromCart } = useStore();
  const items = cart.items;

  const primaryItem = items[0];
  const totalPacks = cart.totalPacks;
  const totalPieces = cart.totalPieces;
  const discount = cart.baseTotal - cart.subtotal;
  void primaryItem;

  if (cartLoading) {
    return (
      <section className="container cart-page">
        <div className="page-head"><span>پیش‌فاکتور عمده</span><h1>مدل‌های انتخابی شما</h1></div>
        <div className="cart-skeleton"><div /><div /><div /></div>
      </section>
    );
  }

  if (!items.length) {
    return (
      <section className="container empty-cart">
        <div className="empty-cart-visual"><span><ShoppingBag /></span><i>🐢</i></div>
        <h1>پیش‌فاکتور شما خالی است</h1>
        <p>برای شروع، یک مدل انتخاب کنید؛ حداقل سفارش هر مدل یک پک ۵ عددی است.</p>
        <Link className="primary-button" href="/products">مشاهده مدل‌های عمده <ArrowLeft /></Link>
      </section>
    );
  }

  return (
    <>
      <section className="container cart-page">
        <div className="page-head">
          <span>پیش‌فاکتور عمده</span>
          <h1>{totalPacks.toLocaleString('fa-IR')} پک از {items.length.toLocaleString('fa-IR')} مدل در سفارش شما</h1>
          <p>موجودی و قیمت‌ها هنگام ثبت سفارش به‌صورت خودکار توسط سرور بازبینی می‌شود.</p>
        </div>
        <div className="cart-layout">
          <section className="cart-list">
            {items.map((item) => {
              const unitPrice = item.unitPrice;
              const lineTotal = unitPrice * item.product.packSize * item.packCount;
              return (
                <motion.article className="cart-row" key={item.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <Link className="cart-image" href={`/products/${item.product.slug}`}>
                    {item.product.image && <Image src={item.product.image} alt={item.product.name} fill sizes="130px" />}
                  </Link>
                  <div className="cart-row-copy">
                    <Link href={`/products/${item.product.slug}`}><h2>{item.product.name}</h2></Link>
                    <div className="cart-attributes">
                      <span><i style={{ background: item.colorHex ?? '#ddd' }} />{item.colorName}</span>
                      <span>{item.sizeLabel}</span>
                    </div>
                    <div className="line-tier"><BadgePercent />{tierLabel(item.packCount, item.product.tiers)} · هر عدد {formatPrice(unitPrice)} تومان</div>
                    <div className="cart-mobile-price"><strong>{formatPrice(lineTotal)}</strong> تومان</div>
                  </div>
                  <div className="cart-quantity-wrap">
                    <small>تعداد پک</small>
                    <div className="cart-quantity">
                      <button onClick={() => void updatePackCount(item.id, item.packCount - 1)} aria-label="کاهش">
                        {item.packCount === 1 ? <Trash2 /> : <Minus />}
                      </button>
                      <strong>{item.packCount.toLocaleString('fa-IR')}</strong>
                      <button onClick={() => void updatePackCount(item.id, item.packCount + 1)} disabled={item.packCount >= item.product.stock} aria-label="افزایش"><Plus /></button>
                    </div>
                    <em>{(item.packCount * item.product.packSize).toLocaleString('fa-IR')} عدد</em>
                  </div>
                  <div className="cart-price">
                    <strong>{formatPrice(lineTotal)}</strong><span>تومان</span>
                    <small>هر عدد {formatPrice(unitPrice)}</small>
                  </div>
                  <button className="cart-delete" onClick={() => void removeFromCart(item.id)} aria-label="حذف"><Trash2 /></button>
                </motion.article>
              );
            })}
            <Link className="continue-shopping" href="/products">افزودن مدل دیگر به پیش‌فاکتور <Plus /></Link>
          </section>
          <aside className="order-summary wholesale-summary">
            <div className="summary-pack-icon"><PackageCheck /><span><strong>{totalPacks.toLocaleString('fa-IR')} پک</strong><small>{totalPieces.toLocaleString('fa-IR')} عدد پوشاک</small></span></div>
            <h2>خلاصه پیش‌فاکتور</h2>
            <div className="summary-lines">
              <p><span>جمع قیمت پایه</span><strong>{formatPrice(cart.baseTotal)} تومان</strong></p>
              {discount > 0 && <p className="discount"><span>تخفیف محصول و حجم سفارش</span><strong>− {formatPrice(discount)} تومان</strong></p>}
              <p><span>هزینه ارسال عمده</span><strong>پس از انتخاب روش ارسال</strong></p>
            </div>
            <div className="summary-total">
              <span>مبلغ فعلی سفارش</span>
              <div><strong>{formatPrice(cart.subtotal)}</strong><small>تومان</small></div>
            </div>
            <Link className="primary-button checkout-button" href="/checkout">ادامه و ثبت سفارش <ArrowLeft /></Link>
            <div className="summary-assurance"><ShieldCheck /><span><strong>قیمت‌گذاری امن سرور</strong><small>مبلغ نهایی لحظه ثبت سفارش از دیتابیس محاسبه می‌شود.</small></span></div>
          </aside>
        </div>
      </section>
    </>
  );
}
