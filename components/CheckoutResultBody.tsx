'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, BadgeCheck, PackageCheck, XCircle } from 'lucide-react';

export default function CheckoutResultBody() {
  // Static export: the gateway returns the customer to
  // /checkout/result?status=…&order=…&method=… so the query is read client-side.
  const params = useSearchParams();
  const status = params.get('status') ?? '';
  const order = params.get('order') ?? '';
  const method = params.get('method') ?? '';

  const isSuccess = status === 'success';
  const isManual = method === 'manual' || (isSuccess && !method);

  return (
    <section className="container order-success">
      <div className={isSuccess ? '' : 'failure'}>
        <span className={`success-check ${isSuccess ? '' : 'fail'}`}>{isSuccess ? <BadgeCheck /> : <XCircle />}</span>
        {isSuccess ? (
          <>
            <small>{isManual ? 'درخواست پیش‌فاکتور با موفقیت ثبت شد' : 'پرداخت شما با موفقیت انجام شد'}</small>
            <h1>{isManual ? 'سفارش عمده شما به نوبل رسید' : 'سفارش شما تأیید و ثبت شد'}</h1>
            <p>کد پیگیری سفارش</p>
            <strong dir="ltr">{order || '—'}</strong>
            {isManual ? (
              <div>مسئول فروش برای تأیید موجودی، ترکیب سایز، روش ارسال و مبلغ نهایی با شما تماس می‌گیرد. وضعیت سفارش را در حساب کاربری دنبال کنید.</div>
            ) : (
              <div>سفارش شما در حال آماده‌سازی است. وضعیت آن را همیشه در حساب کاربری خود ببینید.</div>
            )}
            <div className="result-actions">
              <Link className="primary-button" href="/account?tab=orders">پیگیری سفارش‌ها <ArrowLeft /></Link>
              <Link className="secondary-button" href="/products">انتخاب مدل‌های بیشتر</Link>
            </div>
          </>
        ) : (
          <>
            <small>{status === 'failed' ? 'پرداخت ناموفق بود' : 'خطا در پردازش'}</small>
            <h1>{status === 'failed' ? 'پرداخت انجام نشد' : 'مشکلی پیش آمد'}</h1>
            {order && (<><p>شماره سفارش</p><strong dir="ltr">{order}</strong></>)}
            <div>
              {status === 'failed'
                ? 'هیچ مبلغی به‌عنوان خرید ثبت نشده است. می‌توانید دوباره از سبد خرید خود اقدام کنید؛ اگر مبلغی کسر شده باشد طبق قوانین درگاه برمی‌گردد.'
                : 'در ثبت نتیجه تراکنش مشکلی پیش آمد؛ با پشتیبانی تماس بگیرید.'}
            </div>
            <div className="result-actions">
              <Link className="primary-button" href="/cart">بازگشت به پیش‌فاکتور <PackageCheck /></Link>
              <Link className="secondary-button" href="/contact">تماس با پشتیبانی</Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
