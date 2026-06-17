import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gedeeld CV | VAT App',
};

export default function CvShareLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-[1400px] items-center">
          <span className="text-sm font-semibold text-[#00A3CC]">VAT App — CV review</span>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
