'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Heart, Menu, Search, ShoppingBag, UserRound, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { products, formatPrice } from '@/data/products';
import { useStore } from './Providers';
import Logo from './Logo';

const links = [
  { href: '/', label: 'خانه' },
  { href: '/products', label: 'خرید عمده' },
  { href: '/products?category=دخترانه', label: 'دخترانه' },
  { href: '/products?category=پسرانه', label: 'پسرانه' },
  { href: '/contact', label: 'تماس با ما' },
];

export default function Header() {
  const pathname = usePathname();
  const { cartCount, wishlist } = useStore();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) window.setTimeout(() => inputRef.current?.focus(), 100);
  }, [searchOpen]);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return products.slice(0, 4);
    return products.filter((product) => [product.name, product.shortName, product.category, product.collection, ...product.tags].join(' ').toLowerCase().includes(normalized)).slice(0, 6);
  }, [query]);

  return (
    <>
      <div className="top-note">فروش عمده مستقیم <span>•</span> پک ۵ عددی و بیشتر <span>•</span> تضمین کیفیت</div>
      <header className="site-header">
        <div className="container header-inner">
          <button className="mobile-menu-button icon-button" onClick={() => setMenuOpen(true)} aria-label="باز کردن منو"><Menu /></button>
          <Logo />
          <nav className="desktop-nav" aria-label="منوی اصلی">
            {links.map((link) => <Link key={link.href} className={pathname === link.href ? 'active' : ''} href={link.href}>{link.label}</Link>)}
          </nav>
          <div className="header-actions">
            <button className="search-pill" onClick={() => setSearchOpen(true)}><Search size={19} /><span>جست‌وجوی مدل عمده...</span></button>
            <button className="icon-button" onClick={() => setSearchOpen(true)} aria-label="جست‌وجو"><Search /></button>
            <Link className="icon-button desktop-only" href="/account?tab=wishlist" aria-label="علاقه‌مندی‌ها"><Heart />{wishlist.length > 0 && <b>{wishlist.length}</b>}</Link>
            <Link className="icon-button desktop-only" href="/account" aria-label="حساب کاربری"><UserRound /></Link>
            <Link className="icon-button cart-target" href="/cart" aria-label={`سفارش عمده، ${cartCount} پک`}><ShoppingBag />{cartCount > 0 && <b>{cartCount}</b>}</Link>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {searchOpen && (
          <motion.div className="search-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => event.target === event.currentTarget && setSearchOpen(false)}>
            <motion.div className="search-panel" initial={{ opacity: 0, y: -20, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -12 }}>
              <div className="search-input-wrap">
                <Search />
                <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="نام، رنگ یا دسته‌بندی مدل" />
                {query && <button onClick={() => setQuery('')} aria-label="پاک کردن"><X size={18} /></button>}
              </div>
              <div className="search-meta"><span>{query ? `${results.length.toLocaleString('fa-IR')} نتیجه` : 'مدل‌های مناسب سفارش عمده'}</span><button onClick={() => setSearchOpen(false)}>بستن</button></div>
              <div className="search-results">
                {results.length ? results.map((product) => (
                  <Link key={product.id} href={`/products/${product.slug}`} onClick={() => setSearchOpen(false)}>
                    <span className="search-thumb"><Image src={product.image} alt={product.name} fill sizes="64px" /></span>
                    <span><strong>{product.name}</strong><small>هر عدد {formatPrice(product.price)} تومان · پک ۵ عددی</small></span>
                  </Link>
                )) : <div className="empty-search">مدلی با این عبارت پیدا نشد.</div>}
              </div>
              <Link className="search-all" href={`/products${query ? `?q=${encodeURIComponent(query)}` : ''}`} onClick={() => setSearchOpen(false)}>مشاهده همه مدل‌های عمده</Link>
            </motion.div>
          </motion.div>
        )}
        {menuOpen && (
          <motion.div className="drawer-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenuOpen(false)}>
            <motion.aside className="mobile-drawer" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 280 }} onClick={(event) => event.stopPropagation()}>
              <div className="drawer-head"><Logo compact /><button className="icon-button" onClick={() => setMenuOpen(false)}><X /></button></div>
              <nav>{links.map((link, index) => <Link key={link.href} href={link.href}><span>۰{index + 1}</span>{link.label}</Link>)}</nav>
              <div className="drawer-contact"><small>هماهنگی سفارش عمده</small><strong>۰۹۱۲۳۰۰۵۰۶۵</strong><span>مسئول سفارش: امینی</span></div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
