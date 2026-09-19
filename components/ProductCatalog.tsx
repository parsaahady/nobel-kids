'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, ChevronLeft, Filter, Search, SlidersHorizontal, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api-client';
import { formatPrice } from '@/lib/pricing';
import type { CategoryDTO, ProductListResult } from '@/types';
import ProductCard from './ProductCard';

type Props = {
  initial: ProductListResult;
  categories: CategoryDTO[];
  sizeOptions: string[];
};

const colorOptions = [
  { name: 'قهوه‌ای', hex: '#6b4538' }, { name: 'صورتی', hex: '#d7a9a3' }, { name: 'کرم', hex: '#ead8b7' },
  { name: 'سبز', hex: '#8ca276' }, { name: 'مشکی', hex: '#202020' }, { name: 'سرمه‌ای', hex: '#273556' }, { name: 'شیری', hex: '#f0e8d8' },
];

const MAX_PRICE = 1_400_000;

export default function ProductCatalog({ initial, categories, sizeOptions }: Props) {
  const params = useSearchParams();
  const router = useRouter();
  const [result, setResult] = useState<ProductListResult>(initial);
  const [category, setCategory] = useState(params.get('category') || 'همه');
  const [collection, setCollection] = useState(params.get('collection') || '');
  const [query, setQuery] = useState(params.get('q') || '');
  const [sort, setSort] = useState(params.get('sort') || 'newest');
  const [sizes, setSizes] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState(MAX_PRICE);
  const [availableOnly, setAvailableOnly] = useState(true);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const requestId = useRef(0);

  // Sync with URL changes (header links, browser back…).
  useEffect(() => {
    setCategory(params.get('category') || 'همه');
    setCollection(params.get('collection') || '');
    setQuery(params.get('q') || '');
    setSort(params.get('sort') || 'newest');
    setPage(1);
  }, [params]);

  const fetchPage = useCallback(
    async (pageWanted: number, state: { category: string; collection: string; query: string; sort: string; sizes: string[]; colors: string[]; maxPrice: number; availableOnly: boolean }) => {
      const id = ++requestId.current;
      setLoading(true);
      setFailed(false);
      try {
        const sp = new URLSearchParams();
        if (state.category && state.category !== 'همه') sp.set('category', state.category);
        if (state.collection) sp.set('collection', state.collection);
        if (state.query.trim()) sp.set('q', state.query.trim());
        if (state.sort) sp.set('sort', state.sort);
        if (state.sizes.length) sp.set('size', state.sizes[0]);
        if (state.colors.length) sp.set('color', state.colors[0]);
        if (state.maxPrice < MAX_PRICE) sp.set('maxPrice', String(state.maxPrice));
        sp.set('available', String(state.availableOnly));
        sp.set('page', String(pageWanted));
        sp.set('pageSize', '8');
        const fresh = await api.get<ProductListResult>(`/api/products?${sp.toString()}`);
        if (requestId.current !== id) return; // a newer request superseded this one
        setResult((prev) => (pageWanted === 1 ? fresh : { ...fresh, items: [...prev.items, ...fresh.items] }));
      } catch {
        if (requestId.current === id) setFailed(true);
      } finally {
        if (requestId.current === id) setLoading(false);
      }
    },
    [],
  );

  const stateRef = { category, collection, query, sort, sizes, colors, maxPrice, availableOnly };

  useEffect(() => {
    setPage(1);
    void fetchPage(1, stateRef);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, collection, query, sort, sizes, colors, maxPrice, availableOnly]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    void fetchPage(nextPage, stateRef);
  };

  const toggleValue = (value: string, current: string[], setter: (values: string[]) => void) =>
    setter(current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);

  const activeFilterCount = sizes.length + colors.length + (maxPrice < MAX_PRICE ? 1 : 0) + (!availableOnly ? 1 : 0);
  const reset = () => { setSizes([]); setColors([]); setMaxPrice(MAX_PRICE); setAvailableOnly(true); setCategory('همه'); setCollection(''); router.replace('/products'); };

  const categoryOptions = useMemo(() => {
    const active = categories.filter((c) => c.isActive);
    return [{ name: 'همه', slug: '', productCount: result.total }, ...active];
  }, [categories, result.total]);

  const FilterContent = () => (
    <>
      <div className="filter-block">
        <h3>دسته‌بندی</h3>
        <div className="category-filter">
          {categoryOptions.map((item) => (
            <button key={item.name} onClick={() => { setCategory(item.name); setCollection(''); }} className={category === item.name ? 'active' : ''}>
              <span>{item.name}</span>
              <small>{(item.productCount ?? 0).toLocaleString('fa-IR')}</small>
            </button>
          ))}
        </div>
      </div>
      <div className="filter-block">
        <h3>سایز</h3>
        <div className="size-filter">
          {sizeOptions.map((size) => (
            <button key={size} className={sizes.includes(size) ? 'active' : ''} onClick={() => toggleValue(size, sizes, setSizes)}>
              {sizes.includes(size) && <Check />}{size}
            </button>
          ))}
        </div>
      </div>
      <div className="filter-block">
        <h3>رنگ</h3>
        <div className="color-filter">
          {colorOptions.map((color) => (
            <button key={color.name} className={colors.includes(color.name) ? 'active' : ''} onClick={() => toggleValue(color.name, colors, setColors)}>
              <i style={{ backgroundColor: color.hex }} />{color.name}{colors.includes(color.name) && <Check />}
            </button>
          ))}
        </div>
      </div>
      <div className="filter-block price-filter">
        <div><h3>حداکثر قیمت</h3><strong>{formatPrice(maxPrice)} تومان</strong></div>
        <input type="range" min={500_000} max={MAX_PRICE} step={50_000} value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} aria-label="حداکثر قیمت" />
        <div className="range-labels"><span>۵۰۰ هزار</span><span>۱/۴ میلیون</span></div>
      </div>
      <label className="switch-row">
        <span><strong>فقط پک‌های موجود</strong><small>نمایش مدل‌های آماده سفارش</small></span>
        <input type="checkbox" checked={availableOnly} onChange={(e) => setAvailableOnly(e.target.checked)} /><i />
      </label>
    </>
  );

  const hasMore = result.items.length < result.total;

  return (
    <>
      <div className="container shop-toolbar">
        <div className="catalog-search">
          <Search /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="جست‌وجو بین مدل‌های عمده" />
          {query && <button onClick={() => setQuery('')}><X /></button>}
        </div>
        <button className="mobile-filter-button" onClick={() => setFilterOpen(true)}>
          <Filter /> فیلترها {activeFilterCount > 0 && <b>{activeFilterCount.toLocaleString('fa-IR')}</b>}
        </button>
        <div className="sort-wrap">
          <SlidersHorizontal /><span>مرتب‌سازی:</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="مرتب‌سازی">
            <option value="newest">جدیدترین</option>
            <option value="bestseller">پرفروش‌ترین</option>
            <option value="cheapest">ارزان‌ترین</option>
            <option value="expensive">گران‌ترین</option>
          </select>
          <ChevronDown />
        </div>
      </div>

      <div className="container catalog-layout">
        <aside className="filter-sidebar">
          <div className="filter-title">
            <div><Filter /><strong>فیلتر مدل‌ها</strong></div>
            {activeFilterCount > 0 && <button onClick={reset}>پاک‌کردن</button>}
          </div>
          <FilterContent />
        </aside>
        <section className="catalog-results">
          <div className="catalog-summary">
            <p><strong>{result.total.toLocaleString('fa-IR')}</strong> مدل قابل سفارش عمده</p>
            {collection && <button className="active-chip" onClick={() => { setCollection(''); router.replace(`/products?category=${encodeURIComponent(category)}`); }}>{collection}<X /></button>}
            {category !== 'همه' && <button className="active-chip" onClick={() => setCategory('همه')}>{category}<X /></button>}
          </div>
          {failed && result.items.length === 0 ? (
            <div className="empty-catalog"><span>🔌</span><h2>ارتباط با سرور برقرار نشد</h2><p>دوباره تلاش کنید.</p><button className="secondary-button" onClick={() => void fetchPage(1, stateRef)}>تلاش مجدد</button></div>
          ) : result.items.length ? (
            <>
              <motion.div layout className="product-grid catalog-grid">
                {result.items.map((product, index) => (
                  <motion.div layout key={product.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.035, 0.25) }}>
                    <ProductCard product={product} priority={index < 4} />
                  </motion.div>
                ))}
              </motion.div>
              {hasMore && (
                <button className="load-more" onClick={loadMore} disabled={loading}>
                  {loading ? <span className="custom-loader" /> : <><span>نمایش مدل‌های بیشتر</span><small>{result.items.length.toLocaleString('fa-IR')} از {result.total.toLocaleString('fa-IR')}</small></>}
                </button>
              )}
            </>
          ) : loading ? (
            <div className="catalog-loading"><div /><div /><div /><div /></div>
          ) : (
            <div className="empty-catalog"><span>🐢</span><h2>مدلی با این فیلتر پیدا نشد</h2><p>فیلترها را تغییر دهید تا پک‌های عمده بیشتری ببینید.</p><button className="secondary-button" onClick={reset}>پاک‌کردن فیلترها</button></div>
          )}
        </section>
      </div>

      <AnimatePresence>
        {filterOpen && (
          <motion.div className="drawer-backdrop filter-drawer-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setFilterOpen(false)}>
            <motion.aside className="filter-drawer" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 260 }} onClick={(e) => e.stopPropagation()}>
              <div className="filter-drawer-head">
                <div><strong>فیلتر مدل‌ها</strong>{activeFilterCount > 0 && <small>{activeFilterCount.toLocaleString('fa-IR')} فیلتر فعال</small>}</div>
                <button onClick={() => setFilterOpen(false)} aria-label="بستن"><X /></button>
              </div>
              <div className="filter-drawer-body"><FilterContent /></div>
              <div className="filter-drawer-actions">
                <button onClick={reset}>پاک‌کردن</button>
                <button className="primary-button" onClick={() => setFilterOpen(false)}>نمایش {result.total.toLocaleString('fa-IR')} مدل <ChevronLeft /></button>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
