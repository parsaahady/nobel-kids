import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function SectionHeader({ eyebrow, title, href, linkLabel = 'مشاهده همه', align = 'side' }: { eyebrow?: string; title: string; href?: string; linkLabel?: string; align?: 'side' | 'center' }) {
  return <div className={`section-header ${align === 'center' ? 'center' : ''}`}><div>{eyebrow && <span>{eyebrow}</span>}<h2>{title}</h2></div>{href && <Link href={href}>{linkLabel}<ArrowLeft /></Link>}</div>;
}
