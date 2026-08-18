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
  title: { default: 'Nobel Kids | فروش عمده پوشاک بچه‌گانه', template: '%s | Nobel Kids' },
  description: 'خرید عمده پوشاک بچه‌گانه نوبل کیدز در پک‌های ۵ عددی و بیشتر، مستقیم از تولید با قیمت همکاری پلکانی.',
  keywords: ['پوشاک عمده بچه‌گانه', 'نوبل کیدز', 'خرید عمده لباس کودک', 'پک لباس بچه‌گانه', 'پخش عمده پوشاک کودک'],
  openGraph: { type: 'website', locale: 'fa_IR', siteName: 'Nobel Kids', title: 'Nobel Kids | فروش عمده پوشاک بچه‌گانه', description: 'پک‌های عمده ۵ عددی و بیشتر، مستقیم از تولید نوبل کیدز.', images: ['/products/photo_13.webp'] },
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
