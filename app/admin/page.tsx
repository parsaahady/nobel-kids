import { Metadata } from 'next';
import AdminPanel from '@/components/AdminPanel';

export const metadata: Metadata = { title: 'مدیریت عمده‌فروشی' };
export default function AdminPage() { return <AdminPanel />; }
