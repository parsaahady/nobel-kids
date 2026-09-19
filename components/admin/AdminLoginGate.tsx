'use client';

/**
 * Static-export wrapper for the admin login page.
 *
 * Reads ?next= from the URL (a static host cannot give us searchParams on the
 * server) and bounces already-authenticated admins straight to the panel.
 * The open-redirect guard from the old server page is preserved: only paths
 * beginning with /admin are ever honoured.
 */

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api-client';
import AdminLoginForm from './AdminLoginForm';

export default function AdminLoginGate() {
  const router = useRouter();
  const params = useSearchParams();
  const rawNext = params.get('next') ?? '/admin';
  const next = rawNext.startsWith('/admin') ? rawNext : '/admin';
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/api/admin-auth/me')
      .then(() => {
        if (!cancelled) router.replace(next);
      })
      .catch(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [router, next]);

  if (checking) {
    return (
      <div className="admin-boot">
        <span className="admin-boot-spinner" />
        <p>در حال بررسی دسترسی…</p>
      </div>
    );
  }

  return <AdminLoginForm next={next} />;
}
