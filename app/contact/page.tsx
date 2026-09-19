import { Metadata } from 'next';
import ContactClient from '@/components/ContactClient';

export const metadata: Metadata = { title: 'تماس و سفارش عمده', description: 'آدرس، تلفن و راه‌های ارتباط برای دریافت موجودی و سفارش عمده نوبل کیدز.' };
export default function ContactPage() { return <ContactClient />; }
