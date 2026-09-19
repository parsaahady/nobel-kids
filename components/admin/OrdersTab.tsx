'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ClipboardList, Search, X } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api-client';
import { formatPrice } from '@/lib/pricing';
import { useStore } from '@/components/Providers';
import type { OrderDetailDTO, OrderSummaryDTO, PagedResult } from '@/types';
import { faDate, orderStatusFa, paymentStatusFa } from '../AccountClient';

type OrderRow = OrderSummaryDTO & { customerName: string; customerMobile: string };
type OrderDetail = OrderDetailDTO & { internalNote: string | null; statusHistory: unknown; allowedNext: string[] };

const statusOptions = ['', 'PENDING', 'AWAITING_PAYMENT', 'PAID', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];

export default function OrdersTab() {
  const { notify } = useStore();
  const [data, setData] = useState<PagedResult<OrderRow> | null>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<OrderDetail | null>(null);

  const load = useCallback(async (pageWanted = 1) => {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    if (status) sp.set('status', status);
    if (paymentStatus) sp.set('paymentStatus', paymentStatus);
    sp.set('page', String(pageWanted));
    setData(await api.get<PagedResult<OrderRow>>(`/api/admin/orders?${sp.toString()}`));
  }, [q, status, paymentStatus]);

  useEffect(() => { setPage(1); void load(1).catch(() => notify('دریافت سفارش‌ها ممکن نشد', 'error')); }, [load, notify]);

  const goPage = (next: number) => { setPage(next); void load(next); };

  const openDetail = async (id: string) => {
    const fresh = await api.get<{ order: OrderDetail }>(`/api/admin/orders/${id}`);
    setDetail(fresh.order);
  };

  return (
    <section className="admin-card orders-admin-card">
      <div className="admin-list-tools">
        <div><h2>سفارش‌های فروشگاه</h2><small>پیگیری پیش‌فاکتور، آماده‌سازی و ارسال</small></div>
        <div className="admin-search"><Search /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="شماره سفارش، نام یا موبایل مشتری" /></div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="فیلتر وضعیت">
          {statusOptions.map((s) => <option key={s} value={s}>{s === '' ? 'همه وضعیت‌ها' : (orderStatusFa[s]?.label ?? s)}</option>)}
        </select>
        <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} aria-label="فیلتر پرداخت">
          <option value="">همه پرداخت‌ها</option>
          <option value="PENDING">در انتظار</option><option value="SUCCESS">موفق</option><option value="FAILED">ناموفق</option><option value="REFUNDED">برگشت</option>
        </select>
      </div>

      {!data ? <div className="admin-loading"><span className="custom-loader" /></div> : data.items.length === 0 ? (
        <p className="admin-empty"><ClipboardList /> سفارشی مطابق فیلترها پیدا نشد.</p>
      ) : (
        <>
          <div className="order-admin-table full">
            <div className="order-tr order-th"><span>کد سفارش</span><span>مشتری</span><span>تاریخ</span><span>مبلغ</span><span>وضعیت</span><span>پرداخت</span></div>
            {data.items.map((order) => {
              const st = orderStatusFa[order.status] ?? { label: order.status, tone: 'info' };
              const ps = paymentStatusFa[order.paymentStatus] ?? { label: order.paymentStatus, tone: 'info' };
              return (
                <button className="order-tr clickable" key={order.id} onClick={() => void openDetail(order.id)}>
                  <strong dir="ltr">{order.orderNumber}</strong>
                  <span>{order.customerName}<small dir="ltr">{order.customerMobile}</small></span>
                  <span>{faDate(order.createdAt)}</span>
                  <span>{formatPrice(order.total)}<small>تومان</small></span>
                  <span className={`status-pill ${st.tone}`}>{st.label}</span>
                  <span className={`status-pill ${ps.tone}`}>{ps.label}</span>
                </button>
              );
            })}
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
        {detail && <OrderDrawer order={detail} onClose={() => setDetail(null)} onChanged={() => { void load(page); }} />}
      </AnimatePresence>
    </section>
  );
}

function OrderDrawer({ order, onClose, onChanged }: { order: OrderDetail; onClose: () => void; onChanged: () => void }) {
  const { notify } = useStore();
  const [current, setCurrent] = useState(order);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(order.internalNote ?? '');
  const [tracking, setTracking] = useState(order.trackingCode ?? '');

  const patch = async (payload: Record<string, unknown>) => {
    setBusy(true);
    try {
      await api.patch(`/api/admin/orders/${current.id}`, payload);
      const fresh = await api.get<{ order: OrderDetail }>(`/api/admin/orders/${current.id}`);
      setCurrent(fresh.order);
      onChanged();
      notify('سفارش به‌روز شد');
    } catch (error) {
      notify(error instanceof ApiError ? error.message : 'به‌روزرسانی ممکن نشد', 'error');
    } finally { setBusy(false); }
  };

  const saveMeta = (event: FormEvent) => {
    event.preventDefault();
    void patch({ trackingCode: tracking || null, internalNote: note || null });
  };

  const st = orderStatusFa[current.status] ?? { label: current.status, tone: 'info' };
  const ps = paymentStatusFa[current.paymentStatus] ?? { label: current.paymentStatus, tone: 'info' };

  return (
    <motion.div className="drawer-backdrop admin-detail-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.aside className="admin-detail-drawer" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <div><strong dir="ltr">{current.orderNumber}</strong><small>{faDate(current.createdAt)}</small></div>
          <button className="icon-button" onClick={onClose} aria-label="بستن"><X /></button>
        </div>

        <div className="drawer-body">
          <div className="detail-chips">
            <span className={`status-pill ${st.tone}`}>{st.label}</span>
            <span className={`status-pill ${ps.tone}`}>پرداخت: {ps.label}</span>
            <span className="status-pill info">{current.paymentMethod === 'GATEWAY' ? 'پرداخت آنلاین' : 'پیش‌فاکتور/دستی'}</span>
          </div>

          <section className="drawer-card">
            <h3>اقدام‌ها</h3>
            <div className="transition-buttons">
              {current.allowedNext.length === 0 && <small>وضعیت نهایی است؛ انتقال دیگری ممکن نیست.</small>}
              {current.allowedNext.map((nextStatus) => (
                <button key={nextStatus} disabled={busy} onClick={() => void patch({ status: nextStatus })} className={`transition-btn ${nextStatus}`}>
                  {orderStatusFa[nextStatus]?.label ?? nextStatus}
                  {nextStatus === 'PAID' && current.paymentMethod === 'MANUAL' && <small> (تأیید دریافت وجه)</small>}
                </button>
              ))}
            </div>
            {current.paymentMethod === 'MANUAL' && current.paymentStatus !== 'SUCCESS' && (
              <button className="secondary-button full" disabled={busy} onClick={() => void patch({ paymentStatus: 'SUCCESS' })}>ثبت دستی «پرداخت موفق»</button>
            )}
          </section>

          <section className="drawer-card">
            <h3>مشتری و تحویل</h3>
            <p><strong>{current.customerName}</strong>{current.businessName && <small> · {current.businessName}</small>}</p>
            <p dir="ltr">{current.customerMobile}</p>
            <p>{current.addressSnapshot.province}، {current.addressSnapshot.city}</p>
            <p>{current.addressSnapshot.address}</p>
            <p>روش ارسال: {current.shippingMethod === 'pickup' ? 'تحویل حضوری' : 'باربری / تیپاکس'}</p>
            {current.notes && <p className="order-notes">یادداشت مشتری: {current.notes}</p>}
          </section>

          <section className="drawer-card">
            <h3>اقلام سفارش</h3>
            {current.items.map((item) => (
              <div className="drawer-item" key={item.id}>
                <div><strong>{item.productName}</strong><small>{item.variantName}</small></div>
                <span>{item.quantity.toLocaleString('fa-IR')} پک × {formatPrice(item.unitPrice)}</span>
                <b>{formatPrice(item.total)}</b>
              </div>
            ))}
            <div className="drawer-total">
              <p><span>مبلغ اقلام</span><b>{formatPrice(current.subtotal)}</b></p>
              {current.discount > 0 && <p className="discount"><span>تخفیف</span><b>− {formatPrice(current.discount)}</b></p>}
              {current.shippingCost > 0 && <p><span>ارسال</span><b>{formatPrice(current.shippingCost)}</b></p>}
              <p className="grand"><span>قابل پرداخت</span><b>{formatPrice(current.total)} تومان</b></p>
            </div>
          </section>

          {current.payments.length > 0 && (
            <section className="drawer-card">
              <h3>پرداخت‌ها</h3>
              {current.payments.map((payment) => (
                <div className="drawer-item" key={payment.id}>
                  <div><strong>{payment.provider}</strong><small>{faDate(payment.createdAt)}</small></div>
                  <span className={`status-pill ${(paymentStatusFa[payment.status] ?? { tone: 'info' }).tone}`}>{paymentStatusFa[payment.status]?.label ?? payment.status}</span>
                  {payment.referenceId && <small dir="ltr">ref: {payment.referenceId}</small>}
                </div>
              ))}
            </section>
          )}

          <form className="drawer-card" onSubmit={saveMeta}>
            <h3>رهگیری و یادداشت داخلی</h3>
            <label className="stacked"><span>کد رهگیری مرسوله</span><input value={tracking} onChange={(e) => setTracking(e.target.value)} dir="ltr" placeholder="کد رهگیری باربری/پست" /></label>
            <label className="stacked"><span>یادداشت داخلی (فقط مدیران می‌بینند)</span><textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} /></label>
            <button className="secondary-button full" disabled={busy}>ذخیره <ChevronDown style={{ display: 'none' }} /></button>
          </form>
        </div>
      </motion.aside>
    </motion.div>
  );
}
