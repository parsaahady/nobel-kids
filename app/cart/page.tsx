import { Metadata } from 'next';
import CartClient from '@/components/CartClient';

export const metadata: Metadata = { title: 'سبد خرید' };
export default function CartPage() { return <CartClient />; }
