'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Banknote, Check, ChevronLeft, CreditCard, MapPin, PackageCheck, Plus, ShieldCheck, Store, Tag, Truck, X } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, ApiError } from '@/lib/api-client';
import { formatPrice } from '@/lib/pricing';
import type { AddressDTO, CheckoutQuoteDTO, CheckoutResultDTO, ShippingMethod } from '@/types';
import { useStore } from './Providers';


type Props = {
  addresses: AddressDTO[];
  shippingMethods: ShippingMethod[];
  gatewayEnabled: boolean;
  defaults: { name: string; businessName: string; mobile: string };
};

export default function CheckoutClient({ addresses: initialAddresses, shippingMethods, gatewayEnabled, defaults }: Props) {
  const router = useRouter();
  const { cart, refreshCart, notify } = useStore();
  const [addresses, setAddresses] = useState<AddressDTO[]>(initialAddresses);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(initialAddresses.find((a) => a.isDefault)?.id ?? initialAddresses[0]?.id ?? null);
  const [addressFormOpen, setAddressFormOpen] = useState(initialAddresses.length === 0);
  const [editingAddress, setEditingAddress] = useState<AddressDTO | null>(null);
  const [shipping, setShipping] = useState(shippingMethods[0]?.id ?? 'freight');
  const [payment, setPayment] = useState<'manual' | 'gateway'>(gatewayEnabled ? 'gateway' : 'manual');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponError, setCouponError] = useState('');
  const [quote, setQuote] = useState<CheckoutQuoteDTO | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const idempotencyKey = useRef<string>(typeof crypto !== 'undefined' ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

  const fetchQuote = useCallback(async (shippingId: string, coupon: string | null) => {
    setQuoteLoading(true);
    setCouponError('');
    try {
      const data = await api.post<{ quote: CheckoutQuoteDTO }>('/api/checkout/quote', { shippingMethod: shippingId, couponCode: coupon || null });
      setQuote(data.quote);
      if (coupon) notify('کد تخفیف اعمال شد', 'success');
    } catch (error) {
      setQuote(null);
      if (coupon && error instanceof ApiError) {
        setCouponError(error.message);
        setAppliedCoupon(null);
      } else if (error instanceof ApiError) {
        notify(error.message, 'error');
      }
    } finally {
      setQuoteLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    if (cart.items.length) void fetchQuote(shipping, appliedCoupon);
  }, [shipping, appliedCoupon, cart.items.length, fetchQuote]);

  const applyCoupon = () => {
    const code = couponCode.trim();
    if (!code) return;
    setAppliedCoupon(code);
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
  };

  const subtotal = quote?.subtotal ?? cart.subtotal;
  const total = quote?.total ?? cart.subtotal;

  const submit = async () => {
    if (submitting) return;
    if (!selectedAddressId) {
      notify('ابتدا آدرس تحویل را انتخاب یا ثبت کنید', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const result = await api.post<CheckoutResultDTO>('/api/checkout', {
        idempotencyKey: idempotencyKey.current,
        addressId: selectedAddressId,
        shippingMethod: shipping,
        paymentMethod: payment,
        couponCode: appliedCoupon,
        notes: notes || null,
      });
      await refreshCart();
      idempotencyKey.current = crypto.randomUUID();
      if (result.payment.kind === 'gateway') {
        window.location.assign(result.payment.redirectUrl);
        return;
      }
      router.push(`/checkout/result?status=success&order=${encodeURIComponent(result.order.orderNumber)}&method=manual`);
    } catch (error) {
      notify(error instanceof ApiError ? error.message : 'ثبت سفارش ممکن نشد', 'error');
      setSubmitting(false);
    }
  };

  if (cart.items.length === 0) {
    return (
      <section className="container empty-cart checkout-empty">
        <div className="empty-cart-visual"><span><PackageCheck /></span><i>🐢</i></div>
        <h1>پیش‌فاکتوری برای ثبت وجود ندارد</h1>
        <p>ابتدا حداقل یک پک ۵ عددی از مدل موردنظر انتخاب کنید.</p>
        <Link className="primary-button" href="/products">مشاهده مدل‌های عمده <ArrowLeft /></Link>
      </section>
    );
  }

  return (
    <>
      <section className="checkout-head">
        <div className="container">
          <div><Link href="/cart">پک‌های انتخابی</Link><ChevronLeft /><strong>نهایی‌کردن سفارش</strong></div>
          <h1>نهایی‌کردن سفارش عمده</h1>
        </div>
      </section>
      <div className="container checkout-layout">
        <div className="checkout-forms">
          <section className="form-card">
            <div className="form-card-head"><span><MapPin /></span><div><small>مرحله ۱</small><h2>آدرس تحویل سفارش</h2></div></div>
            {addresses.length > 0 && (
              <div className="address-grid">
                {addresses.map((address) => (
                  <button
                    key={address.id}
                    className={`address-card ${selectedAddressId === address.id ? 'active' : ''}`}
                    onClick={() => setSelectedAddressId(address.id)}
                    type="button"
                  >
                    <span className="address-check">{selectedAddressId === address.id && <Check />}</span>
                    <strong>{address.title || address.recipientName}{address.isDefault && <em>پیش‌فرض</em>}</strong>
                    <small dir="ltr">{address.mobile}</small>
                    <p>{address.province}، {address.city}، {address.address}</p>
                    <span className="address-edit" onClick={(e) => { e.stopPropagation(); setEditingAddress(address); setAddressFormOpen(true); }}>ویرایش</span>
                  </button>
                ))}
                <button className="address-card add" onClick={() => { setEditingAddress(null); setAddressFormOpen(true); }} type="button"><Plus /> آدرس جدید</button>
              </div>
            )}
            <AnimatePresence>
              {addressFormOpen && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                  <AddressForm
                    defaults={defaults}
                    address={editingAddress}
                    onCancel={() => { setAddressFormOpen(initialAddresses.length === 0 && !editingAddress); setEditingAddress(null); }}
                    onSaved={(saved) => {
                      setAddresses((prev) => {
                        const exists = prev.some((a) => a.id === saved.id);
                        const next = exists ? prev.map((a) => (a.id === saved.id ? saved : { ...a, isDefault: saved.isDefault ? false : a.isDefault })) : [...prev, saved];
                        return saved.isDefault ? next.map((a) => ({ ...a, isDefault: a.id === saved.id })) : next;
                      });
                      setSelectedAddressId(saved.id);
                      setAddressFormOpen(false);
                      setEditingAddress(null);
                      notify(editingAddress ? 'آدرس ویرایش شد' : 'آدرس ثبت شد');
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          <section className="form-card">
            <div className="form-card-head"><span><Truck /></span><div><small>مرحله ۲</small><h2>روش دریافت سفارش</h2></div></div>
            <div className="choice-cards">
              {shippingMethods.map((method) => (
                <label key={method.id} className={shipping === method.id ? 'active' : ''}>
                  <input type="radio" name="shippingMethod" checked={shipping === method.id} onChange={() => setShipping(method.id)} />
                  <span>{method.id === 'pickup' ? <Store /> : <Truck />}</span>
                  <p><strong>{method.label}</strong><small>{method.description}</small></p>
                  <b>{method.cost > 0 ? `${formatPrice(method.cost)} تومان` : method.note}</b>
                  <i><Check /></i>
                </label>
              ))}
            </div>
          </section>

          <section className="form-card">
            <div className="form-card-head"><span><CreditCard /></span><div><small>مرحله ۳</small><h2>روش پرداخت</h2></div></div>
            <div className="payment-choices">
              {gatewayEnabled && (
                <label className={payment === 'gateway' ? 'active' : ''}>
                  <input type="radio" name="paymentMethod" checked={payment === 'gateway'} onChange={() => setPayment('gateway')} />
                  <span><CreditCard /></span>
                  <p><strong>پرداخت آنلاین</strong><small>اتصال امن به درگاه بانکی</small></p>
                  <i><Check /></i>
                </label>
              )}
              <label className={payment === 'manual' ? 'active' : ''}>
                <input type="radio" name="paymentMethod" checked={payment === 'manual'} onChange={() => setPayment('manual')} />
                <span><Banknote /></span>
                <p><strong>پیش‌فاکتور و واریز پس از تأیید</strong><small>تأیید موجودی و تماس مسئول فروش</small></p>
                <i><Check /></i>
              </label>
            </div>
            <label className="notes-field">
              <span>توضیحات سفارش (اختیاری)</span>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} placeholder="توضیحات لازم برای آماده‌سازی یا ارسال" />
            </label>
          </section>
        </div>

        <aside className="checkout-summary order-summary">
          <div className="summary-pack-icon"><PackageCheck /><span><strong>{cart.totalPacks.toLocaleString('fa-IR')} پک عمده</strong><small>{cart.totalPieces.toLocaleString('fa-IR')} عدد پوشاک</small></span></div>
          <h2>خلاصه سفارش</h2>
          <div className="checkout-mini-items">
            {cart.items.slice(0, 3).map((item) => (
              <div key={item.id}>
                <span>{item.packCount.toLocaleString('fa-IR')} پک</span>
                <p><strong>{item.product.shortName || item.product.name}</strong><small>{item.sizeLabel}، {item.colorName}</small></p>
                <b>{formatPrice(item.unitPrice * item.product.packSize * item.packCount)}</b>
              </div>
            ))}
            {cart.items.length > 3 && <small>و {(cart.items.length - 3).toLocaleString('fa-IR')} مدل دیگر</small>}
          </div>

          <div className="coupon-box">
            {appliedCoupon && quote?.couponDiscount ? (
              <div className="coupon-applied"><Tag /><span>کد «{appliedCoupon}» اعمال شد</span><button onClick={removeCoupon} aria-label="حذف کد"><X /></button></div>
            ) : (
              <div className="coupon-input">
                <input value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="کد تخفیف دارید؟" dir="ltr" />
                <button onClick={applyCoupon} disabled={!couponCode.trim() || quoteLoading}>اعمال</button>
              </div>
            )}
            {couponError && <small className="coupon-error">{couponError}</small>}
          </div>

          <div className="summary-lines">
            <p><span>جمع سفارش {quoteLoading && <span className="custom-loader mini" />}</span><strong>{formatPrice(subtotal)} تومان</strong></p>
            {quote?.tierDiscount ? <p className="discount"><span>تخفیف پلکانی</span><strong>در قیمت‌ها لحاظ شده</strong></p> : null}
            {quote?.couponDiscount ? <p className="discount"><span>کد تخفیف</span><strong>− {formatPrice(quote.couponDiscount)} تومان</strong></p> : null}
            <p><span>ارسال</span><strong>{shipping === 'pickup' ? 'تحویل رایگان' : shippingMethods.find((m) => m.id === shipping)?.note ?? '—'}</strong></p>
          </div>
          <div className="summary-total">
            <span>مبلغ قابل پرداخت</span>
            <div><strong>{formatPrice(total)}</strong><small>تومان</small></div>
          </div>
          <button className="primary-button checkout-button" onClick={submit} disabled={submitting || quoteLoading || !selectedAddressId}>
            {submitting ? <><span className="custom-loader" /> در حال ثبت امن…</> : payment === 'gateway' ? <>پرداخت آنلاین {formatPrice(total)} تومان <ArrowLeft /></> : <>ثبت درخواست پیش‌فاکتور <ArrowLeft /></>}
          </button>
          <div className="summary-assurance"><ShieldCheck /><span><strong>محاسبه امن سرور</strong><small>قیمت‌ها لحظه ثبت از دیتابیس خوانده و قیمت ارسال‌شده از مرورگر نادیده گرفته می‌شود.</small></span></div>
        </aside>
      </div>
    </>
  );
}

function AddressForm({
  defaults, address, onSaved, onCancel,
}: {
  defaults: { name: string; businessName: string; mobile: string };
  address: AddressDTO | null;
  onSaved: (address: AddressDTO) => void;
  onCancel: () => void;
}) {
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
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
      unit: String(form.get('unit') || '') || null,
      plate: String(form.get('plate') || '') || null,
      isDefault: form.get('isDefault') === 'on',
    };
    try {
      const data = address
        ? await api.patch<{ address: AddressDTO }>(`/api/account/addresses/${address.id}`, payload)
        : await api.post<{ address: AddressDTO }>('/api/account/addresses', payload);
      onSaved(data.address);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'ثبت آدرس ممکن نشد');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="inline-address-form" onSubmit={submit}>
      <div className="form-grid">
        <label><span>عنوان آدرس (اختیاری)</span><input name="title" defaultValue={address?.title ?? ''} placeholder="مثلاً فروشگاه مرکزی" /></label>
        <label><span>نام گیرنده</span><input name="recipientName" required defaultValue={address?.recipientName ?? defaults.name} placeholder="نام مسئول دریافت" /></label>
        <label><span>موبایل گیرنده</span><input name="mobile" required inputMode="tel" dir="ltr" defaultValue={address?.mobile ?? defaults.mobile} placeholder="09xxxxxxxxx" pattern="09[0-9]{9}" /></label>
        <label><span>استان</span><input name="province" required defaultValue={address?.province ?? 'تهران'} /></label>
        <label><span>شهر</span><input name="city" required defaultValue={address?.city ?? ''} placeholder="نام شهر" /></label>
        <label><span>کد پستی (اختیاری)</span><input name="postalCode" inputMode="numeric" dir="ltr" defaultValue={address?.postalCode ?? ''} placeholder="۱۰ رقم" pattern="[0-9]{10}" /></label>
        <label className="full"><span>نشانی کامل</span><textarea name="address" required defaultValue={address?.address ?? ''} placeholder="نشانی کامل فروشگاه یا انبار" /></label>
      </div>
      <label className="checkbox-row"><input type="checkbox" name="isDefault" defaultChecked={address?.isDefault ?? false} /><span>پیش‌فرض سفارش‌ها باشد</span></label>
      {error && <small className="coupon-error">{error}</small>}
      <div className="form-actions">
        <button type="button" className="secondary-button" onClick={onCancel}>انصراف</button>
        <button className="primary-button" disabled={saving}>{saving ? <span className="custom-loader" /> : <>ذخیره آدرس <Check /></>}</button>
      </div>
    </form>
  );
}


