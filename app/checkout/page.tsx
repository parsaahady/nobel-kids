import { Metadata } from 'next';
import CheckoutClient from '@/components/CheckoutClient';

export const metadata: Metadata = { title: 'ثبت درخواست عمده' };
export default function CheckoutPage() { return <CheckoutClient />; }
