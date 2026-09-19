'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Check, Heart, ShoppingBag, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, ApiError } from '@/lib/api-client';
import type { CartDTO, UserDTO } from '@/types';

type FlyOrigin = { x: number; y: number; image: string };
type ToastType = 'cart' | 'heart' | 'success' | 'error' | 'info';
type Toast = { id: number; message: string; type: ToastType };

type AddToCartInput = { productId: string; packMode: 'assorted' | 'single'; colorName: string; sizeLabel: string; packCount: number };

type StoreContextType = {
  // auth
  user: UserDTO | null;
  wishlistIds: string[];
  refreshAuth: () => Promise<void>;
  logout: () => Promise<void>;
  // cart
  cart: CartDTO;
  cartCount: number;
  cartLoading: boolean;
  addToCart: (input: AddToCartInput, origin?: FlyOrigin) => Promise<boolean>;
  updatePackCount: (cartItemId: string, packCount: number) => Promise<void>;
  removeFromCart: (cartItemId: string) => Promise<void>;
  refreshCart: () => Promise<void>;
  // wishlist
  toggleWishlist: (productId: string) => Promise<void>;
  // ui
  notify: (message: string, type?: ToastType) => void;
};

const EMPTY_CART: CartDTO = { id: null, items: [], subtotal: 0, baseTotal: 0, totalPacks: 0, totalPieces: 0 };

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [cart, setCart] = useState<CartDTO>(EMPTY_CART);
  const [cartLoading, setCartLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [flying, setFlying] = useState<(FlyOrigin & { id: number; tx: number; ty: number })[]>([]);
  const pathname = usePathname();
  const wishlistIdsRef = useRef<string[]>([]);
  wishlistIdsRef.current = wishlistIds;

  const notify = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-3), { id, message, type }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((toast) => toast.id !== id)), 3400);
  }, []);

  const refreshCart = useCallback(async () => {
    try {
      const fresh = await api.get<CartDTO>('/api/cart');
      setCart(fresh);
    } catch {
      /* network errors shouldn't blank the UI */
    } finally {
      setCartLoading(false);
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    try {
      const data = await api.get<{ user: UserDTO | null; wishlistIds: string[] }>('/api/auth/me');
      setUser(data.user);
      setWishlistIds(data.wishlistIds);
    } catch {
      setUser(null);
      setWishlistIds([]);
    }
  }, []);

  useEffect(() => {
    void refreshAuth();
    void refreshCart();
  }, [refreshAuth, refreshCart]);

  // Refetch the cart when navigating (covers back/after checkout nav flows).
  useEffect(() => {
    void refreshCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const addToCart = useCallback(
    async (input: AddToCartInput, origin?: FlyOrigin): Promise<boolean> => {
      try {
        const fresh = await api.post<CartDTO>('/api/cart/items', input);
        setCart(fresh);
        if (origin) {
          const target = document.querySelector('.cart-target')?.getBoundingClientRect();
          const id = Date.now();
          setFlying((prev) => [
            ...prev,
            { ...origin, id, tx: target?.left ?? window.innerWidth * 0.68, ty: target?.top ?? window.innerHeight - 60 },
          ]);
          window.setTimeout(() => setFlying((prev) => prev.filter((item) => item.id !== id)), 850);
        }
        notify(`پک‌بندی به پیش‌فاکتور اضافه شد`, 'cart');
        return true;
      } catch (error) {
        notify(error instanceof ApiError ? error.message : 'افزودن به سبد ممکن نشد', 'error');
        return false;
      }
    },
    [notify],
  );

  const updatePackCount = useCallback(
    async (cartItemId: string, packCount: number) => {
      try {
        const fresh = await api.patch<CartDTO>(`/api/cart/items/${cartItemId}`, { packCount });
        setCart(fresh);
      } catch (error) {
        notify(error instanceof ApiError ? error.message : 'تغییر تعداد ممکن نشد', 'error');
        await refreshCart();
      }
    },
    [notify, refreshCart],
  );

  const removeFromCart = useCallback(
    async (cartItemId: string) => {
      try {
        const fresh = await api.del<CartDTO>(`/api/cart/items/${cartItemId}`);
        setCart(fresh);
        notify('محصول از پیش‌فاکتور حذف شد');
      } catch (error) {
        notify(error instanceof ApiError ? error.message : 'حذف ممکن نشد', 'error');
        await refreshCart();
      }
    },
    [notify, refreshCart],
  );

  const toggleWishlist = useCallback(
    async (productId: string) => {
      const wasLiked = wishlistIdsRef.current.includes(productId);
      // optimistic flip
      setWishlistIds((prev) => (wasLiked ? prev.filter((id) => id !== productId) : [...prev, productId]));
      try {
        const result = await api.post<{ added: boolean }>('/api/wishlist', { productId });
        notify(result.added ? 'به علاقه‌مندی‌ها اضافه شد' : 'از علاقه‌مندی‌ها حذف شد', 'heart');
      } catch (error) {
        setWishlistIds((prev) => (wasLiked ? [...prev, productId] : prev.filter((id) => id !== productId)));
        if (error instanceof ApiError && error.status === 401) {
          notify('برای علاقه‌مندی‌ها ابتدا وارد حساب شوید', 'info');
        } else {
          notify('تغییر علاقه‌مندی ممکن نشد', 'error');
        }
      }
    },
    [notify],
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout');
    } finally {
      setUser(null);
      setWishlistIds([]);
      notify('از حساب خارج شدید', 'info');
      await refreshCart();
    }
  }, [notify, refreshCart]);

  const cartCount = cart.totalPacks;

  const value = useMemo<StoreContextType>(
    () => ({
      user, wishlistIds, refreshAuth, logout,
      cart, cartCount, cartLoading, addToCart, updatePackCount, removeFromCart, refreshCart,
      toggleWishlist, notify,
    }),
    [user, wishlistIds, refreshAuth, logout, cart, cartCount, cartLoading, addToCart, updatePackCount, removeFromCart, refreshCart, toggleWishlist, notify],
  );

  return (
    <StoreContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {flying.map((item) => (
          <motion.img
            key={item.id}
            src={item.image}
            alt=""
            className="flying-product"
            initial={{ left: item.x - 28, top: item.y - 28, opacity: 1, scale: 1, rotate: 0 }}
            animate={{ left: item.tx, top: item.ty, opacity: 0.25, scale: 0.15, rotate: -12 }}
            transition={{ duration: 0.78, ease: [0.22, 1, 0.36, 1] }}
          />
        ))}
      </AnimatePresence>
      <div className="toast-stack" aria-live="polite">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              className={`toast toast-${toast.type}`}
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: -30 }}
            >
              <span className={`toast-icon ${toast.type}`}>
                {toast.type === 'cart' ? <ShoppingBag size={17} /> : toast.type === 'heart' ? <Heart size={17} /> : toast.type === 'error' ? <AlertCircle size={17} /> : toast.type === 'info' ? <AlertCircle size={17} /> : <Check size={17} />}
              </span>
              <span>{toast.message}</span>
              <button onClick={() => setToasts((prev) => prev.filter((item) => item.id !== toast.id))} aria-label="بستن">
                <X size={15} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within StoreProvider');
  return context;
}
