'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Check, Edit3, Grid2X2, Plus, Trash2, X } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api-client';
import { useStore } from '@/components/Providers';
import type { CategoryDTO } from '@/types';

export default function CategoriesTab() {
  const { notify } = useStore();
  const [items, setItems] = useState<CategoryDTO[] | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryDTO | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const data = await api.get<{ items: CategoryDTO[] }>('/api/admin/categories');
    setItems(data.items);
  }, []);

  useEffect(() => { void load().catch(() => notify('دریافت دسته‌بندی‌ها ممکن نشد', 'error')); }, [load, notify]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get('name')),
      slug: String(form.get('slug') || '') || undefined,
      description: String(form.get('description') || '') || null,
      isActive: form.get('isActive') === 'on',
      sortOrder: Number(form.get('sortOrder') || 0),
    };
    try {
      if (editing) await api.patch(`/api/admin/categories/${editing.id}`, payload);
      else await api.post('/api/admin/categories', payload);
      await load();
      setFormOpen(false); setEditing(null);
      notify(editing ? 'دسته‌بندی ویرایش شد' : 'دسته‌بندی جدید ساخته شد');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'ذخیره ممکن نشد');
    }
  };

  const toggle = async (category: CategoryDTO) => {
    try {
      await api.patch(`/api/admin/categories/${category.id}`, { name: category.name, isActive: !category.isActive });
      await load();
    } catch (err) { notify(err instanceof ApiError ? err.message : 'تغییر ممکن نشد', 'error'); }
  };

  const remove = async (category: CategoryDTO) => {
    try {
      await api.del(`/api/admin/categories/${category.id}`);
      await load();
      notify('دسته‌بندی حذف شد');
    } catch (err) { notify(err instanceof ApiError ? err.message : 'حذف ممکن نشد', 'error'); }
  };

  return (
    <section className="admin-categories">
      <div className="admin-card-head">
        <div><small>ساختار فروشگاه</small><h2>دسته‌بندی‌ها</h2></div>
        <button className="primary-button" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus /> دسته جدید</button>
      </div>

      <AnimatePresence>
        {formOpen && (
          <motion.form className="admin-card category-form" onSubmit={submit} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <h3><Grid2X2 /> {editing ? 'ویرایش دسته‌بندی' : 'دسته‌بندی جدید'}</h3>
            <div className="form-grid">
              <label><span>نام *</span><input name="name" required defaultValue={editing?.name} /></label>
              <label><span>نامک (slug)</span><input name="slug" dir="ltr" defaultValue={editing?.slug} placeholder="girls" /></label>
              <label><span>ترتیب نمایش</span><input name="sortOrder" type="number" min={0} defaultValue={editing?.sortOrder ?? 0} /></label>
              <label className="full"><span>توضیح</span><input name="description" defaultValue={editing?.description ?? ''} /></label>
            </div>
            <label className="checkbox-row"><input type="checkbox" name="isActive" defaultChecked={editing?.isActive ?? true} /><span>فعال (نمایش در فروشگاه)</span></label>
            {error && <small className="coupon-error">{error}</small>}
            <div className="form-actions">
              <button type="button" className="secondary-button" onClick={() => { setFormOpen(false); setEditing(null); }}><X /> انصراف</button>
              <button className="primary-button"><Check /> ذخیره</button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {!items ? <div className="admin-loading"><span className="custom-loader" /></div> : (
        <div className="category-admin-list">
          {items.map((category) => (
            <article key={category.id} className={category.isActive ? '' : 'inactive'}>
              <div>
                <strong>{category.name}</strong>
                <small dir="ltr">{category.slug}</small>
                <small>{(category.productCount ?? 0).toLocaleString('fa-IR')} محصول · ترتیب {category.sortOrder.toLocaleString('fa-IR')}</small>
              </div>
              <span className={`status ${category.isActive ? 'active' : 'inactive'}`}><i />{category.isActive ? 'فعال' : 'غیرفعال'}</span>
              <div className="row-actions">
                <button onClick={() => { setEditing(category); setFormOpen(true); }} title="ویرایش"><Edit3 /></button>
                <button onClick={() => void toggle(category)} title={category.isActive ? 'غیرفعال کردن' : 'فعال کردن'}><Check /></button>
                <button onClick={() => void remove(category)} title="حذف"><Trash2 /></button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
