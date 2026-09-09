import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col justify-center gap-4 px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-muted-foreground text-sm">
        The link may be out of date.
      </p>
      <Link href="/" className="text-primary text-sm underline underline-offset-4">
        Back to start
      </Link>
    </main>
  );
}
