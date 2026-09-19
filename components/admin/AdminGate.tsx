'use client';

/**
 * Static-export replacement for the server-rendered /admin page.
 *
 * ⚠ SECURITY NOTE — read before changing anything here.
 *
 * This component decides what to PAINT, never what is ALLOWED. Authorisation
 * lives entirely in PHP: every /api/admin/* endpoint calls require_admin(),
 * which validates the nbl_admin_session cookie against the sessions table and
 * checks the role column. A visitor who bypasses this component (by editing JS,
 * or by requesting the HTML directly) sees an empty dashboard and gets 401/403
 * on every data call. Hiding the panel is a convenience, not the control.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import AdminPanel from './AdminPanel';

type AdminMe = { id: string; mobile: string; name: string | null; role: 'ADMIN' | 'SUPER_ADMIN' };

export default function AdminGate() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminMe | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'denied'>('loading');

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ user: AdminMe }>('/api/admin-auth/me')
      .then((result) => {
        if (cancelled) return;
        setAdmin(result.user);
        setState('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setState('denied');
        router.replace('/admin/login?next=/admin');
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (state !== 'ready' || !admin) {
    return (
      <div className="admin-boot">
        <span className="admin-boot-spinner" />
        <p>{state === 'denied' ? 'در حال انتقال به صفحه ورود…' : 'در حال بررسی دسترسی…'}</p>
      </div>
    );
  }

  return (
    <AdminPanel
      adminRole={admin.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'ADMIN'}
      adminName={admin.name ?? admin.mobile}
    />
  );
}
