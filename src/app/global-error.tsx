"use client";

import "@/styles/globals.css";

// Replaces the root layout when the layout itself throws, so it must ship its own <html> and <body>
// and its own stylesheet import — nothing from layout.tsx is applied here.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground flex min-h-screen items-center justify-center p-6">
        <main className="max-w-md space-y-4 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Temporarily unavailable</h1>
          <p className="text-muted-foreground text-sm">
            Something failed before the page could load.
          </p>
          {error.digest && (
            <p className="text-muted-foreground text-xs tabular-nums">
              Reference {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            className="bg-primary text-primary-foreground min-h-11 rounded-lg px-5 text-sm font-medium"
          >
            Reload
          </button>
        </main>
      </body>
    </html>
  );
}
