import { Suspense } from 'react';
import { Metadata } from 'next';
import AccountClient from '@/components/AccountClient';

export const metadata: Metadata = { title: 'حساب کاربری' };
export default function AccountPage() { return <Suspense fallback={<div className="page-loading"><span className="custom-loader" /></div>}><AccountClient /></Suspense>; }
