import type { TextShare } from "@/lib/domain/entities/text-share";
import type { ContentFormat } from "@/lib/domain/value-objects/content-format";

// The HTTP response body the day this goes headless, so treat it as a published API: adding a
// field is safe, removing or retyping one is breaking.
export type TextShareDto = {
  readonly code: string;
  /** Still compressed. The browser owns the codec, so the server never decodes this. */
  readonly content: string;
  readonly format: ContentFormat;
  readonly createdAtUtc: string;
  readonly expiresAtUtc: string;
  /** Distinct viewers, excluding the owner. Omitted entirely unless the reader owns the share. */
  readonly viewCount?: number;
};

// A history row deliberately omits `content`: the payload is opaque here and can run to
// hundreds of kilobytes, so listing fifty of them would move megabytes to render a list.
export type TextShareSummaryDto = {
  readonly code: string;
  readonly format: ContentFormat;
  readonly createdAtUtc: string;
  readonly expiresAtUtc: string;
  /** Decided server-side so the list does not depend on the viewer's device clock. */
  readonly expired: boolean;
};

export function toTextShareDto(share: TextShare, viewCount?: number): TextShareDto {
  return {
    ...(viewCount === undefined ? {} : { viewCount }),
    code: share.code,
    content: share.content,
    format: share.format,
    createdAtUtc: share.createdAt.toISOString(),
    expiresAtUtc: share.expiresAt.toISOString(),
  };
}

export function toTextShareSummaryDto(share: TextShare, now: Date): TextShareSummaryDto {
  return {
    code: share.code,
    format: share.format,
    createdAtUtc: share.createdAt.toISOString(),
    expiresAtUtc: share.expiresAt.toISOString(),
    expired: share.isExpired(now),
  };
}
