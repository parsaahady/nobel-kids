'use client';

import { motion } from 'framer-motion';
import { KeyRound, LogIn, ShieldCheck, UserRound } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { api, ApiError } from '@/lib/api-client';

/**
 * Dedicated admin panel login — password based, completely separate from the
 * customer OTP flow (/account). Sessions land in the nbl_admin_session cookie.
 */
export default function AdminLoginForm({ next }: { next: string }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/api/admin-auth/login', { identifier: identifier.trim(), password });
      // Full navigation: the panel is a server component guarded by the new cookie.
      window.location.assign(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'ورود ممکن نشد؛ دوباره تلاش کنید');
      setLoading(false);
    }
  }

  return (
    <motion.div className="auth-card admin-login-card" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
      <div className="auth-icon"><ShieldCheck /></div>
      <small>ورود مدیران — نوبل کیدز</small>
      <h1>پنل مدیریت فروشگاه</h1>
      <p>این ورود فقط برای مدیران است و کاملاً مستقل از ورود مشتریان (کد پیامکی) کار می‌کند — با شماره موبایل مدیر و رمز عبور وارد شوید.</p>
      <form onSubmit={submit}>
        <label>
          <span>شماره موبایل مدیر</span>
          <div className="input-with-icon">
            <UserRound />
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              inputMode="tel"
              dir="ltr"
              placeholder="09xxxxxxxxx"
              autoComplete="username"
            />
          </div>
        </label>
        <label>
          <span>رمز عبور</span>
          <div className="input-with-icon">
            <KeyRound />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              dir="ltr"
              placeholder="••••••••••"
              autoComplete="current-password"
            />
          </div>
        </label>
        {error && <small className="form-error-text">{error}</small>}
        <button className="primary-button" disabled={loading}>
          {loading ? <span className="custom-loader" /> : <>ورود به پنل مدیریت <LogIn /></>}
        </button>
      </form>
      <small className="admin-login-note">نشست مدیر (کوکی جداگانه) با خروج اینجا یا پایان مدت اعتبار، فقط همین پنل را می‌بندد و به حساب مشتری شما دست نمی‌زند.</small>
    </motion.div>
  );
}
