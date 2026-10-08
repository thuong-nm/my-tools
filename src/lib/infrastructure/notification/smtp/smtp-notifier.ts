import { createTransport, type Transporter } from "nodemailer";

import { domainError } from "@/lib/domain/errors/domain-error";
import type { Notifier, PasswordResetMessage } from "@/lib/domain/ports/notifier";
import { err, ok } from "@/lib/domain/shared/result";

export type SmtpConfig = {
  readonly host: string;
  readonly port: number;
  readonly user: string;
  readonly password: string;
  readonly from: string;
  readonly fromName: string;
};

/**
 * The object form, not `"Name <addr>"`: nodemailer handles the quoting and RFC 2047 encoding,
 * which a hand-built string gets wrong the moment the name holds a comma or a non-ASCII letter.
 */
export function senderField(config: SmtpConfig): { readonly name: string; readonly address: string } {
  return { name: config.fromName, address: config.from };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function body(message: PasswordResetMessage): { readonly text: string; readonly html: string } {
  const expires = message.expiresAt.toISOString();
  const text = [
    "Someone asked to reset the password for this account.",
    "",
    message.resetUrl,
    "",
    `This link works once and expires at ${expires}.`,
    "If it was not you, ignore this email — nothing has changed.",
  ].join("\n");

  const href = escapeHtml(message.resetUrl);
  const html = [
    "<p>Someone asked to reset the password for this account.</p>",
    `<p><a href="${href}">Choose a new password</a></p>`,
    `<p>This link works once and expires at ${escapeHtml(expires)}.</p>`,
    "<p>If it was not you, ignore this email — nothing has changed.</p>",
  ].join("");

  return { text, html };
}

export function smtpNotifier(config: SmtpConfig): Notifier {
  // Built once: a transport holds a connection pool, and rebuilding per send reopens TLS
  // every time.
  let transport: Transporter | undefined;

  return {
    async sendPasswordReset(message: PasswordResetMessage) {
      transport ??= createTransport({
        host: config.host,
        port: config.port,
        // 465 is implicit TLS; everything else starts plaintext and upgrades with STARTTLS.
        secure: config.port === 465,
        auth: { user: config.user, pass: config.password },
      });

      try {
        await transport.sendMail({
          from: senderField(config),
          to: message.to,
          subject: "Reset your password",
          ...body(message),
        });

        return ok(undefined);
      } catch (cause) {
        // The vendor message names hosts and credentials, so it goes to `details` for the log.
        return err(
          domainError("NOTIFIER_UNAVAILABLE", "The email could not be sent.", {
            cause: cause instanceof Error ? cause.message : String(cause),
          }),
        );
      }
    },
  };
}

/**
 * Used when the SMTP group is blank. It FAILS rather than silently succeeding: a password reset
 * that reports success without sending anything strands the account holder with no way to tell.
 */
export const unconfiguredNotifier: Notifier = {
  sendPasswordReset: () =>
    Promise.resolve(
      err(domainError("NOTIFIER_UNAVAILABLE", "Email is not configured on this deployment.")),
    ),
};
