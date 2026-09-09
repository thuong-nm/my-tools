import { domainError, type DomainError } from "./domain-error";

// Thrown, not returned, because this channel means the CODE asked for something impossible on
// an already-valid aggregate — a bug, which a caller cannot meaningfully handle. Caller input
// errors go through `Result<T, DomainError>` instead.
export abstract class DomainRuleError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    // Without this, `instanceof` fails once the class hierarchy is transpiled down-level.
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toDomainError(): DomainError {
    return domainError(this.code, this.message, this.details());
  }

  protected details(): Readonly<Record<string, unknown>> | undefined {
    return undefined;
  }
}

// The message names the ALLOWED transitions, not just the rejected one — that answers the next
// question straight from the log line.
export class InvalidStateTransitionError extends DomainRuleError {
  readonly code = "INVALID_STATE_TRANSITION";

  constructor(
    readonly entityName: string,
    readonly from: string,
    readonly to: string,
    readonly allowedFromCurrent: readonly string[],
  ) {
    super(
      `${entityName} cannot transition from ${from} to ${to}. ` +
        (allowedFromCurrent.length > 0
          ? `Allowed from ${from}: ${allowedFromCurrent.join(", ")}.`
          : `${from} is a terminal state.`),
    );
  }

  protected override details() {
    return {
      entity: this.entityName,
      from: this.from,
      to: this.to,
      allowedFromCurrent: this.allowedFromCurrent,
    };
  }
}

/** Legal for the current state, but the arguments break an invariant. */
export class InvariantViolationError extends DomainRuleError {
  readonly code = "INVARIANT_VIOLATION";

  constructor(
    message: string,
    private readonly context?: Readonly<Record<string, unknown>>,
  ) {
    super(message);
  }

  protected override details() {
    return this.context;
  }
}
