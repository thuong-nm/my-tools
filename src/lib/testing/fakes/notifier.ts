import type { Notifier, NotifierError, PasswordResetMessage } from "@/lib/domain/ports/notifier";
import { err, ok, type Result } from "@/lib/domain/shared/result";

export type FakeNotifier = Notifier & {
  readonly sent: readonly PasswordResetMessage[];
  failEverySend(error: NotifierError): void;
};

export function fakeNotifier(): FakeNotifier {
  const sent: PasswordResetMessage[] = [];
  let failure: NotifierError | undefined;

  return {
    sent,

    failEverySend(error: NotifierError) {
      failure = error;
    },

    async sendPasswordReset(message: PasswordResetMessage): Promise<Result<void, NotifierError>> {
      if (failure) return err(failure);
      sent.push(message);
      return ok(undefined);
    },
  };
}
