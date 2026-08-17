import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return <section className="container not-found"><span>۴۰۴</span><i>🐢</i><h1>این صفحه را پیدا نکردیم</h1><p>شاید محصول جابه‌جا شده یا آدرس را اشتباه وارد کرده‌اید.</p><Link className="primary-button" href="/">بازگشت به خانه <ArrowLeft /></Link></section>;
}
