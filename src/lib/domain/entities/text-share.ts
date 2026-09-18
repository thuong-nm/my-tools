import type { ValidationError } from "../errors/domain-error";
import { asTextShareId, asUserId, type TextShareId, type UserId } from "../shared/identifier";
import { isErr, ok, type Result } from "../shared/result";
import { contentFormat, type ContentFormat } from "../value-objects/content-format";
import { expiryFrom, retention } from "../value-objects/retention";
import { shareCode, type ShareCode } from "../value-objects/share-code";
import { sharedText, type SharedText } from "../value-objects/shared-text";

export type CreateTextShareProps = {
  readonly id: string;
  readonly code: string;
  readonly content: string;
  readonly format: string;
  readonly retention: string;
  readonly now: Date;
  /** Absent for a share saved without signing in — those stay anonymous and out of history. */
  readonly ownerId?: string;
};

export type RestoreTextShareProps = {
  readonly id: string;
  readonly code: string;
  readonly content: string;
  readonly format: string;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly ownerId?: string;
};

// Write-once: a share has no behaviour that changes it, so there is no state machine and no
// transition table. Expiry is derived from the clock on every read rather than stored as a
// status, which would go stale the moment nothing runs to update it.
export class TextShare {
  private constructor(
    readonly id: TextShareId,
    readonly code: ShareCode,
    readonly content: SharedText,
    readonly format: ContentFormat,
    // Unlike most auditing columns this one IS read by a rule: history orders by it and shows it.
    readonly createdAt: Date,
    readonly expiresAt: Date,
    readonly ownerId: UserId | undefined,
  ) {}

  static create(props: CreateTextShareProps): Result<TextShare, ValidationError> {
    const code = shareCode(props.code);
    if (isErr(code)) return code;

    const content = sharedText(props.content);
    if (isErr(content)) return content;

    const format = contentFormat(props.format);
    if (isErr(format)) return format;

    const window = retention(props.retention);
    if (isErr(window)) return window;

    return ok(
      new TextShare(
        asTextShareId(props.id),
        code.value,
        content.value,
        format.value,
        props.now,
        expiryFrom(props.now, window.value),
        props.ownerId === undefined ? undefined : asUserId(props.ownerId),
      ),
    );
  }

  // Skips the clock — a stored row is already at its expiry — but still checks the invariants,
  // so a row that no longer satisfies them surfaces as a failure instead of a broken entity.
  static restore(props: RestoreTextShareProps): Result<TextShare, ValidationError> {
    const code = shareCode(props.code);
    if (isErr(code)) return code;

    const content = sharedText(props.content);
    if (isErr(content)) return content;

    const format = contentFormat(props.format);
    if (isErr(format)) return format;

    return ok(
      new TextShare(
        asTextShareId(props.id),
        code.value,
        content.value,
        format.value,
        props.createdAt,
        props.expiresAt,
        props.ownerId === undefined ? undefined : asUserId(props.ownerId),
      ),
    );
  }

  isExpired(now: Date): boolean {
    return this.expiresAt.getTime() <= now.getTime();
  }
}
