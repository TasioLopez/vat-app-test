import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'VGR afdrukken | VAT App',
};

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
});

export const dynamic = 'force-dynamic';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={montserrat.variable}>
      <body>{children}</body>
    </html>
  );
}
