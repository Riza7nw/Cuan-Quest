"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

// Catches runtime errors thrown while rendering any (app) route (e.g. a failed
// query) and shows a recoverable fallback instead of a blank/broken screen.
// Next 16.2 renamed the retry prop from `reset` to `unstable_retry`.
export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed p-8 text-center">
      <p className="text-sm text-muted-foreground">
        Terjadi kesalahan saat memuat halaman. Coba lagi sebentar.
      </p>
      <Button onClick={() => unstable_retry()}>Coba lagi</Button>
    </div>
  );
}
