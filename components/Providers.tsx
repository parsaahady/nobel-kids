'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Check, Heart, ShoppingBag, X } from 'lucide-react';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { CartItem } from '@/types';

type FlyOrigin = { x: number; y: number; image: string };
type Toast = { id: number; message: string; type: 'cart' | 'heart' | 'success' };

type StoreContextType = {
  cart: CartItem[];
  wishlist: number[];
  cartCount: number;
  addToCart: (item: CartItem, origin?: FlyOrigin) => void;
  removeFromCart: (productId: number, size: string, color: string) => void;
  updateQuantity: (productId: number, size: string, color: string, quantity: number) => void;
  clearCart: () => void;
  toggleWishlist: (productId: number) => void;
  notify: (message: string, type?: Toast['type']) => void;
};

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<number[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [flying, setFlying] = useState<(FlyOrigin & { id: number; tx: number; ty: number })[]>([]);

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('nobel-cart');
      const savedWishlist = localStorage.getItem('nobel-wishlist');
      if (savedCart) setCart(JSON.parse(savedCart));
      if (savedWishlist) setWishlist(JSON.parse(savedWishlist));
    } catch { /* local storage can be unavailable in private contexts */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem('nobel-cart', JSON.stringify(cart));
  }, [cart, hydrated]);

  useEffect(() => {
    if (hydrated) localStorage.setItem('nobel-wishlist', JSON.stringify(wishlist));
  }, [wishlist, hydrated]);

  const notify = (message: string, type: Toast['type'] = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((toast) => toast.id !== id)), 2800);
  };

  const addToCart = (item: CartItem, origin?: FlyOrigin) => {
    setCart((prev) => {
      const found = prev.find((row) => row.productId === item.productId && row.size === item.size && row.color === item.color);
      if (found) return prev.map((row) => row === found ? { ...row, quantity: row.quantity + item.quantity } : row);
      return [...prev, item];
    });
    if (origin) {
      const target = document.querySelector('.cart-target')?.getBoundingClientRect();
      const id = Date.now();
      setFlying((prev) => [...prev, { ...origin, id, tx: target?.left ?? window.innerWidth * .68, ty: target?.top ?? window.innerHeight - 60 }]);
      window.setTimeout(() => setFlying((prev) => prev.filter((item) => item.id !== id)), 850);
    }
    notify('به سبد خرید اضافه شد', 'cart');
  };

  const removeFromCart = (productId: number, size: string, color: string) => {
    setCart((prev) => prev.filter((row) => !(row.productId === productId && row.size === size && row.color === color)));
    notify('محصول از سبد حذف شد');
  };

  const updateQuantity = (productId: number, size: string, color: string, quantity: number) => {
    if (quantity < 1) return removeFromCart(productId, size, color);
    setCart((prev) => prev.map((row) => row.productId === productId && row.size === size && row.color === color ? { ...row, quantity } : row));
  };

  const clearCart = () => setCart([]);

  const toggleWishlist = (productId: number) => {
    const added = !wishlist.includes(productId);
    setWishlist((prev) => added ? [...prev, productId] : prev.filter((id) => id !== productId));
    notify(added ? 'به علاقه‌مندی‌ها اضافه شد' : 'از علاقه‌مندی‌ها حذف شد', 'heart');
  };

  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  return (
    <StoreContext.Provider value={{ cart, wishlist, cartCount, addToCart, removeFromCart, updateQuantity, clearCart, toggleWishlist, notify }}>
      {children}
      <AnimatePresence>
        {flying.map((item) => (
          <motion.img
            key={item.id}
            src={item.image}
            alt=""
            className="flying-product"
            initial={{ left: item.x - 28, top: item.y - 28, opacity: 1, scale: 1, rotate: 0 }}
            animate={{ left: item.tx, top: item.ty, opacity: .25, scale: .15, rotate: -12 }}
            transition={{ duration: .78, ease: [0.22, 1, 0.36, 1] }}
          />
        ))}
      </AnimatePresence>
      <div className="toast-stack" aria-live="polite">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div key={toast.id} className="toast" initial={{ opacity: 0, y: 20, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: -30 }}>
              <span className={`toast-icon ${toast.type}`}>
                {toast.type === 'cart' ? <ShoppingBag size={17} /> : toast.type === 'heart' ? <Heart size={17} /> : <Check size={17} />}
              </span>
              <span>{toast.message}</span>
              <button onClick={() => setToasts((prev) => prev.filter((item) => item.id !== toast.id))} aria-label="بستن"><X size={15} /></button>
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
