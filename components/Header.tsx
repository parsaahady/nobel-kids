'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Heart, Menu, Search, Settings2, ShoppingBag, UserRound, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api-client';
import { formatPrice } from '@/lib/pricing';
import type { ProductListItemDTO } from '@/types';
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
  const { cartCount, wishlistIds, user } = useStore();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductListItemDTO[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (searchOpen) window.setTimeout(() => inputRef.current?.focus(), 100);
  }, [searchOpen]);

  useEffect(() => { setMenuOpen(false); setSearchOpen(false); }, [pathname]);

  const runSearch = useCallback(async (value: string) => {
    const trimmed = value.trim();
    try {
      setSearching(true);
      const data = trimmed.length >= 2
        ? await api.get<{ items: ProductListItemDTO[] }>(`/api/search?q=${encodeURIComponent(trimmed)}`)
        : await api.get<{ items: ProductListItemDTO[] }>('/api/products?pageSize=4');
      setResults(data.items);
    } catch {
      /* keep stale results on transient errors */
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => void runSearch(query), 300);
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [query, searchOpen, runSearch]);

  const isAdmin = user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN');

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
            {isAdmin && <Link className="icon-button desktop-only" href="/admin" aria-label="پنل مدیریت"><Settings2 /></Link>}
            <Link className="icon-button desktop-only" href="/account?tab=wishlist" aria-label="علاقه‌مندی‌ها">
              <Heart />{wishlistIds.length > 0 && <b>{wishlistIds.length.toLocaleString('fa-IR')}</b>}
            </Link>
            <Link className="icon-button desktop-only" href="/account" aria-label="حساب کاربری"><UserRound /></Link>
            <Link className="icon-button cart-target" href="/cart" aria-label={`سفارش عمده، ${cartCount} پک`}>
              <ShoppingBag />{cartCount > 0 && <b>{cartCount.toLocaleString('fa-IR')}</b>}
            </Link>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {searchOpen && (
          <motion.div className="search-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => event.target === event.currentTarget && setSearchOpen(false)}>
            <motion.div className="search-panel" initial={{ opacity: 0, y: -20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -12 }}>
              <div className="search-input-wrap">
                <Search />
                <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="نام، رنگ یا دسته‌بندی مدل" />
                {query && <button onClick={() => setQuery('')} aria-label="پاک کردن"><X size={18} /></button>}
              </div>
              <div className="search-meta">
                <span>{searching ? 'در حال جست‌وجو…' : query ? `${results.length.toLocaleString('fa-IR')} نتیجه` : 'مدل‌های مناسب سفارش عمده'}</span>
                <button onClick={() => setSearchOpen(false)}>بستن</button>
              </div>
              <div className="search-results">
                {results.length ? results.map((product) => (
                  <Link key={product.id} href={`/products/${product.slug}`} onClick={() => setSearchOpen(false)}>
                    <span className="search-thumb">{product.image && <Image src={product.image} alt={product.name} fill sizes="64px" />}</span>
                    <span>
                      <strong>{product.name}</strong>
                      <small>هر عدد {formatPrice(product.price)} تومان · پک {product.packSize.toLocaleString('fa-IR')} عددی</small>
                    </span>
                  </Link>
                )) : <div className="empty-search">{searching ? '…' : 'مدلی با این عبارت پیدا نشد.'}</div>}
              </div>
              <Link className="search-all" href={`/products${query ? `?q=${encodeURIComponent(query)}` : ''}`} onClick={() => setSearchOpen(false)}>مشاهده همه مدل‌های عمده</Link>
            </motion.div>
          </motion.div>
        )}
        {menuOpen && (
          <motion.div className="drawer-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenuOpen(false)}>
            <motion.aside className="mobile-drawer" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 280 }} onClick={(event) => event.stopPropagation()}>
              <div className="drawer-head"><Logo compact /><button className="icon-button" onClick={() => setMenuOpen(false)}><X /></button></div>
              <nav>
                {links.map((link, index) => <Link key={link.href} href={link.href}><span>۰{index + 1}</span>{link.label}</Link>)}
                {isAdmin && <Link href="/admin"><span>۰۶</span>پنل مدیریت</Link>}
              </nav>
              <div className="drawer-contact"><small>هماهنگی سفارش عمده</small><strong>۰۹۱۲۳۰۰۵۰۶۵</strong><span>مسئول سفارش: امینی</span></div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
