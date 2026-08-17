'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Banknote, Check, ChevronLeft, CreditCard, MapPin, PackageCheck, ShieldCheck, Store, Truck } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { products, formatPrice } from '@/data/products';
import { useStore } from './Providers';

export default function CheckoutClient() {
  const { cart, clearCart } = useStore();
  const [shipping, setShipping] = useState('post');
  const [payment, setPayment] = useState('online');
  const [loading, setLoading] = useState(false);
  const [orderCode, setOrderCode] = useState('');
  const total = useMemo(() => cart.reduce((sum, item) => sum + (products.find((product) => product.id === item.productId)?.price || 0) * item.quantity, 0), [cart]);
  const shippingCost = shipping === 'post' ? 79000 : 0;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customer: Object.fromEntries(form), cart, shipping, payment, total: total + shippingCost }) });
      const data = await response.json();
      setOrderCode(data.orderCode || `NBL-${Date.now().toString().slice(-6)}`);
      clearCart();
    } finally { setLoading(false); }
  };

  if (orderCode) return <section className="container order-success"><motion.div initial={{ opacity: 0, scale: .94 }} animate={{ opacity: 1, scale: 1 }}><span className="success-check"><Check /></span><small>سفارش با موفقیت ثبت شد</small><h1>ممنون که نوبل را انتخاب کردی!</h1><p>کد پیگیری سفارش شما</p><strong dir="ltr">{orderCode}</strong><div>برای هماهنگی نهایی سفارش، همکاران ما با شما تماس می‌گیرند.</div><Link className="primary-button" href="/products">بازگشت به فروشگاه <ArrowLeft /></Link></motion.div></section>;
  if (!cart.length) return <section className="container empty-cart checkout-empty"><div className="empty-cart-visual"><span><PackageCheck /></span><i>🐢</i></div><h1>سفارشی برای ثبت وجود ندارد</h1><p>ابتدا مدل‌های موردنظرتان را به سبد خرید اضافه کنید.</p><Link className="primary-button" href="/products">مشاهده محصولات <ArrowLeft /></Link></section>;

  return (
    <>
      <section className="checkout-head"><div className="container"><div><Link href="/cart">سبد خرید</Link><ChevronLeft /><strong>اطلاعات ارسال</strong><ChevronLeft /><span>پرداخت</span></div><h1>تکمیل سفارش</h1></div></section>
      <form className="container checkout-layout" onSubmit={submit}>
        <div className="checkout-forms">
          <section className="form-card"><div className="form-card-head"><span><MapPin /></span><div><small>مرحله ۱</small><h2>مشخصات تحویل‌گیرنده</h2></div></div><div className="form-grid"><label><span>نام و نام خانوادگی</span><input required name="name" placeholder="مثلاً محمد امینی" /></label><label><span>شماره موبایل</span><input required name="mobile" inputMode="tel" dir="ltr" placeholder="09xxxxxxxxx" pattern="09[0-9]{9}" /></label><label><span>استان</span><select required name="province" defaultValue="تهران"><option>تهران</option><option>البرز</option><option>اصفهان</option><option>فارس</option><option>خراسان رضوی</option><option>سایر استان‌ها</option></select></label><label><span>شهر</span><input required name="city" placeholder="نام شهر" /></label><label className="full"><span>نشانی دقیق</span><textarea required name="address" placeholder="خیابان، کوچه، پلاک و واحد" /></label><label><span>کد پستی</span><input required name="postalCode" inputMode="numeric" dir="ltr" placeholder="۱۰ رقم بدون خط تیره" /></label></div></section>

          <section className="form-card"><div className="form-card-head"><span><Truck /></span><div><small>مرحله ۲</small><h2>روش ارسال</h2></div></div><div className="choice-cards"><label className={shipping === 'post' ? 'active' : ''}><input type="radio" name="shippingMethod" value="post" checked={shipping === 'post'} onChange={() => setShipping('post')} /><span><Truck /></span><p><strong>ارسال با پست</strong><small>ارسال به سراسر کشور</small></p><b>{formatPrice(79000)} تومان</b><i><Check /></i></label><label className={shipping === 'pickup' ? 'active' : ''}><input type="radio" name="shippingMethod" value="pickup" checked={shipping === 'pickup'} onChange={() => setShipping('pickup')} /><span><Store /></span><p><strong>تحویل حضوری</strong><small>بازار بزرگ تهران</small></p><b>رایگان</b><i><Check /></i></label></div></section>

          <section className="form-card"><div className="form-card-head"><span><CreditCard /></span><div><small>مرحله ۳</small><h2>روش پرداخت</h2></div></div><div className="payment-choices"><label className={payment === 'online' ? 'active' : ''}><input type="radio" name="paymentMethod" value="online" checked={payment === 'online'} onChange={() => setPayment('online')} /><span><CreditCard /></span><p><strong>پرداخت آنلاین</strong><small>درگاه امن بانکی</small></p><i><Check /></i></label><label className={payment === 'coordinate' ? 'active' : ''}><input type="radio" name="paymentMethod" value="coordinate" checked={payment === 'coordinate'} onChange={() => setPayment('coordinate')} /><span><Banknote /></span><p><strong>هماهنگی با فروش</strong><small>ویژه سفارش‌های عمده</small></p><i><Check /></i></label></div></section>
        </div>
        <aside className="checkout-summary order-summary"><h2>صورت‌حساب</h2><div className="checkout-mini-items">{cart.slice(0, 3).map((item) => { const p = products.find((product) => product.id === item.productId); return p ? <div key={`${item.productId}-${item.size}`}><span>{item.quantity.toLocaleString('fa-IR')}×</span><p><strong>{p.shortName}</strong><small>{item.size}، {item.color}</small></p><b>{formatPrice(p.price * item.quantity)}</b></div> : null; })}{cart.length > 3 && <small>و {(cart.length - 3).toLocaleString('fa-IR')} محصول دیگر</small>}</div><div className="summary-lines"><p><span>جمع کالاها</span><strong>{formatPrice(total)} تومان</strong></p><p><span>ارسال</span><strong>{shippingCost ? `${formatPrice(shippingCost)} تومان` : 'رایگان'}</strong></p></div><div className="summary-total"><span>مبلغ نهایی</span><div><strong>{formatPrice(total + shippingCost)}</strong><small>تومان</small></div></div><button className="primary-button checkout-button" disabled={loading}>{loading ? <><span className="custom-loader" /> در حال ثبت...</> : <>ثبت نهایی سفارش <ArrowLeft /></>}</button><div className="summary-assurance"><ShieldCheck /><span><strong>اطلاعات شما محفوظ است</strong><small>استفاده فقط برای پردازش سفارش</small></span></div></aside>
      </form>
    </>
  );
}
