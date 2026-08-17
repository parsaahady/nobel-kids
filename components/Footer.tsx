import Link from 'next/link';
import { Instagram, MapPin, Phone, ShieldCheck, Smartphone } from 'lucide-react';
import { siteInfo } from '@/data/site';
import Logo from './Logo';
import IconBubble from './IconBubble';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-contact-strip">
        <div><IconBubble tone="rose"><Phone /></IconBubble><span><small>تلفن ثابت</small><a href="tel:02155813240" dir="ltr">{siteInfo.phone}</a></span></div>
        <div><IconBubble tone="mint"><Smartphone /></IconBubble><span><small>موبایل سفارش</small><a href="tel:09123005065" dir="ltr">{siteInfo.mobile}</a></span></div>
        <div><IconBubble tone="butter"><MapPin /></IconBubble><span><small>مراجعه حضوری</small><strong>بازار بزرگ تهران</strong></span></div>
      </div>
      <div className="container footer-main">
        <section className="footer-about">
          <Logo />
          <p>{siteInfo.history}</p>
          <div className="quality-seal"><ShieldCheck /><span><strong>{siteInfo.slogan}</strong><small>طراحی و تولید از ۱۳۹۶</small></span></div>
        </section>
        <section>
          <h3>دسترسی سریع</h3>
          <Link href="/products">همه محصولات</Link>
          <Link href="/products?category=دخترانه">پوشاک دخترانه</Link>
          <Link href="/products?category=پسرانه">پوشاک پسرانه</Link>
          <Link href="/cart">سبد خرید</Link>
          <Link href="/account">حساب کاربری</Link>
        </section>
        <section>
          <h3>اطلاعات تماس</h3>
          <p className="footer-address">{siteInfo.address}</p>
          <p>مسئول سفارش و هماهنگی: <strong>{siteInfo.manager}</strong></p>
          <a className="instagram-link" href={siteInfo.instagramUrl} target="_blank" rel="noreferrer"><Instagram />{siteInfo.instagram}</a>
        </section>
        <section className="trust-section">
          <h3>خرید مطمئن</h3>
          <div className="trust-cards"><div><ShieldCheck /><small>تضمین</small><strong>کیفیت</strong></div><div><span className="turtle-mini">🐢</span><small>تولید</small><strong>نوبل</strong></div></div>
          <p>هماهنگی سفارش‌های عمده از طریق شماره موبایل یا اینستاگرام انجام می‌شود.</p>
        </section>
      </div>
      <div className="footer-bottom"><div className="container"><span>© Nobel Kids</span><span>تولید و پخش عمده پوشاک بچه‌گانه</span></div></div>
    </footer>
  );
}
