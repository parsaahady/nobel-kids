'use client';

import Link from 'next/link';
import { Baby, Flower2, Shirt, Sparkles, Watch } from 'lucide-react';
import IconBubble from './IconBubble';

const categories = [
  { label: 'دخترانه', subtitle: 'پک‌های رنگی و پرفروش', href: '/products?category=دخترانه', icon: Flower2, tone: 'rose' as const },
  { label: 'پسرانه', subtitle: 'مدل‌های روزمره فروشگاهی', href: '/products?category=پسرانه', icon: Shirt, tone: 'sky' as const },
  { label: 'نوزادی', subtitle: 'پک‌های لطیف و کاربردی', href: '/products?category=نوزادی', icon: Baby, tone: 'butter' as const },
  { label: 'ست راحتی', subtitle: 'پک دورس و شلوار هماهنگ', href: '/products?collection=ست+راحتی', icon: Sparkles, tone: 'mint' as const },
  { label: 'اکسسوری', subtitle: 'تکمیل سبد خرید عمده', href: '/products?category=اکسسوری', icon: Watch, tone: 'cream' as const },
];

export default function CategoryScroller() {
  return <div className="category-scroller">{categories.map(({ icon: Icon, ...category }) => <Link href={category.href} key={category.label} className="category-card"><IconBubble tone={category.tone} size="lg"><Icon /></IconBubble><span><strong>{category.label}</strong><small>{category.subtitle}</small></span></Link>)}</div>;
}
