'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { faDate } from '../AccountClient';

type AuditRow = {
  id: string; action: string; entity: string; entityId: string | null;
  metadata: unknown; ip: string | null; createdAt: string;
  admin: { name: string | null; mobile: string } | null;
};

export default function AuditTab() {
  const [data, setData] = useState<{ items: AuditRow[]; total: number; page: number; totalPages: number } | null>(null);
  const [page, setPage] = useState(1);
  const [entity, setEntity] = useState('');

  useEffect(() => {
    const sp = new URLSearchParams({ page: String(page) });
    if (entity) sp.set('entity', entity);
    void api.get<{ items: AuditRow[]; total: number; page: number; pageSize: number; totalPages: number }>(`/api/admin/audit-logs?${sp.toString()}`)
      .then((fresh) => setData(fresh as never))
      .catch(() => undefined);
  }, [page, entity]);

  return (
    <section className="admin-card">
      <div className="admin-list-tools">
        <div><h2>رویدادهای مدیران</h2><small>هر تغییر حساس، این‌جا ثبت می‌شود</small></div>
        <select value={entity} onChange={(e) => { setEntity(e.target.value); setPage(1); }} aria-label="فیلتر موجودیت">
          <option value="">همه موجودیت‌ها</option>
          <option value="product">محصول</option><option value="order">سفارش</option><option value="category">دسته‌بندی</option>
          <option value="user">کاربر</option><option value="coupon">کد تخفیف</option><option value="auth">ورود</option>
        </select>
      </div>
      {!data ? <div className="admin-loading"><span className="custom-loader" /></div> : data.items.length === 0 ? (
        <p className="admin-empty">رویدادی ثبت نشده است.</p>
      ) : (
        <>
          <div className="audit-list">
            {data.items.map((row) => (
              <div className="audit-row" key={row.id}>
                <i />
                <div>
                  <strong>{row.action}</strong>
                  <small>{row.entity}{row.entityId ? ` · ${row.entityId.slice(0, 10)}…` : ''}</small>
                  {row.metadata ? <code>{JSON.stringify(row.metadata)}</code> : null}
                </div>
                <div className="audit-meta">
                  <span>{row.admin?.name || row.admin?.mobile || 'سیستم'}</span>
                  <small>{faDate(row.createdAt)}</small>
                </div>
              </div>
            ))}
          </div>
          {data.totalPages > 1 && (
            <div className="pager">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}>قبلی</button>
              <span>{page.toLocaleString('fa-IR')} از {data.totalPages.toLocaleString('fa-IR')}</span>
              <button disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>بعدی</button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
