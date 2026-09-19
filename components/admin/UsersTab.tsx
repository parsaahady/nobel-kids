'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Search, ShieldCheck, UserCog, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api-client';
import { formatPrice } from '@/lib/pricing';
import { useStore } from '@/components/Providers';
import type { AddressDTO, OrderSummaryDTO, PagedResult, UserDTO } from '@/types';
import { faDate, orderStatusFa } from '../AccountClient';

type UserRow = UserDTO & { _count?: { orders: number } };
type UserDetail = { user: UserDTO; addresses: AddressDTO[]; orders: { items: OrderSummaryDTO[]; total: number }; wishlistCount: number };

const roleFa: Record<string, string> = { CUSTOMER: 'مشتری', ADMIN: 'مدیر', SUPER_ADMIN: 'مدیر ارشد' };
const statusFa: Record<string, string> = { ACTIVE: 'فعال', SUSPENDED: 'تعلیق‌شده', DELETED: 'حذف‌شده' };

export default function UsersTab({ adminRole }: { adminRole: 'ADMIN' | 'SUPER_ADMIN' }) {
  const { notify } = useStore();
  const [data, setData] = useState<{ items: UserRow[]; total: number; page: number; pageSize: number; totalPages: number } | null>(null);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<UserDetail | null>(null);

  const load = useCallback(async (pageWanted = 1) => {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    sp.set('page', String(pageWanted));
    const fresh = await api.get<PagedResult<UserRow>>(`/api/admin/users?${sp.toString()}`);
    setData(fresh as never);
  }, [q]);

  useEffect(() => { setPage(1); void load(1).catch(() => notify('دریافت کاربران ممکن نشد', 'error')); }, [load, notify]);

  const openDetail = async (id: string) => {
    const fresh = await api.get<UserDetail>(`/api/admin/users/${id}`);
    setDetail(fresh);
  };

  return (
    <section className="admin-card">
      <div className="admin-list-tools">
        <div><h2>کاربران</h2><small>{data ? data.total.toLocaleString('fa-IR') : '…'} حساب ثبت‌شده</small></div>
        <div className="admin-search"><Search /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="نام، موبایل یا نام فروشگاه" /></div>
      </div>

      {!data ? <div className="admin-loading"><span className="custom-loader" /></div> : data.items.length === 0 ? (
        <p className="admin-empty">کاربری پیدا نشد.</p>
      ) : (
        <>
          <div className="admin-product-table users-table">
            <div className="admin-tr admin-th"><span>کاربر</span><span>فروشگاه</span><span>نقش</span><span>سفارش‌ها</span><span>وضعیت</span><span /></div>
            {data.items.map((user) => (
              <div className="admin-tr" key={user.id}>
                <div className="admin-product-cell">
                  <span className="user-avatar">{(user.name || user.mobile).charAt(0)}</span>
                  <p><strong>{user.name || 'بدون نام'}</strong><small dir="ltr">{user.mobile}</small></p>
                </div>
                <span>{user.businessName || '—'}</span>
                <span>{roleFa[user.role]}</span>
                <span>{((user as UserRow)._count?.orders ?? 0).toLocaleString('fa-IR')}</span>
                <span className={`status ${user.status === 'ACTIVE' ? 'active' : 'inactive'}`}><i />{statusFa[user.status]}</span>
                <div className="row-actions"><button onClick={() => void openDetail(user.id)} title="مدیریت"><UserCog /></button></div>
              </div>
            ))}
          </div>
          {data.totalPages > 1 && (
            <div className="pager">
              <button disabled={page <= 1} onClick={() => { setPage(page - 1); void load(page - 1); }}>قبلی</button>
              <span>{page.toLocaleString('fa-IR')} از {data.totalPages.toLocaleString('fa-IR')}</span>
              <button disabled={page >= data.totalPages} onClick={() => { setPage(page + 1); void load(page + 1); }}>بعدی</button>
            </div>
          )}
        </>
      )}

      <AnimatePresence>
        {detail && <UserDrawer detail={detail} adminRole={adminRole} onClose={() => setDetail(null)} onChanged={() => void load(page)} />}
      </AnimatePresence>
    </section>
  );
}

function UserDrawer({ detail, adminRole, onClose, onChanged }: { detail: UserDetail; adminRole: string; onClose: () => void; onChanged: () => void }) {
  const { notify } = useStore();
  const [current, setCurrent] = useState(detail.user);
  const [busy, setBusy] = useState(false);

  const patch = async (payload: Record<string, unknown>) => {
    setBusy(true);
    try {
      const fresh = await api.patch<{ user: UserDTO }>(`/api/admin/users/${current.id}`, payload);
      setCurrent(fresh.user);
      onChanged();
      notify('کاربر به‌روز شد');
    } catch (error) {
      notify(error instanceof ApiError ? error.message : 'تغییر ممکن نشد', 'error');
    } finally { setBusy(false); }
  };

  return (
    <motion.div className="drawer-backdrop admin-detail-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.aside className="admin-detail-drawer" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <div><strong>{current.name || 'بدون نام'}</strong><small dir="ltr">{current.mobile}</small></div>
          <button className="icon-button" onClick={onClose} aria-label="بستن"><X /></button>
        </div>
        <div className="drawer-body">
          <div className="detail-chips">
            <span className="status-pill info">{roleFa[current.role]}</span>
            <span className={`status-pill ${current.status === 'ACTIVE' ? 'good' : 'bad'}`}>{statusFa[current.status]}</span>
            <span className="status-pill info">عضویت {faDate(current.createdAt)}</span>
          </div>

          <section className="drawer-card">
            <h3><ShieldCheck size={16} /> سطح دسترسی و وضعیت</h3>
            <div className="transition-buttons">
              {current.status === 'ACTIVE' ? (
                <button className="transition-btn CANCELLED" disabled={busy || (current.role !== 'CUSTOMER' && adminRole !== 'SUPER_ADMIN')} onClick={() => void patch({ status: 'SUSPENDED' })}>تعلیق حساب</button>
              ) : (
                <button className="transition-btn PAID" disabled={busy} onClick={() => void patch({ status: 'ACTIVE' })}>فعال‌سازی حساب</button>
              )}
              {adminRole === 'SUPER_ADMIN' && current.role !== 'SUPER_ADMIN' && (
                <>
                  {current.role !== 'ADMIN' && <button className="transition-btn PROCESSING" disabled={busy} onClick={() => void patch({ role: 'ADMIN' })}>ارتقا به مدیر</button>}
                  {current.role !== 'CUSTOMER' && <button className="transition-btn PENDING" disabled={busy} onClick={() => void patch({ role: 'CUSTOMER' })}>تنزل به مشتری</button>}
                  <button className="transition-btn PAID" disabled={busy} onClick={() => void patch({ role: 'SUPER_ADMIN' })}>مدیر ارشد شود</button>
                </>
              )}
            </div>
          </section>

          <section className="drawer-card">
            <h3>سفارش‌های اخیر ({detail.orders.total.toLocaleString('fa-IR')})</h3>
            {detail.orders.items.length === 0 && <small>سفارشی ندارد.</small>}
            {detail.orders.items.map((order) => {
              const st = orderStatusFa[order.status] ?? { label: order.status, tone: 'info' };
              return (
                <div className="drawer-item" key={order.id}>
                  <div><strong dir="ltr">{order.orderNumber}</strong><small>{faDate(order.createdAt)}</small></div>
                  <span className={`status-pill ${st.tone}`}>{st.label}</span>
                  <b>{formatPrice(order.total)}</b>
                </div>
              );
            })}
          </section>

          <section className="drawer-card">
            <h3>آدرس‌ها</h3>
            {detail.addresses.length === 0 && <small>آدرسی ثبت نشده.</small>}
            {detail.addresses.map((address) => (
              <p key={address.id}>{address.title || address.recipientName} — {address.province}، {address.city}</p>
            ))}
          </section>
        </div>
      </motion.aside>
    </motion.div>
  );
}
