import { BadgePercent, Boxes, Factory, PackageCheck } from 'lucide-react';
import IconBubble from './IconBubble';

const features = [
  { title: 'پک پایه ۵ عددی', text: 'شروع کم‌ریسک برای هر مدل', icon: PackageCheck, tone: 'mint' as const },
  { title: 'قیمت پلکانی', text: 'تخفیف بیشتر از ۳ پک', icon: BadgePercent, tone: 'butter' as const },
  { title: 'مستقیم از تولید', text: 'بدون واسطه برای همکاران', icon: Factory, tone: 'rose' as const },
  { title: 'سایزبندی کاربردی', text: 'پک جور یا انتخاب تک‌سایز', icon: Boxes, tone: 'sky' as const },
];

export default function FeatureCards() {
  return <div className="feature-cards">{features.map(({ icon: Icon, ...feature }) => <div key={feature.title}><IconBubble tone={feature.tone}><Icon /></IconBubble><span><strong>{feature.title}</strong><small>{feature.text}</small></span></div>)}</div>;
}
