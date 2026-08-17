import { Metadata } from 'next';
import CheckoutClient from '@/components/CheckoutClient';

export const metadata: Metadata = { title: 'تکمیل سفارش' };
export default function CheckoutPage() { return <CheckoutClient />; }
