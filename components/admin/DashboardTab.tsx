'use client';

import Image from 'next/image';
import { Box, CircleDollarSign, Clock3, PackageCheck, ShoppingBag, TrendingUp, Truck, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { formatPrice } from '@/lib/pricing';
import type { AdminDashboardDTO } from '@/types';
import { faDate, orderStatusFa } from '../AccountClient';

export default function DashboardTab({ onGoOrders }: { onGoOrders: (status?: string) => void }) {
  const [data, setData] = useState<AdminDashboardDTO | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    api.get<AdminDashboardDTO>('/api/admin/dashboard').then(setData).catch(() => setError(true));
  }, []);

  if (error) return <div className="admin-card"><p className="admin-empty">دریافت آمار ممکن نشد؛ دوباره تلاش کنید.</p><button className="secondary-button" onClick={() => location.reload()}>تلاش مجدد</button></div>;
  if (!data) return <div className="admin-loading"><span className="custom-loader" /></div>;

  const maxChart = Math.max(1, ...data.chart.map((d) => d.sales));

  return (
    <div className="admin-dashboard">
      <div className="admin-stats">
        <div>
          <span className="admin-stat-icon mint"><CircleDollarSign /></span>
          <p><small>فروش امروز</small><strong>{formatPrice(data.salesToday)} <em>تومان</em></strong><span className="positive"><TrendingUp size={14} /> {formatPrice(data.salesMonth)} این ماه</span></p>
        </div>
        <div>
          <span className="admin-stat-icon rose"><ShoppingBag /></span>
          <p><small>سفارش‌های امروز</small><strong>{data.ordersToday.toLocaleString('fa-IR')} <em>سفارش</em></strong><span>از مجموع {data.ordersTotal.toLocaleString('fa-IR')}</span></p>
        </div>
        <div>
          <span className="admin-stat-icon butter"><Box /></span>
          <p><small>محصولات فعال</small><strong>{data.productsTotal.toLocaleString('fa-IR')} <em>مدل</em></strong><span>{data.lowStock.length.toLocaleString('fa-IR')} مدل کم‌موجود</span></p>
        </div>
        <div>
          <span className="admin-stat-icon sky"><Users /></span>
          <p><small>کاربران فروشگاه</small><strong>{data.usersTotal.toLocaleString('fa-IR')} <em>نفر</em></strong><span>فروش کل {formatPrice(data.salesTotal)} تومان</span></p>
        </div>
      </div>

      <div className="admin-stats mini">
        <button onClick={() => onGoOrders('AWAITING_PAYMENT')}><span className="admin-stat-icon rose"><Clock3 /></span><p><small>در انتظار پرداخت</small><strong>{data.ordersAwaitingPayment.toLocaleString('fa-IR')}</strong></p></button>
        <button onClick={() => onGoOrders('PROCESSING')}><span className="admin-stat-icon butter"><PackageCheck /></span><p><small>در حال پردازش</small><strong>{data.ordersProcessing.toLocaleString('fa-IR')}</strong></p></button>
        <button onClick={() => onGoOrders('SHIPPED')}><span className="admin-stat-icon sky"><Truck /></span><p><small>ارسال‌شده</small><strong>{data.ordersShipped.toLocaleString('fa-IR')}</strong></p></button>
      </div>

      <div className="admin-two-column">
        <section className="admin-card">
          <div className="admin-card-head"><div><small>۳۰ روز اخیر</small><h2>نمودار فروش (تومان)</h2></div></div>
          <div className="sales-chart" role="img" aria-label="نمودار فروش سی روز اخیر">
            {data.chart.map((point) => (
              <div key={point.date} className="sales-col" title={`${point.date} — ${formatPrice(point.sales)} تومان / ${point.orders.toLocaleString('fa-IR')} سفارش`}>
                <i style={{ height: `${Math.max(point.sales === 0 ? 2 : (point.sales / maxChart) * 100, 2)}%` }} />
              </div>
            ))}
          </div>
        </section>
        <section className="admin-card">
          <div className="admin-card-head"><div><small>انتخاب همکاران</small><h2>پرفروش‌ترین مدل‌ها</h2></div></div>
          {data.topProducts.length === 0 ? <p className="admin-empty">هنوز فروشی ثبت نشده است.</p> : (
            <div className="top-products">
              {data.topProducts.map((item, index) => (
                <div key={item.id ?? index} className="top-product-row">
                  <b>{(index + 1).toLocaleString('fa-IR')}</b>
                  <p><strong>{item.name}</strong><small>{item.quantity.toLocaleString('fa-IR')} پک</small></p>
                  <span>{formatPrice(item.revenue)}<small>تومان</small></span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="admin-two-column">
        <section className="admin-card">
          <div className="admin-card-head"><div><small>وضعیت اخیر</small><h2>آخرین سفارش‌ها</h2></div><button onClick={() => onGoOrders()}>مشاهده همه</button></div>
          {data.recentOrders.length === 0 ? <p className="admin-empty">سفارشی ثبت نشده است.</p> : (
            <div className="mini-order-list">
              {data.recentOrders.map((order) => {
                const status = orderStatusFa[order.status] ?? { label: order.status, tone: 'info' };
                return (
                  <div className="mini-order-row" key={order.id}>
                    <span dir="ltr">{order.orderNumber}</span>
                    <p><strong>{order.customerName}</strong><small>{faDate(order.createdAt)}</small></p>
                    <b>{formatPrice(order.total)}</b>
                    <em className={`status-pill ${status.tone}`}>{status.label}</em>
                  </div>
                );
              })}
            </div>
          )}
        </section>
        <section className="admin-card">
          <div className="admin-card-head"><div><small>نیازمند توجه</small><h2>موجودی پک کم</h2></div><span>{data.lowStock.length.toLocaleString('fa-IR')} مورد</span></div>
          {data.lowStock.length === 0 ? <p className="admin-empty">همه مدل‌ها موجودی کافی دارند 🎉</p> : data.lowStock.map((product) => (
            <div className="low-stock-row" key={product.id}>
              <span>{product.image && <Image src={product.image} alt={product.name} fill sizes="52px" />}</span>
              <p><strong>{product.name}</strong><small dir="ltr">{product.sku}</small></p>
              <b className={product.stock === 0 ? 'empty' : ''}>{product.stock.toLocaleString('fa-IR')} پک</b>
            </div>
          ))}
        </section>
      </div>

      {data.activity.length > 0 && (
        <section className="admin-card">
          <div className="admin-card-head"><div><small>جریان فعالیت</small><h2>رویدادهای اخیر مدیران</h2></div></div>
          <div className="activity-feed">
            {data.activity.map((item) => (
              <div key={item.id}><i />{item.action} — {item.entity}<time>{faDate(item.createdAt)}</time></div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
