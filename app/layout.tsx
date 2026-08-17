import type { Metadata, Viewport } from 'next';
import '@fontsource/vazirmatn/300.css';
import '@fontsource/vazirmatn/400.css';
import '@fontsource/vazirmatn/500.css';
import '@fontsource/vazirmatn/600.css';
import '@fontsource/vazirmatn/700.css';
import '@fontsource/vazirmatn/800.css';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BottomNav from '@/components/BottomNav';
import PageTransition from '@/components/PageTransition';
import { StoreProvider } from '@/components/Providers';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: { default: 'Nobel Kids | پوشاک بچه‌گانه نوبل', template: '%s | Nobel Kids' },
  description: 'نوبل کیدز؛ تولید و پخش عمده پوشاک بچه‌گانه با تضمین کیفیت از سال ۱۳۹۶.',
  keywords: ['پوشاک بچه‌گانه', 'نوبل کیدز', 'لباس دخترانه', 'لباس پسرانه', 'پخش عمده پوشاک کودک'],
  openGraph: { type: 'website', locale: 'fa_IR', siteName: 'Nobel Kids', title: 'Nobel Kids | پوشاک بچه‌گانه نوبل', description: 'تولید و پخش عمده پوشاک بچه‌گانه؛ تضمین در کیفیت.', images: ['/products/photo_13.webp'] },
  robots: { index: true, follow: true }
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#fffaf4' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <StoreProvider>
          <a className="skip-link" href="#main-content">پرش به محتوای اصلی</a>
          <Header />
          <div id="main-content"><PageTransition>{children}</PageTransition></div>
          <Footer />
          <BottomNav />
        </StoreProvider>
      </body>
    </html>
  );
}
