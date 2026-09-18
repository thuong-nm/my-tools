import { z } from "zod";

import { domainError, type DomainError } from "@/lib/domain/errors/domain-error";
import { err, ok, type Result } from "@/lib/domain/shared/result";

export type HumanCheck = {
  readonly score: number;
};

export type HumanCheckError = DomainError<"BOT_CHECK_FAILED" | "BOT_CHECK_UNAVAILABLE">;

export type VerifyHuman = (input: {
  readonly token: string;
  readonly action: string;
  readonly ip?: string;
}) => Promise<Result<HumanCheck, HumanCheckError>>;

// recaptcha.net, not google.com: it is Google's own alternative host for networks where
// google.com is blocked or unreliable, and it serves the same tokens against the same keys.
const VERIFY_URL = "https://www.recaptcha.net/recaptcha/api/siteverify";

const TIMEOUT_MS = 5000;

// `score` and `action` are absent on a failed verification, so neither may be required here.
const responseSchema = z.object({
  success: z.boolean(),
  score: z.number().optional(),
  action: z.string().optional(),
  "error-codes": z.array(z.string()).optional(),
});

function unavailable(reason: string): HumanCheckError {
  return domainError("BOT_CHECK_UNAVAILABLE", `Could not verify the reCAPTCHA token: ${reason}.`);
}

export function recaptchaVerifier(config: {
  readonly secretKey: string;
  readonly minScore: number;
}): VerifyHuman {
  return async ({ token, action, ip }) => {
    if (!token) return err(domainError("BOT_CHECK_FAILED", "No reCAPTCHA token was supplied."));

    let response: Response;
    try {
      response = await fetch(VERIFY_URL, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: config.secretKey,
          response: token,
          ...(ip ? { remoteip: ip } : {}),
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (cause) {
      return err(unavailable(cause instanceof Error ? cause.name : "network error"));
    }

    if (!response.ok) return err(unavailable(`siteverify answered ${response.status}`));

    const parsed = responseSchema.safeParse(await response.json().catch(() => null));
    if (!parsed.success) return err(unavailable("siteverify sent an unreadable body"));

    const body = parsed.data;

    if (!body.success) {
      const codes = body["error-codes"] ?? [];

      // A broken or expired key is OUR failure, not the visitor's: answering 403 would blame
      // them for a misconfiguration and hide it from us behind a plausible-looking rejection.
      return codes.some((code) => code.startsWith("invalid-input-secret") || code === "bad-request")
        ? err(unavailable(`siteverify rejected the request (${codes.join(", ")})`))
        : err(domainError("BOT_CHECK_FAILED", "The reCAPTCHA token was not accepted."));
    }

    // Without this, a token minted by the login form would be replayable against registration.
    if (body.action !== action) {
      return err(
        domainError("BOT_CHECK_FAILED", `The token was issued for a different action.`),
      );
    }

    const score = body.score ?? 0;
    if (score < config.minScore) {
      return err(
        domainError("BOT_CHECK_FAILED", "This request looked automated.", { score }),
      );
    }

    return ok({ score });
  };
}

/** Used when the config group is blank, so the app runs with bot checking switched off. */
export const alwaysHuman: VerifyHuman = () => Promise.resolve(ok({ score: 1 }));
