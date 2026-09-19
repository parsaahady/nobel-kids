'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Box, ClipboardList, Grid2X2, LayoutDashboard, LogOut, Mail, Menu, ScrollText, Settings2, ShieldCheck, Tag, Users, X } from 'lucide-react';
import { useState } from 'react';
import AuditTab from './AuditTab';
import CategoriesTab from './CategoriesTab';
import CouponsTab from './CouponsTab';
import DashboardTab from './DashboardTab';
import MessagesTab from './MessagesTab';
import OrdersTab from './OrdersTab';
import ProductsTab from './ProductsTab';
import SettingsTab from './SettingsTab';
import UsersTab from './UsersTab';

type TabId = 'dashboard' | 'products' | 'orders' | 'categories' | 'users' | 'coupons' | 'audit' | 'messages' | 'settings';

export default function AdminPanel({ adminRole, adminName }: { adminRole: 'ADMIN' | 'SUPER_ADMIN'; adminName: string }) {
  const [tab, setTab] = useState<TabId>('dashboard');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const menu: Array<{ id: TabId; label: string; icon: typeof Box }> = [
    { id: 'dashboard', label: 'نمای کلی', icon: LayoutDashboard },
    { id: 'products', label: 'محصولات', icon: Box },
    { id: 'orders', label: 'سفارش‌ها', icon: ClipboardList },
    { id: 'categories', label: 'دسته‌بندی‌ها', icon: Grid2X2 },
    { id: 'users', label: 'کاربران', icon: Users },
    { id: 'coupons', label: 'کدهای تخفیف', icon: Tag },
    { id: 'audit', label: 'رویدادهای مدیران', icon: ScrollText },
    { id: 'messages', label: 'پیام‌های تماس', icon: Mail },
    { id: 'settings', label: 'امنیت', icon: ShieldCheck },
  ];

  async function adminLogout() {
    try { await fetch('/api/admin-auth/logout', { method: 'POST' }); } finally { window.location.assign('/admin/login'); }
  }

  const active = menu.find((item) => item.id === tab);

  const nav = (
    <nav>
      {menu.map(({ icon: Icon, ...item }) => (
        <button key={item.id} onClick={() => { setTab(item.id); setDrawerOpen(false); }} className={tab === item.id ? 'active' : ''}>
          <Icon />{item.label}
        </button>
      ))}
    </nav>
  );

  return (
    <section className="admin-shell container-wide">
      <aside className="admin-sidebar">
        <div className="admin-brand"><span>🐢</span><div><strong>NOBEL</strong><small>مدیریت فروشگاه</small></div></div>
        {nav}
        <div className="admin-sidebar-bottom">
          <Link href="/"><Settings2 size={17} /> مشاهده فروشگاه</Link>
          <button onClick={() => void adminLogout()}><LogOut size={17} /> خروج از پنل</button>
          <div><span>{adminName.charAt(0)}</span><p><strong>{adminName}</strong><small>{adminRole === 'SUPER_ADMIN' ? 'مدیر ارشد' : 'مدیر'}</small></p></div>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-head">
          <button className="admin-menu-button icon-button" onClick={() => setDrawerOpen(true)} aria-label="منوی مدیریت"><Menu /></button>
          <div><small>پنل مدیریت نوبل کیدز</small><h1>{active?.label}</h1></div>
        </header>
        {tab === 'dashboard' && <DashboardTab onGoOrders={(_status) => setTab('orders')} />}
        {tab === 'products' && <ProductsTab />}
        {tab === 'orders' && <OrdersTab />}
        {tab === 'categories' && <CategoriesTab />}
        {tab === 'users' && <UsersTab adminRole={adminRole} />}
        {tab === 'coupons' && <CouponsTab />}
        {tab === 'audit' && <AuditTab />}
        {tab === 'messages' && <MessagesTab />}
        {tab === 'settings' && <SettingsTab />}
      </main>

      <AnimatePresence>
        {drawerOpen && (
          <motion.div className="drawer-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawerOpen(false)}>
            <motion.aside className="mobile-drawer admin-drawer" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 280 }} onClick={(e) => e.stopPropagation()}>
              <div className="drawer-head"><strong>مدیریت فروشگاه</strong><button className="icon-button" onClick={() => setDrawerOpen(false)} aria-label="بستن"><X /></button></div>
              {nav}
              <div className="admin-drawer-bottom">
                <Link href="/">مشاهده فروشگاه</Link>
                <button onClick={() => void adminLogout()}>خروج از پنل</button>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
