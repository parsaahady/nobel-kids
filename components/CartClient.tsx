'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Minus, Plus, ShieldCheck, ShoppingBag, Trash2 } from 'lucide-react';
import { products, formatPrice } from '@/data/products';
import { useStore } from './Providers';

export default function CartClient() {
  const { cart, removeFromCart, updateQuantity } = useStore();
  const rows = cart.map((item) => ({ ...item, product: products.find((product) => product.id === item.productId)! })).filter((item) => item.product);
  const subtotal = rows.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const originalTotal = rows.reduce((sum, item) => sum + (item.product.oldPrice || item.product.price) * item.quantity, 0);
  const discount = originalTotal - subtotal;

  if (!rows.length) return <section className="container empty-cart"><div className="empty-cart-visual"><span><ShoppingBag /></span><i>🐢</i></div><h1>سبد خریدت هنوز خالیه</h1><p>مدل‌های تازه نوبل را ببین و لباس‌های موردعلاقه‌ات را به سبد اضافه کن.</p><Link className="primary-button" href="/products">رفتن به فروشگاه <ArrowLeft /></Link></section>;

  return (
    <>
      <section className="soft-page-head"><div className="container"><span>سبد خرید</span><h1>انتخاب‌های شما</h1><p>{rows.length.toLocaleString('fa-IR')} مدل در سبد خرید قرار دارد.</p></div></section>
      <div className="container cart-layout">
        <section className="cart-items">
          <div className="cart-list-head"><strong>محصولات سبد</strong><span>{cart.reduce((sum, item) => sum + item.quantity, 0).toLocaleString('fa-IR')} کالا</span></div>
          {rows.map((item) => <article className="cart-row" key={`${item.productId}-${item.size}-${item.color}`}>
            <Link href={`/products/${item.product.slug}`} className="cart-image"><Image src={item.product.image} alt={item.product.name} fill sizes="130px" /></Link>
            <div className="cart-row-copy"><Link href={`/products/${item.product.slug}`}><h2>{item.product.name}</h2></Link><div className="cart-attributes"><span><i style={{ background: item.product.colors.find((color) => color.name === item.color)?.hex }} />{item.color}</span><span>سایز: {item.size}</span></div><div className="cart-mobile-price"><strong>{formatPrice(item.product.price * item.quantity)}</strong> تومان</div></div>
            <div className="cart-quantity"><button onClick={() => updateQuantity(item.productId, item.size, item.color, item.quantity - 1)}>{item.quantity === 1 ? <Trash2 /> : <Minus />}</button><strong>{item.quantity.toLocaleString('fa-IR')}</strong><button onClick={() => updateQuantity(item.productId, item.size, item.color, item.quantity + 1)}><Plus /></button></div>
            <div className="cart-price"><strong>{formatPrice(item.product.price * item.quantity)}</strong><span>تومان</span>{item.product.oldPrice && <del>{formatPrice(item.product.oldPrice * item.quantity)}</del>}</div>
            <button className="cart-delete" onClick={() => removeFromCart(item.productId, item.size, item.color)} aria-label="حذف"><Trash2 /></button>
          </article>)}
          <Link className="continue-shopping" href="/products">افزودن محصول دیگر <Plus /></Link>
        </section>
        <aside className="order-summary">
          <h2>خلاصه سفارش</h2>
          <div className="summary-lines"><p><span>جمع کالاها</span><strong>{formatPrice(originalTotal)} تومان</strong></p>{discount > 0 && <p className="discount"><span>تخفیف محصولات</span><strong>− {formatPrice(discount)} تومان</strong></p>}<p><span>هزینه ارسال</span><strong>در مرحله بعد</strong></p></div>
          <div className="summary-total"><span>مبلغ قابل پرداخت</span><div><strong>{formatPrice(subtotal)}</strong><small>تومان</small></div></div>
          <Link className="primary-button checkout-button" href="/checkout">ادامه و ثبت سفارش <ArrowLeft /></Link>
          <div className="summary-assurance"><ShieldCheck /><span><strong>تضمین در کیفیت</strong><small>کنترل کیفیت دوخت و پارچه نوبل</small></span></div>
        </aside>
      </div>
    </>
  );
}
