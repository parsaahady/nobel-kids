import { Metadata } from 'next';
import AdminPanel from '@/components/AdminPanel';

export const metadata: Metadata = { title: 'پنل مدیریت' };
export default function AdminPage() { return <AdminPanel />; }
