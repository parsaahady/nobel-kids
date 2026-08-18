import Image from 'next/image';
import Link from 'next/link';
import { assetPath } from '@/lib/asset-path';

export default function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className={`brand-logo ${compact ? 'compact' : ''}`} aria-label="نوبل کیدز، صفحه اصلی">
      <span className="brand-mark"><Image src={assetPath('/brand/nobel-logo.webp')} alt="لوگوی لاک‌پشت نوبل کیدز" fill sizes="52px" priority /></span>
      <span className="brand-copy"><strong>NOBEL</strong><small>kids</small></span>
    </Link>
  );
}
