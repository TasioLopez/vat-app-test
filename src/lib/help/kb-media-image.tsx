"use client";

import { useEffect, useState } from "react";
import { fetchKbMediaSignedUrl } from "@/lib/help/kb-media-signed-url";

export function KbMediaImg({ path, alt }: { path: string; alt: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const signed = await fetchKbMediaSignedUrl(path);
      if (!cancelled && signed) setUrl(signed);
    })();
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (!url) {
    return (
      <div className="my-4 h-32 bg-purple-50 rounded-lg animate-pulse text-sm text-purple-600 p-4">
        Loading image…
      </div>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className="rounded-lg max-w-full h-auto my-4 border border-purple-100" />;
}
