import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Gedeeld CV | VAT App",
};

export default function CvShareLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3">
          <Image
            src="/branding/vat-app-logo.svg"
            alt="ValentineZ Assist Tool"
            width={28}
            height={28}
            className="rounded-md"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900">ValentineZ Assist Tool</p>
            <p className="truncate text-xs text-gray-500">CV review</p>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
