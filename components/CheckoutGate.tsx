'use client';

/**
 * Static-export replacement for the server-rendered /checkout page.
 *
 * Previously the server called getSessionUser() and redirected guests. Now the
 * browser does that check. The PHP checkout endpoint still rejects any request
 * without a valid session cookie, and still recomputes every price from the
 * database — this component cannot influence what the customer is charged.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import type { AddressDTO, ShippingMethod } from '@/types';
import CheckoutClient from './CheckoutClient';
import { useStore } from './Providers';

type Props = {
  shippingMethods: ShippingMethod[];
  gatewayEnabled: boolean;
};

export default function CheckoutGate({ shippingMethods, gatewayEnabled }: Props) {
  const { user } = useStore();
  const router = useRouter();
  const [addresses, setAddresses] = useState<AddressDTO[] | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setChecked(true), 60);
    return () => window.clearTimeout(timer);
  }, []);

  // Guests go to the login page, exactly like the old server-side redirect.
  useEffect(() => {
    if (checked && !user) router.replace('/account?next=/checkout');
  }, [checked, user, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    api
      .get<{ items: AddressDTO[] }>('/api/account/addresses')
      .then((result) => {
        if (!cancelled) setAddresses(result.items);
      })
      .catch(() => {
        if (!cancelled) setAddresses([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user || addresses === null) {
    return (
      <div className="container catalog-loading" style={{ minHeight: '48vh' }}>
        <div /><div /><div /><div />
      </div>
    );
  }

  return (
    <CheckoutClient
      addresses={addresses}
      shippingMethods={shippingMethods}
      gatewayEnabled={gatewayEnabled}
      defaults={{
        name: user.name ?? '',
        businessName: user.businessName ?? '',
        mobile: user.mobile,
      }}
    />
  );
}
