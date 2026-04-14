import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'CV afdrukken | VAT App',
};

export const dynamic = 'force-dynamic';

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={montserrat.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
