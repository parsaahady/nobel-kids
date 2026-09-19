import { Suspense } from 'react';
import { Metadata } from 'next';
import CheckoutGate from '@/components/CheckoutGate';
import { staticShippingMethods, staticSiteConfig } from '@/lib/static-data';

export const metadata: Metadata = { title: 'نهایی‌کردن سفارش عمده' };

/**
 * Static shell. Shipping methods and the gateway flag are baked in at build
 * time; the session check and address loading happen in the browser. The order
 * itself is still created — and fully re-priced — by PHP.
 */
export default function CheckoutPage() {
  return (
    <Suspense>
      <CheckoutGate
        shippingMethods={staticShippingMethods()}
        gatewayEnabled={staticSiteConfig().gatewayEnabled}
      />
    </Suspense>
  );
}
