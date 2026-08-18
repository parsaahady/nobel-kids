'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, BadgePercent, Minus, PackageCheck, Plus, ShieldCheck, ShoppingBag, Trash2 } from 'lucide-react';
import { products, formatPrice } from '@/data/products';
import { getBaseLineTotal, getTierLabel, getWholesaleLineTotal, getWholesaleUnitPrice, PACK_SIZE } from '@/data/wholesale';
import { useStore } from './Providers';

export default function CartClient() {
  const { cart, removeFromCart, updateQuantity } = useStore();
  const rows = cart.map((item) => ({ ...item, product: products.find((product) => product.id === item.productId)! })).filter((item) => item.product);
  const subtotal = rows.reduce((sum, item) => sum + getWholesaleLineTotal(item.product, item.quantity), 0);
  const originalTotal = rows.reduce((sum, item) => sum + getBaseLineTotal(item.product, item.quantity), 0);
  const discount = originalTotal - subtotal;
  const totalPacks = rows.reduce((sum, item) => sum + item.quantity, 0);
  const totalPieces = totalPacks * PACK_SIZE;

  if (!rows.length) return <section className="container empty-cart"><div className="empty-cart-visual"><span><ShoppingBag /></span><i>🐢</i></div><h1>سفارش عمده شما هنوز خالی است</h1><p>مدل‌ها را در پک‌های ۵ عددی انتخاب کنید و پیش‌فاکتور خود را بسازید.</p><Link className="primary-button" href="/products">انتخاب مدل‌های عمده <ArrowLeft /></Link></section>;

  return (
    <>
      <section className="soft-page-head wholesale-cart-head"><div className="container"><span>پیش‌فاکتور عمده</span><h1>پک‌های انتخابی شما</h1><p>{rows.length.toLocaleString('fa-IR')} مدل · {totalPacks.toLocaleString('fa-IR')} پک · {totalPieces.toLocaleString('fa-IR')} عدد</p></div></section>
      <div className="container cart-layout">
        <section className="cart-items">
          <div className="cart-list-head"><strong>مدل‌های سفارش</strong><span>هر پک شامل {PACK_SIZE.toLocaleString('fa-IR')} عدد است</span></div>
          {rows.map((item) => {
            const unitPrice = getWholesaleUnitPrice(item.product, item.quantity);
            const lineTotal = getWholesaleLineTotal(item.product, item.quantity);
            return <article className="cart-row wholesale-cart-row" key={`${item.productId}-${item.size}-${item.color}`}>
              <Link href={`/products/${item.product.slug}`} className="cart-image"><Image src={item.product.image} alt={item.product.name} fill sizes="130px" /></Link>
              <div className="cart-row-copy"><Link href={`/products/${item.product.slug}`}><h2>{item.product.name}</h2></Link><div className="cart-attributes"><span><i style={{ background: item.product.colors.find((color) => color.name === item.color)?.hex }} />{item.color}</span><span>{item.size}</span></div><div className="line-tier"><BadgePercent />{getTierLabel(item.quantity)} · هر عدد {formatPrice(unitPrice)} تومان</div><div className="cart-mobile-price"><strong>{formatPrice(lineTotal)}</strong> تومان</div></div>
              <div className="cart-quantity-wrap"><small>تعداد پک</small><div className="cart-quantity"><button onClick={() => updateQuantity(item.productId, item.size, item.color, item.quantity - 1)}>{item.quantity === 1 ? <Trash2 /> : <Minus />}</button><strong>{item.quantity.toLocaleString('fa-IR')}</strong><button onClick={() => updateQuantity(item.productId, item.size, item.color, Math.min(item.product.stock, item.quantity + 1))}><Plus /></button></div><em>{(item.quantity * PACK_SIZE).toLocaleString('fa-IR')} عدد</em></div>
              <div className="cart-price"><strong>{formatPrice(lineTotal)}</strong><span>تومان</span><small>هر عدد {formatPrice(unitPrice)}</small></div>
              <button className="cart-delete" onClick={() => removeFromCart(item.productId, item.size, item.color)} aria-label="حذف"><Trash2 /></button>
            </article>;
          })}
          <Link className="continue-shopping" href="/products">افزودن مدل دیگر به پیش‌فاکتور <Plus /></Link>
        </section>
        <aside className="order-summary wholesale-summary">
          <div className="summary-pack-icon"><PackageCheck /><span><strong>{totalPacks.toLocaleString('fa-IR')} پک</strong><small>{totalPieces.toLocaleString('fa-IR')} عدد پوشاک</small></span></div>
          <h2>خلاصه پیش‌فاکتور</h2>
          <div className="summary-lines"><p><span>جمع قیمت پایه</span><strong>{formatPrice(originalTotal)} تومان</strong></p>{discount > 0 && <p className="discount"><span>تخفیف محصول و حجم سفارش</span><strong>− {formatPrice(discount)} تومان</strong></p>}<p><span>هزینه ارسال عمده</span><strong>پس از انتخاب روش ارسال</strong></p></div>
          <div className="summary-total"><span>مبلغ فعلی سفارش</span><div><strong>{formatPrice(subtotal)}</strong><small>تومان</small></div></div>
          <Link className="primary-button checkout-button" href="/checkout">ثبت اطلاعات و دریافت پیش‌فاکتور <ArrowLeft /></Link>
          <div className="summary-assurance"><ShieldCheck /><span><strong>ثبت سفارش به‌منزله پرداخت نیست</strong><small>موجودی و مبلغ نهایی با مسئول فروش تأیید می‌شود.</small></span></div>
        </aside>
      </div>
    </>
  );
}
