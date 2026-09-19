'use client';

/**
 * Static-export replacement for the old server-rendered /account page.
 *
 * The page used to run `getSessionUser()` on the server and branch. A static
 * host cannot do that, so the branch happens in the browser instead: the
 * StoreProvider already fetches /api/auth/me on mount, and this component
 * waits for that answer, then loads the account payload from the PHP API.
 *
 * Security is unchanged — every one of these endpoints re-checks the session
 * cookie server-side. Nothing here is trusted; hiding the UI is cosmetic only.
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api-client';
import type { AddressDTO, OrderSummaryDTO, PagedResult, ProductListItemDTO, UserDTO } from '@/types';
import AccountClient, { GuestAccount } from './AccountClient';
import { useStore } from './Providers';

const EMPTY_ORDERS: PagedResult<OrderSummaryDTO> = { items: [], total: 0, page: 1, pageSize: 8, totalPages: 0 };

type Payload = {
  orders: PagedResult<OrderSummaryDTO>;
  wishlist: ProductListItemDTO[];
  addresses: AddressDTO[];
};

export default function AccountGate() {
  const { user } = useStore();
  const params = useSearchParams();
  const next = params.get('next') ?? undefined;

  const [payload, setPayload] = useState<Payload | null>(null);
  const [checked, setChecked] = useState(false);

  // StoreProvider resolves /api/auth/me on mount; give it a tick before we
  // decide the visitor is a guest, so signed-in users never see a flash.
  useEffect(() => {
    const timer = window.setTimeout(() => setChecked(true), 60);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!user) {
      setPayload(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const [orders, wishlist, addresses] = await Promise.all([
        api.get<PagedResult<OrderSummaryDTO>>('/api/orders?page=1&pageSize=8').catch(() => EMPTY_ORDERS),
        api.get<{ items: ProductListItemDTO[] }>('/api/wishlist').catch(() => ({ items: [] })),
        api.get<{ items: AddressDTO[] }>('/api/account/addresses').catch(() => ({ items: [] })),
      ]);
      if (!cancelled) setPayload({ orders, wishlist: wishlist.items, addresses: addresses.items });
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (user) {
    if (!payload) return <AccountSkeleton />;
    return (
      <AccountClient
        user={user as UserDTO}
        initialOrders={payload.orders}
        initialWishlist={payload.wishlist}
        initialAddresses={payload.addresses}
      />
    );
  }

  if (!checked) return <AccountSkeleton />;
  return <GuestAccount next={next} />;
}

function AccountSkeleton() {
  return (
    <div className="container catalog-loading" style={{ minHeight: '48vh' }}>
      <div /><div /><div /><div />
    </div>
  );
}
