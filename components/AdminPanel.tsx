'use client';

import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { Box, Check, ChevronDown, CircleDollarSign, ClipboardList, Edit3, Grid2X2, LayoutDashboard, MoreVertical, PackageCheck, Plus, Search, Settings, ShoppingBag, Trash2, TrendingUp, X } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { products as initialProducts, formatPrice } from '@/data/products';
import { Product } from '@/types';
import { assetPath } from '@/lib/asset-path';
import { useStore } from './Providers';

const orders = [
  { id: 'NBL-10428', customer: 'سارا محمدی', date: '۲۷ مرداد ۱۴۰۵', count: 3, total: 2434000, status: 'در حال آماده‌سازی' },
  { id: 'NBL-10427', customer: 'علی رضایی', date: '۲۶ مرداد ۱۴۰۵', count: 2, total: 1826000, status: 'ارسال عمده' },
  { id: 'NBL-10426', customer: 'نگار احمدی', date: '۲۵ مرداد ۱۴۰۵', count: 1, total: 688000, status: 'تکمیل‌شده' },
];

export default function AdminPanel() {
  const [tab, setTab] = useState('dashboard');
  const [list, setList] = useState(initialProducts);
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const { notify } = useStore();
  const filtered = useMemo(() => list.filter((p) => p.name.includes(query) || p.collection.includes(query)), [list, query]);
  const lowStock = list.filter((p) => p.stock < 10);

  const saveProduct = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    if (modal === 'edit' && editing) {
      setList((prev) => prev.map((p) => p.id === editing.id ? { ...p, name: String(data.get('name')), price: Number(data.get('price')), stock: Number(data.get('stock')) } : p));
      notify('محصول ویرایش شد');
    } else {
      const base = initialProducts[0];
      setList((prev) => [{ ...base, id: Math.max(...prev.map((p) => p.id)) + 1, slug: `new-${Date.now()}`, name: String(data.get('name')), shortName: String(data.get('name')), price: Number(data.get('price')), stock: Number(data.get('stock')), image: assetPath('/products/photo_20.webp') }, ...prev]);
      notify('مدل عمده جدید اضافه شد');
    }
    setModal(null); setEditing(null);
  };

  const openEdit = (product: Product) => { setEditing(product); setModal('edit'); };
  const remove = (id: number) => { setList((prev) => prev.filter((p) => p.id !== id)); notify('محصول حذف شد'); };

  const menu = [
    { id: 'dashboard', label: 'نمای کلی', icon: LayoutDashboard }, { id: 'products', label: 'محصولات', icon: Box, count: list.length },
    { id: 'orders', label: 'سفارش‌ها', icon: ClipboardList, count: orders.length }, { id: 'categories', label: 'دسته‌بندی‌ها', icon: Grid2X2 },
  ];

  return (
    <section className="admin-shell container-wide">
      <aside className="admin-sidebar"><div className="admin-brand"><span>🐢</span><div><strong>NOBEL</strong><small>مدیریت فروشگاه</small></div></div><nav>{menu.map(({ icon: Icon, ...item }) => <button key={item.id} onClick={() => setTab(item.id)} className={tab === item.id ? 'active' : ''}><Icon />{item.label}{item.count && <b>{item.count.toLocaleString('fa-IR')}</b>}</button>)}</nav><div className="admin-sidebar-bottom"><button><Settings /> تنظیمات فروشگاه</button><div><span>ا</span><p><strong>مدیریت نوبل</strong><small>دسترسی کامل</small></p></div></div></aside>
      <main className="admin-main">
        <header className="admin-head"><div><small>پنل مدیریت نوبل کیدز</small><h1>{menu.find((item) => item.id === tab)?.label}</h1></div><button className="primary-button" onClick={() => { setEditing(null); setModal('add'); }}><Plus /> مدل عمده جدید</button></header>

        {tab === 'dashboard' && <div className="admin-dashboard"><div className="admin-stats"><div><span className="admin-stat-icon mint"><CircleDollarSign /></span><p><small>فروش این ماه</small><strong>۴۸٬۹۲۰٬۰۰۰ <em>تومان</em></strong><span className="positive"><TrendingUp /> ۱۲٪ رشد</span></p></div><div><span className="admin-stat-icon rose"><ShoppingBag /></span><p><small>پیش‌فاکتورهای جدید</small><strong>۲۸ <em>سفارش</em></strong><span>۷ درخواست امروز</span></p></div><div><span className="admin-stat-icon butter"><Box /></span><p><small>محصولات فعال</small><strong>{list.length.toLocaleString('fa-IR')} <em>مدل</em></strong><span>{lowStock.length.toLocaleString('fa-IR')} مدل کم‌موجود</span></p></div><div><span className="admin-stat-icon sky"><PackageCheck /></span><p><small>ارسال عمده</small><strong>۲۱ <em>بسته</em></strong><span>این ماه</span></p></div></div>
          <div className="admin-two-column"><section className="admin-card"><div className="admin-card-head"><div><small>وضعیت اخیر</small><h2>آخرین پیش‌فاکتورها</h2></div><button onClick={() => setTab('orders')}>مشاهده همه</button></div><OrderTable /></section><section className="admin-card low-stock-card"><div className="admin-card-head"><div><small>نیازمند توجه</small><h2>موجودی پک کم</h2></div><span>{lowStock.length.toLocaleString('fa-IR')} مورد</span></div>{lowStock.slice(0, 4).map((product) => <div className="low-stock-row" key={product.id}><span><Image src={product.image} alt={product.name} fill sizes="52px" /></span><p><strong>{product.shortName}</strong><small>NBL-{String(product.id).padStart(3, '0')}</small></p><b>{product.stock.toLocaleString('fa-IR')} پک</b></div>)}</section></div>
        </div>}

        {tab === 'products' && <section className="admin-card products-admin-card"><div className="admin-list-tools"><div className="admin-search"><Search /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="جست‌وجوی مدل عمده" /></div><select><option>همه دسته‌ها</option><option>دخترانه</option><option>پسرانه</option></select><div className="admin-count">{filtered.length.toLocaleString('fa-IR')} مدل</div></div><div className="admin-product-table"><div className="admin-tr admin-th"><span>محصول</span><span>دسته‌بندی</span><span>قیمت هر عدد</span><span>موجودی پک</span><span>وضعیت</span><span /></div>{filtered.map((product) => <div className="admin-tr" key={product.id}><div className="admin-product-cell"><span><Image src={product.image} alt={product.name} fill sizes="56px" /></span><p><strong>{product.name}</strong><small>NBL-{String(product.id).padStart(3, '0')}</small></p></div><span>{product.category}</span><span>{formatPrice(product.price)} تومان</span><span className={product.stock < 10 ? 'low' : ''}>{product.stock.toLocaleString('fa-IR')} پک</span><span className="status active"><i /> فعال</span><div className="row-actions"><button onClick={() => openEdit(product)}><Edit3 /></button><button onClick={() => remove(product.id)}><Trash2 /></button></div></div>)}</div></section>}

        {tab === 'orders' && <section className="admin-card orders-admin-card"><div className="admin-list-tools"><div><h2>سفارش‌های عمده</h2><small>پیگیری پیش‌فاکتور، آماده‌سازی و ارسال</small></div><select><option>همه وضعیت‌ها</option><option>در حال آماده‌سازی</option><option>ارسال عمده</option><option>تکمیل‌شده</option></select></div><OrderTable full /></section>}

        {tab === 'categories' && <section className="admin-categories"><div className="admin-card-head"><div><small>ساختار فروشگاه</small><h2>دسته‌بندی‌ها</h2></div><button className="secondary-button"><Plus /> دسته جدید</button></div><div>{['دخترانه', 'پسرانه', 'نوزادی', 'اکسسوری'].map((category, index) => <article key={category}><span className={`category-admin-icon c${index}`}>{['🎀','👕','🧸','🧢'][index]}</span><p><strong>{category}</strong><small>{list.filter((p) => p.category === category).length.toLocaleString('fa-IR')} محصول</small></p><button><MoreVertical /></button></article>)}</div></section>}
      </main>

      <AnimatePresence>{modal && <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModal(null)}><motion.form className="admin-product-modal" onSubmit={saveProduct} initial={{ opacity: 0, y: 25, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 15 }} onClick={(e) => e.stopPropagation()}><div className="modal-head"><div><Box /><span><strong>{modal === 'edit' ? 'ویرایش محصول' : 'افزودن مدل عمده'}</strong><small>اطلاعات فروش عمده مدل</small></span></div><button type="button" onClick={() => setModal(null)}><X /></button></div><label><span>نام مدل</span><input required name="name" defaultValue={editing?.name} placeholder="نام دقیق مدل" /></label><div><label><span>قیمت هر عدد (تومان)</span><input required name="price" type="number" defaultValue={editing?.price || 650000} /></label><label><span>موجودی پک</span><input required name="stock" type="number" defaultValue={editing?.stock || 10} /></label></div><label><span>دسته‌بندی</span><select defaultValue={editing?.category || 'دخترانه'}><option>دخترانه</option><option>پسرانه</option><option>نوزادی</option><option>اکسسوری</option></select></label><div className="admin-modal-actions"><button type="button" onClick={() => setModal(null)}>انصراف</button><button className="primary-button">ذخیره مدل <Check /></button></div></motion.form></motion.div>}</AnimatePresence>
    </section>
  );
}

function OrderTable({ full = false }: { full?: boolean }) {
  return <div className={`order-admin-table ${full ? 'full' : ''}`}><div className="order-tr order-th"><span>کد سفارش</span><span>مشتری</span>{full && <span>تاریخ</span>}<span>مبلغ</span><span>وضعیت</span></div>{orders.map((order) => <div className="order-tr" key={order.id}><strong dir="ltr">{order.id}</strong><span>{order.customer}<small>{order.count.toLocaleString('fa-IR')} کالا</small></span>{full && <span>{order.date}</span>}<span>{formatPrice(order.total)}<small>تومان</small></span><label className={`order-status ${order.status === 'ارسال عمده' ? 'sent' : order.status === 'تکمیل‌شده' ? 'done' : ''}`}>{order.status}<ChevronDown /></label></div>)}</div>;
}
