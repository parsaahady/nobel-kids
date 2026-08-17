import { BadgeCheck, Boxes, Palette, Truck } from 'lucide-react';
import IconBubble from './IconBubble';

const features = [
  { title: 'تضمین کیفیت', text: 'دوخت و پارچه کنترل‌شده', icon: BadgeCheck, tone: 'mint' as const },
  { title: 'تولید مستقیم', text: 'عرضه مستقیم از نوبل کیدز', icon: Boxes, tone: 'butter' as const },
  { title: 'طراحی اختصاصی', text: 'رنگ‌های کاربردی و خاص', icon: Palette, tone: 'rose' as const },
  { title: 'ارسال سفارش', text: 'هماهنگی از بازار تهران', icon: Truck, tone: 'sky' as const },
];

export default function FeatureCards() {
  return <div className="feature-cards">{features.map(({ icon: Icon, ...feature }) => <div key={feature.title}><IconBubble tone={feature.tone}><Icon /></IconBubble><span><strong>{feature.title}</strong><small>{feature.text}</small></span></div>)}</div>;
}
