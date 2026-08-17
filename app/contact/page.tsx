import { Metadata } from 'next';
import ContactClient from '@/components/ContactClient';

export const metadata: Metadata = { title: 'تماس با ما', description: 'آدرس، تلفن و راه‌های ارتباط با فروشگاه نوبل کیدز در بازار بزرگ تهران.' };
export default function ContactPage() { return <ContactClient />; }
