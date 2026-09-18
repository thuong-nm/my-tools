// Google requires either its floating badge or this attribution. The badge is hidden in
// base.css because it covers the editor's bottom-right corner, so this text is what keeps the
// integration compliant — do not remove one without restoring the other.
export function RecaptchaNotice({ enabled }: { readonly enabled: boolean }) {
  if (!enabled) return null;

  return (
    <p className="text-muted-foreground text-xs">
      Protected by reCAPTCHA — the Google{" "}
      <a
        href="https://policies.google.com/privacy"
        target="_blank"
        rel="noreferrer"
        className="underline underline-offset-2"
      >
        Privacy Policy
      </a>{" "}
      and{" "}
      <a
        href="https://policies.google.com/terms"
        target="_blank"
        rel="noreferrer"
        className="underline underline-offset-2"
      >
        Terms of Service
      </a>{" "}
      apply.
    </p>
  );
}
