'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Check, Plus, Tag, X } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api-client';
import { formatPrice } from '@/lib/pricing';
import { useStore } from '@/components/Providers';

type CouponRow = {
  id: string; code: string; type: 'PERCENT' | 'FIXED'; value: number;
  minOrderTotal: number | null; maxDiscount: number | null; usageLimit: number | null;
  usedCount: number; perUserLimit: number | null;
  startsAt: string | null; expiresAt: string | null; isActive: boolean;
  _count?: { redemptions: number };
};

export default function CouponsTab() {
  const { notify } = useStore();
  const [items, setItems] = useState<CouponRow[] | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const data = await api.get<{ items: CouponRow[] }>('/api/admin/coupons');
    setItems(data.items);
  }, []);

  useEffect(() => { void load().catch(() => notify('دریافت کدها ممکن نشد', 'error')); }, [load, notify]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    const localeDate = (key: string) => {
      const value = String(form.get(key) || '');
      return value ? new Date(value).toISOString() : null;
    };
    try {
      await api.post('/api/admin/coupons', {
        code: String(form.get('code')),
        type: String(form.get('type')),
        value: Number(form.get('value')),
        minOrderTotal: form.get('minOrderTotal') ? Number(form.get('minOrderTotal')) : null,
        maxDiscount: form.get('maxDiscount') ? Number(form.get('maxDiscount')) : null,
        usageLimit: form.get('usageLimit') ? Number(form.get('usageLimit')) : null,
        perUserLimit: form.get('perUserLimit') ? Number(form.get('perUserLimit')) : null,
        startsAt: localeDate('startsAt'),
        expiresAt: localeDate('expiresAt'),
        isActive: true,
      });
      await load();
      setFormOpen(false);
      notify('کد تخفیف ساخته شد');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'ساخت کد ممکن نشد');
    }
  };

  const toggle = async (coupon: CouponRow) => {
    try {
      await api.patch(`/api/admin/coupons/${coupon.id}`, { isActive: !coupon.isActive });
      await load();
      notify(coupon.isActive ? 'کد غیرفعال شد' : 'کد فعال شد');
    } catch (err) { notify(err instanceof ApiError ? err.message : 'تغییر ممکن نشد', 'error'); }
  };

  return (
    <section className="admin-card">
      <div className="admin-card-head">
        <div><small>ابزار فروش</small><h2>کدهای تخفیف</h2></div>
        <button className="primary-button" onClick={() => setFormOpen(true)}><Plus /> کد جدید</button>
      </div>

      <AnimatePresence>
        {formOpen && (
          <motion.form className="admin-card category-form" onSubmit={submit} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <h3><Tag /> کد تخفیف جدید</h3>
            <div className="form-grid">
              <label><span>کد (انگلیسی) *</span><input name="code" required dir="ltr" placeholder="NOBEL10" pattern="[A-Za-z0-9_\-]{3,40}" /></label>
              <label><span>نوع *</span><select name="type" defaultValue="PERCENT"><option value="PERCENT">درصدی</option><option value="FIXED">مبلغ ثابت (تومان)</option></select></label>
              <label><span>مقدار *</span><input name="value" type="number" required min={1} placeholder="۱۰ یا ۱۰۰۰۰۰" /></label>
              <label><span>حداقل مبلغ سفارش</span><input name="minOrderTotal" type="number" placeholder="اختیاری" /></label>
              <label><span>سقف تخفیف</span><input name="maxDiscount" type="number" placeholder="اختیاری" /></label>
              <label><span>محدودیت استفاده کلی</span><input name="usageLimit" type="number" placeholder="اختیاری" /></label>
              <label><span>محدودیت به ازای هر کاربر</span><input name="perUserLimit" type="number" placeholder="اختیاری" /></label>
              <label><span>شروع از</span><input name="startsAt" type="date" dir="ltr" /></label>
              <label><span>پایان</span><input name="expiresAt" type="date" dir="ltr" /></label>
            </div>
            {error && <small className="coupon-error">{error}</small>}
            <div className="form-actions">
              <button type="button" className="secondary-button" onClick={() => setFormOpen(false)}><X /> انصراف</button>
              <button className="primary-button"><Check /> ساخت کد</button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {!items ? <div className="admin-loading"><span className="custom-loader" /></div> : items.length === 0 ? (
        <p className="admin-empty">هنوز کد تخفیفی تعریف نشده است.</p>
      ) : (
        <div className="coupon-admin-list">
          {items.map((coupon) => (
            <article key={coupon.id} className={coupon.isActive ? '' : 'inactive'}>
              <div>
                <strong dir="ltr">{coupon.code}</strong>
                <small>{coupon.type === 'PERCENT' ? `${coupon.value.toLocaleString('fa-IR')}% تخفیف` : `${formatPrice(coupon.value)} تومان تخفیف`}</small>
                <small>
                  {coupon.minOrderTotal ? `حداقل خرید ${formatPrice(coupon.minOrderTotal)}` : 'بدون حداقل'} · استفاده: {(coupon.usedCount ?? 0).toLocaleString('fa-IR')}{coupon.usageLimit ? ` / ${coupon.usageLimit.toLocaleString('fa-IR')}` : ''}
                </small>
              </div>
              <span className={`status ${coupon.isActive ? 'active' : 'inactive'}`}><i />{coupon.isActive ? 'فعال' : 'غیرفعال'}</span>
              <button className="secondary-button" onClick={() => void toggle(coupon)}>{coupon.isActive ? 'غیرفعال' : 'فعال‌سازی'}</button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
