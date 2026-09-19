'use client';

import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { Copy, Edit3, PackagePlus, Plus, Search, Trash2, X } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api-client';
import { formatPrice } from '@/lib/pricing';
import { useStore } from '@/components/Providers';
import type { CategoryDTO, PagedResult, ProductListItemDTO } from '@/types';
import ProductForm from './ProductForm';

export type AdminProductRow = ProductListItemDTO & { sku?: string };
type RowWithSku = { id: string; name: string; sku: string };

export default function ProductsTab() {
  const { notify } = useStore();
  const [data, setData] = useState<PagedResult<ProductListItemDTO> | null>(null);
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [skus, setSkus] = useState<Record<string, string>>({});
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ProductListItemDTO | null>(null);
  const [stockFor, setStockFor] = useState<ProductListItemDTO | null>(null);

  useEffect(() => { void api.get<{ items: CategoryDTO[] }>('/api/admin/categories').then((d) => setCategories(d.items)).catch(() => undefined); }, []);

  const load = useCallback(async (pageWanted = page, q = query, cid = categoryId, st = status) => {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    if (cid) sp.set('categoryId', cid);
    if (st) sp.set('status', st);
    sp.set('page', String(pageWanted));
    const fresh = await api.get<PagedResult<ProductListItemDTO>>(`/api/admin/products?${sp.toString()}`);
    setData(fresh);
    const detailMap: Record<string, string> = {};
    for (const item of fresh.items as Array<ProductListItemDTO & Partial<RowWithSku>>) {
      if (item.sku) detailMap[item.id] = item.sku;
    }
    setSkus((prev) => ({ ...prev, ...detailMap }));
  }, [page, query, categoryId, status]);

  useEffect(() => { void load(1).catch(() => notify('دریافت محصولات ممکن نشد', 'error')); setPage(1); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [query, categoryId, status]);

  const goPage = (next: number) => { setPage(next); void load(next); };

  const duplicate = async (id: string) => {
    try {
      await api.post(`/api/admin/products/${id}/duplicate`);
      notify('کپی محصول به‌صورت پیش‌نویس ساخته شد');
      void load();
    } catch (error) { notify(error instanceof ApiError ? error.message : 'کپی ممکن نشد', 'error'); }
  };

  const softDelete = async (id: string) => {
    try {
      await api.del(`/api/admin/products/${id}`);
      notify('محصول بایگانی شد');
      setConfirmDelete(null);
      void load();
    } catch (error) { notify(error instanceof ApiError ? error.message : 'حذف ممکن نشد', 'error'); }
  };

  const statusFa = { DRAFT: 'پیش‌نویس', ACTIVE: 'فعال', ARCHIVED: 'بایگانی' } as const;

  return (
    <section className="admin-card products-admin-card">
      <div className="admin-list-tools">
        <div className="admin-search"><Search /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="جست‌وجوی مدل عمده" /></div>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="دسته‌بندی">
          <option value="">همه دسته‌ها</option>
          {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="وضعیت">
          <option value="">همه وضعیت‌ها</option>
          <option value="ACTIVE">فعال</option><option value="DRAFT">پیش‌نویس</option><option value="ARCHIVED">بایگانی</option>
        </select>
        <button className="primary-button" onClick={() => { setEditingId(null); setFormOpen(true); }}><Plus /> مدل جدید</button>
        <div className="admin-count">{data ? data.total.toLocaleString('fa-IR') : '…'} مدل</div>
      </div>

      {!data ? <div className="admin-loading"><span className="custom-loader" /></div> : data.items.length === 0 ? (
        <p className="admin-empty">مدلی پیدا نشد؛ با فیلتر دیگر تلاش کنید یا مدل جدید بسازید.</p>
      ) : (
        <>
          <div className="admin-product-table">
            <div className="admin-tr admin-th"><span>محصول</span><span>دسته</span><span>قیمت هر عدد</span><span>موجودی</span><span>وضعیت</span><span /></div>
            {data.items.map((product) => (
              <div className="admin-tr" key={product.id}>
                <div className="admin-product-cell">
                  <span>{product.image && <Image src={product.image} alt={product.name} fill sizes="56px" />}</span>
                  <p><strong>{product.name}</strong><small dir="ltr">{skus[product.id] ?? product.slug}</small></p>
                </div>
                <span>{product.category.name}</span>
                <span>{formatPrice(product.price)} تومان</span>
                <span className={product.stock < 6 ? 'low' : ''}>{product.stock.toLocaleString('fa-IR')} پک</span>
                <span className={`status ${product.status === 'ACTIVE' ? 'active' : 'inactive'}`}><i />{statusFa[product.status]}</span>
                <div className="row-actions">
                  <button onClick={() => setStockFor(product)} title="تغییر موجودی"><PackagePlus /></button>
                  <button onClick={() => { setEditingId(product.id); setFormOpen(true); }} title="ویرایش"><Edit3 /></button>
                  <button onClick={() => void duplicate(product.id)} title="کپی"><Copy /></button>
                  <button onClick={() => setConfirmDelete(product)} title="حذف (بایگانی)"><Trash2 /></button>
                </div>
              </div>
            ))}
          </div>
          {data.totalPages > 1 && (
            <div className="pager">
              <button disabled={page <= 1} onClick={() => goPage(page - 1)}>قبلی</button>
              <span>{page.toLocaleString('fa-IR')} از {data.totalPages.toLocaleString('fa-IR')}</span>
              <button disabled={page >= data.totalPages} onClick={() => goPage(page + 1)}>بعدی</button>
            </div>
          )}
        </>
      )}

      <AnimatePresence>
        {formOpen && (
          <ProductForm
            productId={editingId}
            categories={categories}
            onClose={() => setFormOpen(false)}
            onSaved={() => { setFormOpen(false); void load(); notify('محصول ذخیره شد'); }}
          />
        )}
        {confirmDelete && (
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmDelete(null)}>
            <motion.div className="confirm-card" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} onClick={(e) => e.stopPropagation()}>
              <h3>بایگانی «{confirmDelete.name}»؟</h3>
              <p>محصول از فروشگاه پنهان می‌شود؛ سفارش‌های قبلی خراب نمی‌شوند و بازیابی ممکن است.</p>
              <div className="form-actions">
                <button className="secondary-button" onClick={() => setConfirmDelete(null)}><X /> انصراف</button>
                <button className="primary-button danger" onClick={() => void softDelete(confirmDelete.id)}><Trash2 /> بایگانی شود</button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {stockFor && (
          <StockAdjust
            product={stockFor}
            onClose={() => setStockFor(null)}
            onSaved={() => { setStockFor(null); void load(); }}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

function StockAdjust({ product, onClose, onSaved }: { product: ProductListItemDTO; onClose: () => void; onSaved: () => void }) {
  const { notify } = useStore();
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    const form = new FormData(event.currentTarget);
    try {
      await api.post(`/api/admin/products/${product.id}/stock`, {
        quantity: Number(form.get('quantity')),
        reason: String(form.get('reason') || '') || null,
      });
      notify('موجودی به‌روز شد');
      onSaved();
    } catch (error) {
      notify(error instanceof ApiError ? error.message : 'ثبت ممکن نشد', 'error');
    } finally { setSaving(false); }
  };
  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.form className="confirm-card" onSubmit={submit} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} onClick={(e) => e.stopPropagation()}>
        <h3>تغییر موجودی «{product.shortName || product.name}»</h3>
        <p>موجودی فعلی: <b>{product.stock.toLocaleString('fa-IR')}</b> پک. عدد مثبت برای ورود و منفی برای خروج.</p>
        <label className="stacked"><span>تعداد تغییر (پک)</span><input name="quantity" type="number" required dir="ltr" placeholder="+۱۰ یا -۲" /></label>
        <label className="stacked"><span>دلیل</span><input name="reason" placeholder="مثلاً ورود شارژ تولید" /></label>
        <div className="form-actions">
          <button type="button" className="secondary-button" onClick={onClose}>انصراف</button>
          <button className="primary-button" disabled={saving}>ثبت تغییر</button>
        </div>
      </motion.form>
    </motion.div>
  );
}
