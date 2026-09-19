import { Suspense } from 'react';
import { Metadata } from 'next';
import CheckoutResultBody from '@/components/CheckoutResultBody';

export const metadata: Metadata = { title: 'نتیجه سفارش', robots: { index: false } };

/**
 * Static shell. The gateway redirects back with ?status/&order/&method, which a
 * static host cannot read server-side, so the body reads them from the URL in
 * the browser. The order's real state always comes from PHP.
 */
export default function CheckoutResultPage() {
  return (
    <Suspense fallback={<div className="container order-success" style={{ minHeight: '40vh' }} />}>
      <CheckoutResultBody />
    </Suspense>
  );
}
