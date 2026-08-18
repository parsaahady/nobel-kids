'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Banknote, Check, ChevronLeft, ClipboardCheck, CreditCard, MapPin, PackageCheck, ShieldCheck, Store, Truck } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { products, formatPrice } from '@/data/products';
import { getWholesaleLineTotal, PACK_SIZE } from '@/data/wholesale';
import { submitWholesaleOrder } from '@/lib/static-services';
import { useStore } from './Providers';

export default function CheckoutClient() {
  const { cart, clearCart } = useStore();
  const [shipping, setShipping] = useState('freight');
  const [payment, setPayment] = useState('invoice');
  const [loading, setLoading] = useState(false);
  const [orderCode, setOrderCode] = useState('');
  const total = useMemo(() => cart.reduce((sum, item) => {
    const product = products.find((row) => row.id === item.productId);
    return sum + (product ? getWholesaleLineTotal(product, item.quantity) : 0);
  }, 0), [cart]);
  const totalPacks = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPieces = totalPacks * PACK_SIZE;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      const data = await submitWholesaleOrder({ customer: Object.fromEntries(form), cart, shipping, payment, total, totalPacks, totalPieces });
      setOrderCode(data.orderCode);
      clearCart();
    } finally { setLoading(false); }
  };

  if (orderCode) return <section className="container order-success"><motion.div initial={{ opacity: 0, scale: .94 }} animate={{ opacity: 1, scale: 1 }}><span className="success-check"><Check /></span><small>درخواست پیش‌فاکتور ثبت شد</small><h1>سفارش عمده شما به نوبل رسید</h1><p>کد پیگیری درخواست</p><strong dir="ltr">{orderCode}</strong><div>مسئول فروش برای تأیید موجودی، ترکیب سایز، روش ارسال و مبلغ نهایی با شما تماس می‌گیرد.</div><Link className="primary-button" href="/products">انتخاب مدل‌های بیشتر <ArrowLeft /></Link></motion.div></section>;
  if (!cart.length) return <section className="container empty-cart checkout-empty"><div className="empty-cart-visual"><span><PackageCheck /></span><i>🐢</i></div><h1>پیش‌فاکتوری برای ثبت وجود ندارد</h1><p>ابتدا حداقل یک پک ۵ عددی از مدل موردنظر انتخاب کنید.</p><Link className="primary-button" href="/products">مشاهده مدل‌های عمده <ArrowLeft /></Link></section>;

  return (
    <>
      <section className="checkout-head"><div className="container"><div><Link href="/cart">پک‌های انتخابی</Link><ChevronLeft /><strong>اطلاعات همکار</strong><ChevronLeft /><span>ثبت پیش‌فاکتور</span></div><h1>نهایی‌کردن درخواست عمده</h1></div></section>
      <form className="container checkout-layout" onSubmit={submit}>
        <div className="checkout-forms">
          <section className="form-card"><div className="form-card-head"><span><Store /></span><div><small>مرحله ۱</small><h2>مشخصات خریدار عمده</h2></div></div><div className="form-grid"><label><span>نام و نام خانوادگی</span><input required name="name" placeholder="نام مسئول خرید" /></label><label><span>شماره موبایل</span><input required name="mobile" inputMode="tel" dir="ltr" placeholder="09xxxxxxxxx" pattern="09[0-9]{9}" /></label><label><span>نام فروشگاه یا مجموعه</span><input required name="business" placeholder="نام فروشگاه" /></label><label><span>شهر محل فعالیت</span><input required name="city" placeholder="نام شهر" /></label><label><span>استان</span><select required name="province" defaultValue="تهران"><option>تهران</option><option>البرز</option><option>اصفهان</option><option>فارس</option><option>خراسان رضوی</option><option>سایر استان‌ها</option></select></label><label><span>تلفن ثابت (اختیاری)</span><input name="phone" inputMode="tel" dir="ltr" placeholder="021xxxxxxxx" /></label><label className="full"><span>نشانی تحویل</span><textarea required name="address" placeholder="نشانی کامل فروشگاه یا انبار" /></label></div></section>

          <section className="form-card"><div className="form-card-head"><span><Truck /></span><div><small>مرحله ۲</small><h2>روش دریافت سفارش</h2></div></div><div className="choice-cards"><label className={shipping === 'freight' ? 'active' : ''}><input type="radio" name="shippingMethod" value="freight" checked={shipping === 'freight'} onChange={() => setShipping('freight')} /><span><Truck /></span><p><strong>باربری یا تیپاکس</strong><small>مناسب سفارش‌های عمده شهرستان</small></p><b>پس‌کرایه</b><i><Check /></i></label><label className={shipping === 'pickup' ? 'active' : ''}><input type="radio" name="shippingMethod" value="pickup" checked={shipping === 'pickup'} onChange={() => setShipping('pickup')} /><span><Store /></span><p><strong>تحویل حضوری</strong><small>بازار بزرگ تهران</small></p><b>رایگان</b><i><Check /></i></label></div></section>

          <section className="form-card"><div className="form-card-head"><span><ClipboardCheck /></span><div><small>مرحله ۳</small><h2>تأیید و پرداخت</h2></div></div><div className="payment-choices"><label className={payment === 'invoice' ? 'active' : ''}><input type="radio" name="paymentMethod" value="invoice" checked={payment === 'invoice'} onChange={() => setPayment('invoice')} /><span><ClipboardCheck /></span><p><strong>دریافت پیش‌فاکتور</strong><small>تأیید موجودی و تماس مسئول فروش</small></p><i><Check /></i></label><label className={payment === 'transfer' ? 'active' : ''}><input type="radio" name="paymentMethod" value="transfer" checked={payment === 'transfer'} onChange={() => setPayment('transfer')} /><span><Banknote /></span><p><strong>واریز پس از تأیید</strong><small>اطلاعات پرداخت بعد از هماهنگی</small></p><i><Check /></i></label></div></section>
        </div>
        <aside className="checkout-summary order-summary"><div className="summary-pack-icon"><PackageCheck /><span><strong>{totalPacks.toLocaleString('fa-IR')} پک عمده</strong><small>{totalPieces.toLocaleString('fa-IR')} عدد پوشاک</small></span></div><h2>خلاصه درخواست</h2><div className="checkout-mini-items">{cart.slice(0, 3).map((item) => { const p = products.find((product) => product.id === item.productId); return p ? <div key={`${item.productId}-${item.size}`}><span>{item.quantity.toLocaleString('fa-IR')} پک</span><p><strong>{p.shortName}</strong><small>{item.size}، {item.color}</small></p><b>{formatPrice(getWholesaleLineTotal(p, item.quantity))}</b></div> : null; })}{cart.length > 3 && <small>و {(cart.length - 3).toLocaleString('fa-IR')} مدل دیگر</small>}</div><div className="summary-lines"><p><span>جمع سفارش</span><strong>{formatPrice(total)} تومان</strong></p><p><span>ارسال</span><strong>{shipping === 'pickup' ? 'تحویل رایگان' : 'پس‌کرایه'}</strong></p></div><div className="summary-total"><span>مبلغ فعلی پیش‌فاکتور</span><div><strong>{formatPrice(total)}</strong><small>تومان</small></div></div><button className="primary-button checkout-button" disabled={loading}>{loading ? <><span className="custom-loader" /> در حال ثبت...</> : <>ثبت درخواست پیش‌فاکتور <ArrowLeft /></>}</button><div className="summary-assurance"><ShieldCheck /><span><strong>بدون پرداخت در این مرحله</strong><small>مبلغ نهایی پس از کنترل موجودی تأیید می‌شود.</small></span></div></aside>
      </form>
    </>
  );
}
