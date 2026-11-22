import Image from "next/image";
import type { ReactNode } from "react";

const LOGO = "/branding/vat-app-logo.svg";

type AuthShellProps = {
  children: ReactNode;
  /** Optional content above the form card (e.g. session reason banner) */
  banner?: ReactNode;
};

export default function AuthShell({ children, banner }: AuthShellProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-stone-100 via-gray-50 to-stone-100 px-4 py-10">
      <div className="flex w-full max-w-md flex-col items-center">
        <Image
          src={LOGO}
          alt="ValentineZ Assist Tool"
          width={72}
          height={72}
          className="rounded-2xl"
          priority
        />

        <h1 className="mt-5 text-center text-2xl font-semibold tracking-normal text-gray-900 sm:text-3xl">
          ValentineZ Assist Tool
        </h1>
        <p className="mt-2 text-center text-sm text-gray-500">
          Voor adviseurs van ValentineZ
        </p>

        {banner ? <div className="mt-5 w-full">{banner}</div> : null}

        <div className="mt-6 w-full rounded-xl border border-gray-200 bg-white p-6 sm:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
