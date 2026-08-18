'use client';

import { FormEvent, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Instagram, MapPin, MessageCircle, Phone, Send, Smartphone, UserRound } from 'lucide-react';
import { siteInfo } from '@/data/site';
import { submitContactMessage } from '@/lib/static-services';
import IconBubble from './IconBubble';

export default function ContactClient() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setLoading(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    await submitContactMessage(Object.fromEntries(form));
    setLoading(false); setSent(true); formElement.reset();
  };
  return (
    <>
      <section className="contact-hero"><div className="container"><div><span>ارتباط با نوبل</span><h1>برای یک همکاریِ خوب،<br /><em>از همین‌جا شروع کنیم.</em></h1><p>برای دریافت موجودی، هماهنگی پک‌ها و ثبت سفارش عمده مستقیم با فروش نوبل در ارتباط باشید.</p></div><div className="contact-hero-mark"><span>🐢</span><strong>NOBEL</strong><small>kids</small></div></div></section>
      <section className="container contact-cards">
        <a href="tel:02155813240"><IconBubble tone="rose" size="lg"><Phone /></IconBubble><span><small>تلفن ثابت</small><strong dir="ltr">{siteInfo.phone}</strong><em>تماس با فروشگاه</em></span></a>
        <a href="tel:09123005065"><IconBubble tone="mint" size="lg"><Smartphone /></IconBubble><span><small>موبایل سفارش عمده</small><strong dir="ltr">{siteInfo.mobile}</strong><em>مسئول هماهنگی: {siteInfo.manager}</em></span></a>
        <a href={siteInfo.instagramUrl} target="_blank" rel="noreferrer"><IconBubble tone="butter" size="lg"><Instagram /></IconBubble><span><small>اینستاگرام</small><strong dir="ltr">{siteInfo.instagram}</strong><em>مشاهده کالکشن و موجودی تازه</em></span></a>
      </section>
      <section className="container contact-main">
        <div className="location-panel"><div className="location-map" aria-label="موقعیت فروشگاه در بازار بزرگ تهران"><span className="map-road road-1" /><span className="map-road road-2" /><span className="map-road road-3" /><i className="map-block b1" /><i className="map-block b2" /><i className="map-block b3" /><div className="map-pin"><MapPin /><span>نوبل کیدز</span></div><small>بازار بزرگ تهران</small></div><div className="location-copy"><span className="tiny-label">آدرس فروشگاه</span><h2>بازار بزرگ تهران</h2><p>{siteInfo.address}</p><div><MapPin /><span><strong>مراجعه حضوری</strong><small>پیش از مراجعه برای هماهنگی تماس بگیرید.</small></span></div><a className="secondary-button" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(siteInfo.address)}`} target="_blank" rel="noreferrer">مسیریابی روی نقشه</a></div></div>
        <div className="contact-form-card"><div className="form-card-head"><span><MessageCircle /></span><div><small>پیام مستقیم</small><h2>فرم تماس</h2></div></div><p>نام فروشگاه و موضوع سفارش عمده را بنویسید؛ پیام مستقیم برای مسئول هماهنگی ارسال می‌شود.</p><form onSubmit={submit}><div><label><span>نام و نام خانوادگی</span><input name="name" required placeholder="نام شما" /></label><label><span>شماره تماس</span><input name="phone" required inputMode="tel" dir="ltr" placeholder="09xxxxxxxxx" /></label></div><label><span>نام فروشگاه یا مجموعه</span><input name="business" required placeholder="نام مجموعه شما" /></label><label><span>موضوع</span><select name="subject"><option>دریافت موجودی و سفارش عمده</option><option>پیگیری پیش‌فاکتور عمده</option><option>پرسش درباره پک و سایزبندی</option><option>درخواست همکاری فروش</option></select></label><label><span>متن پیام</span><textarea name="message" required placeholder="مدل، تعداد پک یا پرسش خود را کوتاه و دقیق بنویسید" /></label><button className="primary-button" disabled={loading}>{loading ? <><span className="custom-loader" /> در حال ارسال</> : <>ارسال پیام <Send /></>}</button></form><AnimatePresence>{sent && <motion.div className="form-success" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}><Check /> پیام شما ثبت شد؛ برای پیگیری سریع‌تر می‌توانید با شماره موبایل تماس بگیرید.</motion.div>}</AnimatePresence></div>
      </section>
      <section className="container contact-about"><div><span className="tiny-label">درباره ما</span><h2>نوبل کیدز؛ از ۱۳۹۶</h2><p>{siteInfo.history}</p></div><div><span><strong>تضمین</strong><small>در کیفیت</small></span><i>🐢</i><p>پک‌های ۵ عددی و بیشتر<br />مستقیم از تولید</p></div></section>
    </>
  );
}
