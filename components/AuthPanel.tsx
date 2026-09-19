'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ShieldCheck, Smartphone, Timer, UserRound } from 'lucide-react';
import { api, ApiError } from '@/lib/api-client';
import type { UserDTO } from '@/types';
import { useStore } from './Providers';

type Step = 'mobile' | 'code' | 'profile';

export default function AuthPanel({ onDone }: { onDone?: () => void }) {
  const { refreshAuth, refreshCart, notify } = useStore();
  const [step, setStep] = useState<Step>('mobile');
  const [mobile, setMobile] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [devCode, setDevCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setInterval(() => setResendIn((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [resendIn]);

  useEffect(() => {
    if (step === 'code') window.setTimeout(() => codeRef.current?.focus(), 80);
  }, [step]);

  const requestCode = async (mobileToUse: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await api.post<{ ttlSeconds: number; devCode?: string }>('/api/auth/request-otp', { mobile: mobileToUse });
      setDevCode(data.devCode ?? '');
      setResendIn(data.ttlSeconds);
      setStep('code');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'ارسال کد ممکن نشد');
    } finally {
      setLoading(false);
    }
  };

  const submitMobile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = String(form.get('mobile'));
    setMobile(value);
    void requestCode(value);
  };

  const submitCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post<{ user: UserDTO }>('/api/auth/verify-otp', { mobile, code: code.trim() || '0000' });
      const me = await api.get<{ user: UserDTO | null }>('/api/auth/me');
      await refreshAuth();
      await refreshCart();
      if (me.user && !me.user.name) {
        setStep('profile');
        setLoading(false);
        return;
      }
      notify('با موفقیت وارد شدید');
      onDone?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'ورود ممکن نشد');
    } finally {
      setLoading(false);
    }
  };

  const submitProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.patch('/api/account/profile', { name, businessName: businessName || null });
      await refreshAuth();
      notify('حساب شما آماده است');
      onDone?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'ثبت مشخصات ممکن نشد');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div className="auth-card" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
      <div className="auth-icon"><UserRound /></div>

      {step === 'mobile' && (
        <>
          <small>ورود / ثبت‌نام با پیامک</small>
          <h1>ورود همکاران نوبل</h1>
          <p>شماره موبایل‌تان را وارد کنید؛ کد تأیید برایتان پیامک می‌شود.</p>
          <form onSubmit={submitMobile}>
            <label>
              <span>شماره موبایل</span>
              <div className="input-with-icon"><Smartphone /><input name="mobile" defaultValue={mobile} required inputMode="tel" dir="ltr" placeholder="09xxxxxxxxx" pattern="09[0-9]{9}" autoComplete="tel" /></div>
            </label>
            {error && <small className="form-error-text">{error}</small>}
            <button className="primary-button" disabled={loading}>{loading ? <span className="custom-loader" /> : <>دریافت کد تأیید <ArrowLeft /></>}</button>
          </form>
        </>
      )}

      {step === 'code' && (
        <>
          <small>کد تأیید به {mobile} پیامک شد</small>
          <h1>کد را وارد کنید</h1>
          <form onSubmit={submitCode}>
            <label>
              <span>کد ۶ رقمی</span>
              <input ref={codeRef} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} required inputMode="numeric" dir="ltr" placeholder="••••••" className="otp-input" autoComplete="one-time-code" />
            </label>
            {devCode && <small className="dev-code-note">حالت توسعه — کد: <b dir="ltr">{devCode}</b></small>}
            {error && <small className="form-error-text">{error}</small>}
            <button className="primary-button" disabled={loading || code.length < 4}>
              {loading ? <span className="custom-loader" /> : <>ورود به حساب <ArrowLeft /></>}
            </button>
          </form>
          <div className="auth-meta-row">
            <button className="auth-toggle" onClick={() => { setStep('mobile'); setCode(''); setError(''); }}>تصحیح شماره موبایل</button>
            <button className="auth-toggle" disabled={resendIn > 0 || loading} onClick={() => void requestCode(mobile)}>
              <Timer size={14} /> {resendIn > 0 ? `ارسال مجدد تا ${resendIn.toLocaleString('fa-IR')} ثانیه` : 'ارسال مجدد کد'}
            </button>
          </div>
        </>
      )}

      {step === 'profile' && (
        <>
          <small>تکمیل حساب کاربری</small>
          <h1>خوش آمدید!</h1>
          <p>برای ثبت سفارش‌ها، نام شما و (در صورت تمایل) نام فروشگاه لازم است.</p>
          <form onSubmit={submitProfile}>
            <label><span>نام و نام خانوادگی</span><input value={name} onChange={(e) => setName(e.target.value)} required placeholder="نام مسئول خرید" /></label>
            <label><span>نام فروشگاه (اختیاری)</span><input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="نام فروشگاه" /></label>
            {error && <small className="form-error-text">{error}</small>}
            <button className="primary-button" disabled={loading || !name.trim()}>{loading ? <span className="custom-loader" /> : <>شروع خرید عمده <ArrowLeft /></>}</button>
          </form>
        </>
      )}

      <div className="auth-secure"><ShieldCheck />ورود امن با پیامک یک‌بارمصرف؛ بدون رمز عبور.</div>
    </motion.div>
  );
}
