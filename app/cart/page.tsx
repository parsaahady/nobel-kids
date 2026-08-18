import { Metadata } from 'next';
import CartClient from '@/components/CartClient';

export const metadata: Metadata = { title: 'پیش‌فاکتور عمده' };
export default function CartPage() { return <CartClient />; }
