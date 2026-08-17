'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ChevronLeft, Heart, LogOut, MapPin, Package, Plus, ShieldCheck, Smartphone, UserRound } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import ProductCard from './ProductCard';
import { products } from '@/data/products';
import { useStore } from './Providers';

const tabs = [
  { id: 'profile', label: 'مشخصات من', icon: UserRound },
  { id: 'orders', label: 'سفارش‌ها', icon: Package },
  { id: 'wishlist', label: 'علاقه‌مندی‌ها', icon: Heart },
  { id: 'addresses', label: 'آدرس‌ها', icon: MapPin },
];

export default function AccountClient() {
  const params = useSearchParams();
  const [loggedIn, setLoggedIn] = useState(false);
  const [register, setRegister] = useState(false);
  const [activeTab, setActiveTab] = useState(params.get('tab') || 'profile');
  const [name, setName] = useState('کاربر نوبل');
  const { wishlist, notify } = useStore();

  useEffect(() => {
    const session = localStorage.getItem('nobel-session');
    if (session) { setLoggedIn(true); try { setName(JSON.parse(session).name || 'کاربر نوبل'); } catch {} }
  }, []);

  const login = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const userName = (data.get('name') as string) || 'کاربر نوبل';
    localStorage.setItem('nobel-session', JSON.stringify({ name: userName }));
    setName(userName); setLoggedIn(true); notify(register ? 'حساب کاربری ساخته شد' : 'با موفقیت وارد شدید');
  };

  if (!loggedIn) return (
    <section className="account-auth-section">
      <div className="container account-auth-grid">
        <motion.div className="auth-card" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
          <div className="auth-icon"><UserRound /></div>
          <small>{register ? 'عضویت در نوبل' : 'خوش آمدید'}</small>
          <h1>{register ? 'ساخت حساب کاربری' : 'ورود به حساب نوبل'}</h1>
          <p>{register ? 'اطلاعات لازم برای پیگیری سفارش‌ها را وارد کنید.' : 'برای دیدن سفارش‌ها، آدرس‌ها و علاقه‌مندی‌ها وارد شوید.'}</p>
          <form onSubmit={login}>
            {register && <label><span>نام و نام خانوادگی</span><input name="name" required placeholder="نام شما" /></label>}
            <label><span>شماره موبایل</span><div className="input-with-icon"><Smartphone /><input name="mobile" required inputMode="tel" dir="ltr" placeholder="09xxxxxxxxx" pattern="09[0-9]{9}" /></div></label>
            <label><span>رمز عبور</span><input name="password" required minLength={4} type="password" placeholder="••••••••" /></label>
            <button className="primary-button">{register ? 'ثبت‌نام' : 'ورود'} <ArrowLeft /></button>
          </form>
          <button className="auth-toggle" onClick={() => setRegister(!register)}>{register ? 'حساب دارید؟ وارد شوید' : 'حساب ندارید؟ ثبت‌نام کنید'}</button>
          <div className="auth-secure"><ShieldCheck />اطلاعات شما نزد نوبل محفوظ می‌ماند.</div>
        </motion.div>
        <div className="auth-visual"><span className="auth-tag">NOBEL <small>kids</small></span><div className="auth-blob"><span>🐢</span><strong>باشگاه<br />کوچولوهای نوبل</strong></div><p>علاقه‌مندی‌ها، سفارش‌ها و آدرس‌های شما همیشه در دسترس است.</p></div>
      </div>
    </section>
  );

  const likedProducts = products.filter((product) => wishlist.includes(product.id));

  return (
    <>
      <section className="soft-page-head account-head"><div className="container"><span>حساب کاربری</span><h1>سلام، {name}</h1><p>سفارش‌ها و انتخاب‌های خود را از اینجا مدیریت کنید.</p></div></section>
      <div className="container account-layout">
        <aside className="account-sidebar"><div className="account-person"><span>{name.charAt(0)}</span><div><strong>{name}</strong><small>عضو باشگاه نوبل</small></div></div><nav>{tabs.map(({ id, label, icon: Icon }) => <button key={id} className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id)}><Icon />{label}{id === 'wishlist' && wishlist.length > 0 && <b>{wishlist.length.toLocaleString('fa-IR')}</b>}<ChevronLeft /></button>)}</nav><button className="logout-button" onClick={() => { localStorage.removeItem('nobel-session'); setLoggedIn(false); }}><LogOut /> خروج از حساب</button></aside>
        <section className="account-content">
          <AnimatePresence mode="wait">
            {activeTab === 'profile' && <motion.div key="profile" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}><div className="account-content-head"><div><small>اطلاعات شخصی</small><h2>مشخصات من</h2></div></div><form className="profile-form" onSubmit={(e) => { e.preventDefault(); notify('تغییرات ذخیره شد'); }}><label><span>نام و نام خانوادگی</span><input defaultValue={name} /></label><label><span>شماره موبایل</span><input dir="ltr" defaultValue="09120000000" /></label><label><span>تاریخ تولد کودک</span><input type="text" placeholder="مثلاً ۱۳۹۸/۰۵/۱۲" /></label><label><span>ایمیل (اختیاری)</span><input type="email" dir="ltr" placeholder="name@example.com" /></label><button className="primary-button">ذخیره تغییرات</button></form></motion.div>}
            {activeTab === 'orders' && <motion.div key="orders" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}><div className="account-content-head"><div><small>پیگیری خرید</small><h2>سفارش‌های من</h2></div></div><div className="account-empty"><span><Package /></span><h3>هنوز سفارشی ثبت نکرده‌اید</h3><p>بعد از ثبت سفارش، وضعیت آماده‌سازی و ارسال اینجا نمایش داده می‌شود.</p><Link className="secondary-button" href="/products">دیدن محصولات</Link></div></motion.div>}
            {activeTab === 'wishlist' && <motion.div key="wishlist" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}><div className="account-content-head"><div><small>انتخاب‌های دوست‌داشتنی</small><h2>علاقه‌مندی‌های من</h2></div><span>{wishlist.length.toLocaleString('fa-IR')} محصول</span></div>{likedProducts.length ? <div className="product-grid wishlist-grid">{likedProducts.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="account-empty"><span><Heart /></span><h3>لیست علاقه‌مندی خالی است</h3><p>روی قلب کنار هر محصول بزنید تا بعداً راحت‌تر پیدایش کنید.</p><Link className="secondary-button" href="/products">مشاهده فروشگاه</Link></div>}</motion.div>}
            {activeTab === 'addresses' && <motion.div key="addresses" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}><div className="account-content-head"><div><small>مقصد ارسال</small><h2>آدرس‌های من</h2></div><button className="secondary-button" onClick={() => notify('فرم افزودن آدرس آماده است')}><Plus /> افزودن آدرس</button></div><div className="account-empty"><span><MapPin /></span><h3>آدرسی ذخیره نشده</h3><p>هنگام ثبت اولین سفارش می‌توانید نشانی تحویل را ذخیره کنید.</p></div></motion.div>}
          </AnimatePresence>
        </section>
      </div>
    </>
  );
}
