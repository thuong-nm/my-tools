// `navigator.clipboard.writeText` REJECTS when the write is denied — no permission, an insecure
// context, or a headless browser. Left unhandled it logs an unhandled rejection and, worse, the
// caller still reports success.
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
