"use client";

import { useState } from "react";

import type { TextShareDto } from "@/lib/application/dto/text-share";
import type { ContentFormat } from "@/lib/domain/value-objects/content-format";
import type { Retention } from "@/lib/domain/value-objects/retention";
import { ApiError, apiPost } from "@/lib/http/client";
import { compress } from "@/app/(tools)/_lib/codec";

export type SaveShareInput = {
  readonly text: string;
  readonly format: ContentFormat;
  readonly retention: Retention;
  readonly recaptchaToken: string;
};

export function useSaveShare(): {
  readonly saving: boolean;
  readonly save: (input: SaveShareInput) => Promise<TextShareDto | { readonly error: string }>;
} {
  const [saving, setSaving] = useState(false);

  const save = async (input: SaveShareInput) => {
    setSaving(true);
    try {
      const { share } = await apiPost<{ share: TextShareDto }>("/api/text-share", {
        content: await compress(input.text),
        format: input.format,
        retention: input.retention,
        recaptchaToken: input.recaptchaToken,
      });
      return share;
    } catch (cause) {
      return { error: cause instanceof ApiError ? cause.message : "Could not save the share." };
    } finally {
      setSaving(false);
    }
  };

  return { saving, save };
}
