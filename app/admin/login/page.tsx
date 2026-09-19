import { Suspense } from 'react';
import { Metadata } from 'next';
import AdminLoginGate from '@/components/admin/AdminLoginGate';

export const metadata: Metadata = { title: 'ورود مدیران', robots: { index: false, follow: false } };

export default function AdminLoginPage() {
  return (
    <main className="admin-login-page">
      <Suspense>
        <AdminLoginGate />
      </Suspense>
    </main>
  );
}
