'use client';

import { KeyRound } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { api, ApiError } from '@/lib/api-client';

/**
 * Security tab: change the admin panel password. Requires the current
 * password (a stolen session alone cannot rotate the password) and on success
 * all other admin sessions of this user are revoked server-side.
 */
export default function SettingsTab() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setDone(false);
    if (newPassword !== confirm) {
      setError('تکرار رمز جدید با رمز یکی نیست');
      return;
    }
    setLoading(true);
    try {
      await api.post('/api/admin-auth/change-password', { currentPassword, newPassword });
      setDone(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'تغییر رمز انجام نشد؛ دوباره تلاش کنید');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card admin-settings-card">
      <h2><KeyRound size={18} /> امنیت حساب مدیر</h2>
      <p className="muted">رمز عبور فقط برای ورود به پنل مدیریت استفاده می‌شود و با رمز یا نشست مشتری‌ها هیچ ربطی ندارد. با تغییر رمز، بقیه‌ی نشست‌های فعال مدیر روی همه‌ی دستگاه‌ها بسته می‌شوند.</p>
      <form onSubmit={submit} className="admin-password-form">
        <label>
          <span>رمز فعلی</span>
          <input type="password" dir="ltr" required autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
        </label>
        <label>
          <span>رمز جدید (دست‌کم ۱۰ نویسه)</span>
          <input type="password" dir="ltr" required minLength={10} autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        </label>
        <label>
          <span>تکرار رمز جدید</span>
          <input type="password" dir="ltr" required minLength={10} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </label>
        {error && <small className="form-error-text">{error}</small>}
        {done && <small className="form-success-text">رمز با موفقیت تغییر کرد؛ نشست بقیه‌ی دستگاه‌ها بسته شد.</small>}
        <button className="primary-button" disabled={loading}>
          {loading ? <span className="custom-loader" /> : 'تغییر رمز عبور'}
        </button>
      </form>
    </div>
  );
}
