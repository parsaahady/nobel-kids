import { Suspense } from 'react';
import { Metadata } from 'next';
import AccountGate from '@/components/AccountGate';

export const metadata: Metadata = { title: 'حساب همکاران' };

/**
 * Static shell. The session check moved into the browser (AccountGate) because
 * a static host has no request context. Every endpoint it calls still enforces
 * the session server-side in PHP.
 */
export default function AccountPage() {
  return (
    <Suspense>
      <AccountGate />
    </Suspense>
  );
}
