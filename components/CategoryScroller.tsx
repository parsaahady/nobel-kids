'use client';

import Link from 'next/link';
import { Baby, Flower2, Shirt, Sparkles, Watch } from 'lucide-react';
import IconBubble from './IconBubble';

const categories = [
  { label: 'دخترانه', subtitle: 'مدل‌های رنگی و راحت', href: '/products?category=دخترانه', icon: Flower2, tone: 'rose' as const },
  { label: 'پسرانه', subtitle: 'استایل روزمره و آزاد', href: '/products?category=پسرانه', icon: Shirt, tone: 'sky' as const },
  { label: 'نوزادی', subtitle: 'لطیف و دوست‌داشتنی', href: '/products?category=نوزادی', icon: Baby, tone: 'butter' as const },
  { label: 'ست راحتی', subtitle: 'دورس و شلوار هماهنگ', href: '/products?collection=ست+راحتی', icon: Sparkles, tone: 'mint' as const },
  { label: 'اکسسوری', subtitle: 'تکمیل استایل کوچولوها', href: '/products?category=اکسسوری', icon: Watch, tone: 'cream' as const },
];

export default function CategoryScroller() {
  return <div className="category-scroller">{categories.map(({ icon: Icon, ...category }) => <Link href={category.href} key={category.label} className="category-card"><IconBubble tone={category.tone} size="lg"><Icon /></IconBubble><span><strong>{category.label}</strong><small>{category.subtitle}</small></span></Link>)}</div>;
}
