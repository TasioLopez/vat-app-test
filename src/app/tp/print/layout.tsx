// Minimal layout for the print route only
export const dynamic = "force-dynamic";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>
        {children}
      </body>
    </html>
  );
}
