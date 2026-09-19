'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { faDate } from '../AccountClient';

type MessageRow = { id: string; name: string; mobile: string; subject: string | null; message: string; createdAt: string };

export default function MessagesTab() {
  const [data, setData] = useState<{ items: MessageRow[]; total: number; page: number; totalPages: number } | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    void api.get<{ items: MessageRow[]; total: number; page: number; pageSize: number; totalPages: number }>(`/api/admin/contact-messages?page=${page}`)
      .then((fresh) => setData(fresh as never))
      .catch(() => undefined);
  }, [page]);

  return (
    <section className="admin-card">
      <div className="admin-list-tools">
        <div><h2>پیام‌های تماس</h2><small>فرم تماس واقعی → دیتابیس</small></div>
      </div>
      {!data ? <div className="admin-loading"><span className="custom-loader" /></div> : data.items.length === 0 ? (
        <p className="admin-empty">پیامی دریافت نشده است.</p>
      ) : (
        <>
          <div className="message-list">
            {data.items.map((message) => (
              <article className="message-row" key={message.id}>
                <div>
                  <strong>{message.name}</strong>
                  <small dir="ltr">{message.mobile}</small>
                  {message.subject && <em>{message.subject}</em>}
                </div>
                <p>{message.message}</p>
                <time>{faDate(message.createdAt)}</time>
              </article>
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
