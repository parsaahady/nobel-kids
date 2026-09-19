'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, BadgeCheck, ChevronLeft, CreditCard, Heart, Home, LogOut, MapPin, Package, PackageCheck, Plus, Star, Trash2, Truck, UserRound } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api-client';
import { formatPrice } from '@/lib/pricing';
import type { AddressDTO, OrderDetailDTO, OrderSummaryDTO, PagedResult, ProductListItemDTO, UserDTO } from '@/types';
import AuthPanel from './AuthPanel';
import ProductCard from './ProductCard';
import { useStore } from './Providers';

const tabs = [
  { id: 'profile', label: 'مشخصات من', icon: UserRound },
  { id: 'orders', label: 'سفارش‌ها', icon: Package },
  { id: 'wishlist', label: 'علاقه‌مندی‌ها', icon: Heart },
  { id: 'addresses', label: 'آدرس‌ها', icon: MapPin },
];

export const orderStatusFa: Record<string, { label: string; tone: string }> = {
  PENDING: { label: 'در انتظار تأیید فروش', tone: 'waiting' },
  AWAITING_PAYMENT: { label: 'در انتظار پرداخت', tone: 'waiting' },
  PAID: { label: 'پرداخت‌شده', tone: 'good' },
  PROCESSING: { label: 'در حال پردازش', tone: 'info' },
  PACKED: { label: 'بسته‌بندی‌شده', tone: 'info' },
  SHIPPED: { label: 'ارسال‌شده', tone: 'info' },
  DELIVERED: { label: 'تحویل‌شده', tone: 'good' },
  CANCELLED: { label: 'لغوشده', tone: 'bad' },
  REFUNDED: { label: 'مستردشده', tone: 'bad' },
};

export const paymentStatusFa: Record<string, { label: string; tone: string }> = {
  PENDING: { label: 'در انتظار', tone: 'waiting' },
  SUCCESS: { label: 'موفق', tone: 'good' },
  FAILED: { label: 'ناموفق', tone: 'bad' },
  REFUNDED: { label: 'برگشت داده شده', tone: 'bad' },
};

const shippingStatusFa: Record<string, string> = {
  PENDING: 'آماده‌سازی نشده',
  PROCESSING: 'در حال آماده‌سازی',
  SHIPPED: 'در راه',
  DELIVERED: 'تحویل‌شده',
};

export function faDate(iso: string): string {
  return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
}

type Props = {
  user: UserDTO;
  initialOrders: PagedResult<OrderSummaryDTO>;
  initialWishlist: ProductListItemDTO[];
  initialAddresses: AddressDTO[];
};

export default function AccountClient({ user: initialUser, initialOrders, initialWishlist, initialAddresses }: Props) {
  const params = useSearchParams();
  const { logout, wishlistIds } = useStore();
  const [activeTab, setActiveTab] = useState(params.get('tab') || 'profile');
  const [user, setUser] = useState(initialUser);
  useEffect(() => setUser(initialUser), [initialUser]);

  return (
    <>
      <section className="soft-page-head account-head">
        <div className="container">
          <span>حساب کاربری</span>
          <h1>سلام، {user.name || 'همکار گرامی'}</h1>
          <p dir="ltr">{user.mobile}{user.businessName ? ` · ${user.businessName}` : ''}</p>
        </div>
      </section>
      <div className="container account-layout">
        <aside className="account-sidebar">
          <div className="account-person"><span>{(user.name || 'ن').charAt(0)}</span><div><strong>{user.name || 'بدون نام'}</strong><small>{user.role === 'CUSTOMER' ? 'عضو شبکه همکاران نوبل' : 'مدیر فروشگاه'}</small></div></div>
          <nav>
            {tabs.map(({ id, label, icon: Icon }) => (
              <button key={id} className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id)}>
                <Icon />{label}
                {id === 'wishlist' && wishlistIds.length > 0 && <b>{wishlistIds.length.toLocaleString('fa-IR')}</b>}
                <ChevronLeft />
              </button>
            ))}
          </nav>
          <button className="logout-button" onClick={() => void logout()}><LogOut /> خروج از حساب</button>
        </aside>
        <section className="account-content">
          <AnimatePresence mode="wait">
            {activeTab === 'profile' && <ProfileTab key="profile" user={user} onUpdated={setUser} />}
            {activeTab === 'orders' && <OrdersTab key="orders" initial={initialOrders} />}
            {activeTab === 'wishlist' && <WishlistTab key="wishlist" initial={initialWishlist} />}
            {activeTab === 'addresses' && <AddressesTab key="addresses" initial={initialAddresses} />}
          </AnimatePresence>
        </section>
      </div>
    </>
  );
}

const tabMotion = { initial: { opacity: 0, x: 12 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0 } };

function ProfileTab({ user, onUpdated }: { user: UserDTO; onUpdated: (u: UserDTO) => void }) {
  const { notify } = useStore();
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    const form = new FormData(event.currentTarget);
    try {
      const data = await api.patch<{ user: UserDTO }>('/api/account/profile', {
        name: String(form.get('name')),
        businessName: String(form.get('businessName') || '') || null,
        email: String(form.get('email') || '') || null,
      });
      onUpdated(data.user);
      notify('تغییرات ذخیره شد');
    } catch (error) {
      notify(error instanceof ApiError ? error.message : 'ذخیره ممکن نشد', 'error');
    } finally {
      setSaving(false);
    }
  };
  return (
    <motion.div {...tabMotion}>
      <div className="account-content-head"><div><small>اطلاعات شخصی</small><h2>مشخصات من</h2></div></div>
      <form className="profile-form" onSubmit={submit}>
        <label><span>نام و نام خانوادگی</span><input name="name" defaultValue={user.name ?? ''} required /></label>
        <label><span>نام فروشگاه (اختیاری)</span><input name="businessName" defaultValue={user.businessName ?? ''} placeholder="نام مجموعه" /></label>
        <label><span>شماره موبایل</span><input dir="ltr" defaultValue={user.mobile} disabled /></label>
        <label><span>ایمیل (اختیاری)</span><input name="email" type="email" dir="ltr" defaultValue={user.email ?? ''} placeholder="name@example.com" /></label>
        <button className="primary-button" disabled={saving}>{saving ? <span className="custom-loader" /> : 'ذخیره تغییرات'}</button>
      </form>
      <div className="account-meta">
        <p><small>عضویت از</small><strong>{faDate(user.createdAt)}</strong></p>
        {user.lastLoginAt && <p><small>آخرین ورود</small><strong>{faDate(user.lastLoginAt)}</strong></p>}
      </div>
    </motion.div>
  );
}

function OrdersTab({ initial }: { initial: PagedResult<OrderSummaryDTO> }) {
  const [data, setData] = useState(initial);
  const [page, setPage] = useState(1);
  const [openOrder, setOpenOrder] = useState<OrderDetailDTO | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const goPage = async (next: number) => {
    setPage(next);
    setData(await api.get<PagedResult<OrderSummaryDTO>>(`/api/orders?page=${next}`));
  };

  const openDetail = async (id: string) => {
    setLoadingDetail(true);
    try {
      const detail = await api.get<{ order: OrderDetailDTO }>(`/api/orders/${id}`);
      setOpenOrder(detail.order);
    } finally {
      setLoadingDetail(false);
    }
  };

  if (openOrder) {
    return <OrderDetailView order={openOrder} onBack={() => setOpenOrder(null)} />;
  }

  return (
    <motion.div {...tabMotion}>
      <div className="account-content-head"><div><small>پیگیری خرید</small><h2>سفارش‌های من</h2></div><span>{data.total.toLocaleString('fa-IR')} سفارش</span></div>
      {loadingDetail && <div className="inline-loading"><span className="custom-loader" /></div>}
      {data.items.length === 0 ? (
        <div className="account-empty">
          <span><Package /></span>
          <h3>هنوز سفارشی ثبت نکرده‌اید</h3>
          <p>پس از ثبت سفارش عمده، وضعیت آن این‌جا نمایش داده می‌شود.</p>
          <Link className="secondary-button" href="/products">انتخاب مدل‌های عمده</Link>
        </div>
      ) : (
        <>
          <div className="account-order-list">
            {data.items.map((order) => {
              const status = orderStatusFa[order.status] ?? { label: order.status, tone: 'info' };
              return (
                <button className="account-order-row" key={order.id} onClick={() => void openDetail(order.id)}>
                  <span className="order-no" dir="ltr">{order.orderNumber}</span>
                  <span className="order-meta">
                    <small>{faDate(order.createdAt)}</small>
                    <small>{order.itemCount.toLocaleString('fa-IR')} پک</small>
                  </span>
                  <strong className="order-total">{formatPrice(order.total)} <small>تومان</small></strong>
                  <span className={`status-pill ${status.tone}`}>{status.label}</span>
                  {order.trackingCode && <span className="order-tracking" dir="ltr"><Truck size={13} />{order.trackingCode}</span>}
                  <ChevronLeft />
                </button>
              );
            })}
          </div>
          {data.totalPages > 1 && (
            <div className="pager">
              <button disabled={page <= 1} onClick={() => void goPage(page - 1)}>قبلی</button>
              <span>{page.toLocaleString('fa-IR')} از {data.totalPages.toLocaleString('fa-IR')}</span>
              <button disabled={page >= data.totalPages} onClick={() => void goPage(page + 1)}>بعدی</button>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}

function OrderDetailView({ order, onBack }: { order: OrderDetailDTO; onBack: () => void }) {
  const status = orderStatusFa[order.status] ?? { label: order.status, tone: 'info' };
  const payStatus = paymentStatusFa[order.paymentStatus] ?? { label: order.paymentStatus, tone: 'info' };
  return (
    <motion.div {...tabMotion}>
      <button className="back-link" onClick={onBack}><ChevronLeft style={{ rotate: '180deg' }} /> بازگشت به سفارش‌ها</button>
      <div className="account-content-head">
        <div><small>جزئیات سفارش</small><h2 dir="ltr">{order.orderNumber}</h2></div>
        <span className={`status-pill ${status.tone}`}>{status.label}</span>
      </div>
      <div className="order-detail-grid">
        <div className="order-detail-main">
          <div className="order-items-card">
            {order.items.map((item) => (
              <div className="order-item-row" key={item.id}>
                <div>
                  <strong>{item.productName}</strong>
                  <small>{item.variantName} · {item.packMode === 'single' ? 'پک تک‌سایز' : 'پک جور سایز'}</small>
                </div>
                <span>{item.quantity.toLocaleString('fa-IR')} پک ({(item.quantity * item.packSize).toLocaleString('fa-IR')} عدد)</span>
                <small>هر عدد {formatPrice(item.unitPrice)}</small>
                <strong>{formatPrice(item.total)} تومان</strong>
              </div>
            ))}
          </div>
          <div className="order-address-card">
            <h3><MapPin size={16} /> آدرس تحویل</h3>
            <p>{order.addressSnapshot.recipientName} · <span dir="ltr">{order.addressSnapshot.mobile}</span></p>
            <p>{order.addressSnapshot.province}، {order.addressSnapshot.city}، {order.addressSnapshot.address}</p>
            {order.addressSnapshot.postalCode && <p>کد پستی: <span dir="ltr">{order.addressSnapshot.postalCode}</span></p>}
            {order.notes && <p className="order-notes">یادداشت شما: {order.notes}</p>}
          </div>
        </div>
        <aside className="order-detail-side">
          <div className="side-card">
            <p><span>تاریخ ثبت</span><strong>{faDate(order.createdAt)}</strong></p>
            <p><span>روش ارسال</span><strong>{order.shippingMethod === 'pickup' ? 'تحویل حضوری' : 'باربری / تیپاکس'}</strong></p>
            <p><span>وضعیت ارسال</span><strong>{shippingStatusFa[order.shippingStatus] ?? order.shippingStatus}</strong></p>
            {order.trackingCode && <p><span>کد رهگیری مرسوله</span><strong dir="ltr">{order.trackingCode}</strong></p>}
            <p><span>وضعیت پرداخت</span><span className={`status-pill ${payStatus.tone}`}>{payStatus.label}</span></p>
            {order.payments.find((p) => p.referenceId) && (
              <p><span>کد پیگیری پرداخت</span><strong dir="ltr">{order.payments.find((p) => p.referenceId)?.referenceId}</strong></p>
            )}
          </div>
          <div className="side-card totals">
            <p><span>مبلغ سفارش</span><strong>{formatPrice(order.subtotal)} تومان</strong></p>
            {order.discount > 0 && <p className="discount"><span>تخفیف</span><strong>− {formatPrice(order.discount)} تومان</strong></p>}
            {order.shippingCost > 0 && <p><span>ارسال</span><strong>{formatPrice(order.shippingCost)} تومان</strong></p>}
            <p className="grand"><span>مبلغ قابل پرداخت</span><strong>{formatPrice(order.total)} تومان</strong></p>
          </div>
        </aside>
      </div>
    </motion.div>
  );
}

function WishlistTab({ initial }: { initial: ProductListItemDTO[] }) {
  const { wishlistIds } = useStore();
  const [items, setItems] = useState(initial);

  useEffect(() => {
    let cancelled = false;
    void api.get<{ items: ProductListItemDTO[] }>('/api/wishlist').then((data) => {
      if (!cancelled) setItems(data.items);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [wishlistIds.length]);

  return (
    <motion.div {...tabMotion}>
      <div className="account-content-head"><div><small>انتخاب‌های دوست‌داشتنی</small><h2>علاقه‌مندی‌های من</h2></div><span>{items.length.toLocaleString('fa-IR')} محصول</span></div>
      {items.length ? (
        <div className="product-grid wishlist-grid">{items.map((product) => <ProductCard key={product.id} product={product} />)}</div>
      ) : (
        <div className="account-empty">
          <span><Heart /></span>
          <h3>لیست علاقه‌مندی خالی است</h3>
          <p>روی قلب کنار هر محصول بزنید تا بعداً راحت‌تر پیدایش کنید.</p>
          <Link className="secondary-button" href="/products">مشاهده فروشگاه</Link>
        </div>
      )}
    </motion.div>
  );
}

function AddressesTab({ initial }: { initial: AddressDTO[] }) {
  const { notify } = useStore();
  const [addresses, setAddresses] = useState(initial);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AddressDTO | null>(null);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    const data = await api.get<{ items: AddressDTO[] }>('/api/account/addresses');
    setAddresses(data.items);
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    const payload = {
      title: String(form.get('title') || '') || null,
      recipientName: String(form.get('recipientName') || ''),
      mobile: String(form.get('mobile') || ''),
      province: String(form.get('province') || ''),
      city: String(form.get('city') || ''),
      address: String(form.get('address') || ''),
      postalCode: String(form.get('postalCode') || '') || null,
      unit: null, plate: null,
      isDefault: form.get('isDefault') === 'on',
    };
    try {
      if (editing) await api.patch(`/api/account/addresses/${editing.id}`, payload);
      else await api.post('/api/account/addresses', payload);
      await reload();
      setFormOpen(false);
      setEditing(null);
      notify(editing ? 'آدرس ویرایش شد' : 'آدرس جدید ثبت شد');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'ثبت آدرس ممکن نشد');
    }
  };

  const remove = async (id: string) => {
    await api.del(`/api/account/addresses/${id}`).catch(() => undefined);
    await reload();
    notify('آدرس حذف شد');
  };

  const makeDefault = async (id: string) => {
    await api.post(`/api/account/addresses/${id}/default`).catch(() => undefined);
    await reload();
    notify('آدرس پیش‌فرض تغییر کرد');
  };

  return (
    <motion.div {...tabMotion}>
      <div className="account-content-head">
        <div><small>مقصد ارسال</small><h2>آدرس‌های من</h2></div>
        <button className="secondary-button" onClick={() => { setEditing(null); setFormOpen((open) => !open); }}><Plus /> آدرس جدید</button>
      </div>

      <AnimatePresence>
        {formOpen && (
          <motion.form className="address-form account-form" onSubmit={submit} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div className="form-grid">
              <label><span>عنوان (اختیاری)</span><input name="title" defaultValue={editing?.title ?? ''} placeholder="مثلاً دفتر" /></label>
              <label><span>نام گیرنده</span><input name="recipientName" required defaultValue={editing?.recipientName ?? ''} /></label>
              <label><span>موبایل</span><input name="mobile" required inputMode="tel" dir="ltr" defaultValue={editing?.mobile ?? ''} pattern="09[0-9]{9}" /></label>
              <label><span>استان</span><input name="province" required defaultValue={editing?.province ?? 'تهران'} /></label>
              <label><span>شهر</span><input name="city" required defaultValue={editing?.city ?? ''} /></label>
              <label><span>کد پستی (اختیاری)</span><input name="postalCode" inputMode="numeric" dir="ltr" defaultValue={editing?.postalCode ?? ''} pattern="[0-9]{10}" /></label>
              <label className="full"><span>نشانی کامل</span><textarea name="address" required defaultValue={editing?.address ?? ''} /></label>
            </div>
            <label className="checkbox-row"><input type="checkbox" name="isDefault" defaultChecked={editing?.isDefault} /><span>به‌عنوان آدرس پیش‌فرض</span></label>
            {error && <small className="coupon-error">{error}</small>}
            <div className="form-actions">
              <button type="button" className="secondary-button" onClick={() => { setFormOpen(false); setEditing(null); }}>انصراف</button>
              <button className="primary-button"><BadgeCheck /> ذخیره آدرس</button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {addresses.length === 0 && !formOpen ? (
        <div className="account-empty">
          <span><Home /></span>
          <h3>آدرسی ذخیره نشده</h3>
          <p>برای تسریع در ثبت سفارش‌های بعدی، نشانی تحویل‌تان را ذخیره کنید.</p>
        </div>
      ) : (
        <div className="address-list">
          {addresses.map((address) => (
            <div className={`address-row ${address.isDefault ? 'default' : ''}`} key={address.id}>
              <div>
                <strong>{address.title || address.recipientName}{address.isDefault && <em className="default-pill"><Star size={11} /> پیش‌فرض</em>}</strong>
                <p>{address.recipientName} · <span dir="ltr">{address.mobile}</span></p>
                <p>{address.province}، {address.city}، {address.address}</p>
              </div>
              <div className="address-row-actions">
                {!address.isDefault && <button onClick={() => void makeDefault(address.id)}>پیش‌فرض شود</button>}
                <button onClick={() => { setEditing(address); setFormOpen(true); }}>ویرایش</button>
                <button className="danger" onClick={() => void remove(address.id)} aria-label="حذف"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

/** Login wall for guests — used by the server page when no session exists. */
export function GuestAccount({ next }: { next?: string }) {
  const router = useRouter();
  const { user } = useStore();
  return (
    <section className="account-auth-section">
      <div className="container account-auth-grid">
        <AuthPanel
          onDone={() => {
            if (next) router.push(next);
            else router.refresh();
          }}
        />
        <div className="auth-visual">
          <span className="auth-tag">NOBEL <small>kids</small></span>
          <div className="auth-blob"><span>🐢</span><strong>شبکه<br />همکاران نوبل</strong></div>
          <p>مدل‌های منتخب، پیش‌فاکتورها و سفارش‌هایتان همیشه در دسترس است.</p>
        </div>
      </div>
      {user && <span className="hidden" />}
    </section>
  );
}
