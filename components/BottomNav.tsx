'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Grid2X2, Home, ShoppingBag, UserRound } from 'lucide-react';
import { useStore } from './Providers';

export default function BottomNav() {
  const pathname = usePathname();
  const { cartCount } = useStore();
  const items = [
    { href: '/', label: 'خانه', icon: Home },
    { href: '/products', label: 'دسته‌بندی', icon: Grid2X2 },
    { href: '/cart', label: 'سبد خرید', icon: ShoppingBag, count: cartCount },
    { href: '/account', label: 'حساب من', icon: UserRound },
  ];
  return (
    <nav className="bottom-nav" aria-label="منوی موبایل">
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
        return <Link key={item.href} href={item.href} className={`${active ? 'active' : ''} ${item.href === '/cart' ? 'cart-target' : ''}`}><span><Icon />{Boolean(item.count) && <b>{item.count}</b>}</span><small>{item.label}</small></Link>;
      })}
    </nav>
  );
}
