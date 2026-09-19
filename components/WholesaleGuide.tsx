import Link from 'next/link';
import { ArrowLeft, Check, ClipboardCheck, Layers3, PackagePlus } from 'lucide-react';
import IconBubble from './IconBubble';

const steps = [
  { number: '۰۱', title: 'مدل و رنگ را انتخاب کنید', text: 'هر رنگ به‌عنوان یک ردیف مستقل به سفارش اضافه می‌شود.', icon: Layers3, tone: 'rose' as const },
  { number: '۰۲', title: 'تعداد پک را مشخص کنید', text: 'هر پک ۵ عدد است؛ یک پک یا تعداد بیشتر قابل سفارش است.', icon: PackagePlus, tone: 'mint' as const },
  { number: '۰۳', title: 'پیش‌فاکتور را تأیید کنید', text: 'موجودی، سایزبندی و ارسال با مسئول فروش نهایی می‌شود.', icon: ClipboardCheck, tone: 'sky' as const },
];

export default function WholesaleGuide() {
  return (
    <section id="wholesale-guide" className="wholesale-guide">
      <div className="container">
        <div className="wholesale-guide-head"><div><span>سفارش عمده، ساده و شفاف</span><h2>از انتخاب مدل تا پیش‌فاکتور</h2></div><p>حداقل سفارش هر مدل یک پک ۵ عددی است. با افزایش تعداد پک‌های همان مدل، قیمت همکاری به‌صورت خودکار بهتر می‌شود.</p></div>
        <div className="wholesale-steps">{steps.map(({ icon: Icon, ...step }) => <article key={step.number}><span className="step-number">{step.number}</span><IconBubble tone={step.tone} size="lg"><Icon /></IconBubble><div><h3>{step.title}</h3><p>{step.text}</p></div></article>)}</div>
        <div className="tier-panel"><div className="tier-intro"><small>قیمت‌گذاری پلکانی</small><h3>هرچه تعداد پک بیشتر، قیمت هر عدد بهتر</h3><p>تخفیف بر اساس تعداد پک هر مدل محاسبه می‌شود.</p></div><div className="tier-options"><div><span>۱ تا ۲ پک</span><strong>قیمت همکاری</strong><small>۵ تا ۱۰ عدد</small></div><div className="featured"><i><Check /></i><span>۳ تا ۵ پک</span><strong>۴٪ تخفیف</strong><small>۱۵ تا ۲۵ عدد</small></div><div><span>۶ پک و بیشتر</span><strong>۸٪ تخفیف</strong><small>۳۰ عدد به بالا</small></div></div><Link className="primary-button" href="/products">انتخاب مدل‌ها <ArrowLeft /></Link></div>
      </div>
    </section>
  );
}
