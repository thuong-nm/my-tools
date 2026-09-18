export function Toast({ message }: { readonly message: string | null }) {
  if (message === null) return null;

  // `role="status"` is right here: a toast fires on a discrete action, not on every keystroke.
  return (
    <div
      role="status"
      className="bg-foreground text-background fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg px-4 py-2 text-sm shadow-lg"
    >
      {message}
    </div>
  );
}
