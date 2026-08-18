'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, Filter, Search, SlidersHorizontal, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import ProductCard from './ProductCard';
import { products } from '@/data/products';

const categoryOptions = ['همه', 'دخترانه', 'پسرانه', 'نوزادی', 'اکسسوری'];
const sizeOptions = ['۳–۴ سال', '۴–۵ سال', '۶–۷ سال', '۸–۹ سال', '۱۰–۱۱ سال', '۱۲–۱۳ سال', '۱۴–۱۵ سال'];
const colorOptions = [
  { name: 'قهوه‌ای', hex: '#6b4538' }, { name: 'صورتی', hex: '#d7a9a3' }, { name: 'کرم', hex: '#ead8b7' },
  { name: 'سبز', hex: '#8ca276' }, { name: 'مشکی', hex: '#202020' }, { name: 'سرمه‌ای', hex: '#273556' }
];

export default function ProductCatalog() {
  const params = useSearchParams();
  const [category, setCategory] = useState(params.get('category') || 'همه');
  const [collection, setCollection] = useState(params.get('collection') || '');
  const [query, setQuery] = useState(params.get('q') || '');
  const [sort, setSort] = useState(params.get('sort') || 'newest');
  const [sizes, setSizes] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState(1400000);
  const [availableOnly, setAvailableOnly] = useState(true);
  const [visible, setVisible] = useState(8);
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    setCategory(params.get('category') || 'همه');
    setCollection(params.get('collection') || '');
    setQuery(params.get('q') || '');
    setSort(params.get('sort') || 'newest');
  }, [params]);

  useEffect(() => { setVisible(8); }, [category, collection, query, sort, sizes, colors, maxPrice, availableOnly]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = products.filter((product) => {
      const categoryMatch = category === 'همه' || product.category === category;
      const collectionMatch = !collection || product.collection === collection;
      const queryMatch = !q || [product.name, product.shortName, product.category, product.collection, ...product.tags].join(' ').toLowerCase().includes(q);
      const sizeMatch = !sizes.length || sizes.some((size) => product.sizes.includes(size));
      const colorMatch = !colors.length || colors.some((color) => product.colors.some((item) => item.name.includes(color)));
      return categoryMatch && collectionMatch && queryMatch && sizeMatch && colorMatch && product.price <= maxPrice && (!availableOnly || product.stock > 0);
    });
    return [...list].sort((a, b) => {
      if (sort === 'cheapest') return a.price - b.price;
      if (sort === 'expensive') return b.price - a.price;
      if (sort === 'bestseller') return Number(b.isBestSeller) - Number(a.isBestSeller) || b.rating - a.rating;
      return Number(b.isNew) - Number(a.isNew) || b.id - a.id;
    });
  }, [category, collection, query, sort, sizes, colors, maxPrice, availableOnly]);

  const toggleValue = (value: string, current: string[], setter: (values: string[]) => void) => setter(current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  const activeFilterCount = sizes.length + colors.length + (maxPrice < 1400000 ? 1 : 0) + (!availableOnly ? 1 : 0);
  const reset = () => { setSizes([]); setColors([]); setMaxPrice(1400000); setAvailableOnly(true); setCategory('همه'); setCollection(''); };

  const FilterContent = () => (
    <>
      <div className="filter-block">
        <h3>دسته‌بندی</h3>
        <div className="category-filter">{categoryOptions.map((item) => <button key={item} onClick={() => { setCategory(item); setCollection(''); }} className={category === item ? 'active' : ''}><span>{item}</span><small>{(item === 'همه' ? products.length : products.filter((p) => p.category === item).length).toLocaleString('fa-IR')}</small></button>)}</div>
      </div>
      <div className="filter-block">
        <h3>سایز</h3>
        <div className="size-filter">{sizeOptions.map((size) => <button key={size} className={sizes.includes(size) ? 'active' : ''} onClick={() => toggleValue(size, sizes, setSizes)}>{sizes.includes(size) && <Check />}{size}</button>)}</div>
      </div>
      <div className="filter-block">
        <h3>رنگ</h3>
        <div className="color-filter">{colorOptions.map((color) => <button key={color.name} className={colors.includes(color.name) ? 'active' : ''} onClick={() => toggleValue(color.name, colors, setColors)}><i style={{ backgroundColor: color.hex }} />{color.name}{colors.includes(color.name) && <Check />}</button>)}</div>
      </div>
      <div className="filter-block price-filter">
        <div><h3>حداکثر قیمت</h3><strong>{maxPrice.toLocaleString('fa-IR')} تومان</strong></div>
        <input type="range" min="500000" max="1400000" step="50000" value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} aria-label="حداکثر قیمت" />
        <div className="range-labels"><span>۵۰۰ هزار</span><span>۱/۴ میلیون</span></div>
      </div>
      <label className="switch-row"><span><strong>فقط پک‌های موجود</strong><small>نمایش مدل‌های آماده سفارش</small></span><input type="checkbox" checked={availableOnly} onChange={(e) => setAvailableOnly(e.target.checked)} /><i /></label>
    </>
  );

  return (
    <>
      <div className="container shop-toolbar">
        <div className="catalog-search"><Search /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="جست‌وجو بین مدل‌های عمده" />{query && <button onClick={() => setQuery('')}><X /></button>}</div>
        <button className="mobile-filter-button" onClick={() => setFilterOpen(true)}><Filter /> فیلترها {activeFilterCount > 0 && <b>{activeFilterCount.toLocaleString('fa-IR')}</b>}</button>
        <div className="sort-wrap"><SlidersHorizontal /><span>مرتب‌سازی:</span><select value={sort} onChange={(e) => setSort(e.target.value)}><option value="newest">جدیدترین</option><option value="bestseller">پرفروش‌ترین</option><option value="cheapest">ارزان‌ترین</option><option value="expensive">گران‌ترین</option></select><ChevronDown /></div>
      </div>

      <div className="container catalog-layout">
        <aside className="filter-sidebar"><div className="filter-title"><div><Filter /><strong>فیلتر مدل‌ها</strong></div>{activeFilterCount > 0 && <button onClick={reset}>پاک‌کردن</button>}</div><FilterContent /></aside>
        <section className="catalog-results">
          <div className="catalog-summary"><p><strong>{filtered.length.toLocaleString('fa-IR')}</strong> مدل قابل سفارش عمده</p>{collection && <button className="active-chip" onClick={() => setCollection('')}>{collection}<X /></button>}{category !== 'همه' && <button className="active-chip" onClick={() => setCategory('همه')}>{category}<X /></button>}</div>
          {filtered.length ? <><motion.div layout className="product-grid catalog-grid">{filtered.slice(0, visible).map((product, index) => <motion.div layout key={product.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * .035, .25) }}><ProductCard product={product} priority={index < 4} /></motion.div>)}</motion.div>{visible < filtered.length && <button className="load-more" onClick={() => setVisible((current) => current + 8)}><span>نمایش مدل‌های بیشتر</span><small>{visible.toLocaleString('fa-IR')} از {filtered.length.toLocaleString('fa-IR')}</small></button>}</> : <div className="empty-catalog"><span>🐢</span><h2>مدلی با این فیلتر پیدا نشد</h2><p>فیلترها را تغییر دهید تا پک‌های عمده بیشتری ببینید.</p><button className="secondary-button" onClick={reset}>پاک‌کردن فیلترها</button></div>}
        </section>
      </div>

      <AnimatePresence>
        {filterOpen && <motion.div className="drawer-backdrop filter-drawer-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setFilterOpen(false)}><motion.aside className="filter-drawer" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 260 }} onClick={(e) => e.stopPropagation()}><div className="filter-drawer-head"><div><strong>فیلتر مدل‌ها</strong>{activeFilterCount > 0 && <small>{activeFilterCount.toLocaleString('fa-IR')} فیلتر فعال</small>}</div><button onClick={() => setFilterOpen(false)}><X /></button></div><div className="filter-drawer-body"><FilterContent /></div><div className="filter-drawer-actions"><button onClick={reset}>پاک‌کردن</button><button className="primary-button" onClick={() => setFilterOpen(false)}>نمایش {filtered.length.toLocaleString('fa-IR')} مدل</button></div></motion.aside></motion.div>}
      </AnimatePresence>
    </>
  );
}
