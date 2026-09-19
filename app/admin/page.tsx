import { Metadata } from 'next';
import AdminGate from '@/components/admin/AdminGate';

export const metadata: Metadata = { title: 'مدیریت فروشگاه', robots: { index: false, follow: false } };

/**
 * Static shell for the React admin panel.
 *
 * Identity still comes ONLY from the dedicated admin password session
 * (nbl_admin_session), verified by PHP on every single admin API call.
 * AdminGate merely decides what to paint while that check happens; it grants
 * no access by itself.
 */
export default function AdminPage() {
  return <AdminGate />;
}
