"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import type { JsonObject } from "@/lib/domain/shared/json";
import type { UserDto } from "@/lib/application/dto/user";
import { decodeJwt, isExpired, timeClaims, type DecodedJwt } from "@/app/(tools)/_lib/decode-jwt";
import { formatTimestamp } from "@/app/(tools)/_lib/format-timestamp";
import { JsonTree } from "./json-tree";
import { ToolError, ToolHint, ToolPage } from "./tool-page";

const EXPANDED = { revision: 0, collapsed: false };

const CLAIM_LABELS = {
  issuedAt: "Issued at",
  notBefore: "Not before",
  expiresAt: "Expires at",
} as const;

export function JwtTool({ user }: { readonly user?: UserDto }) {
  const [token, setToken] = useState("");
  const result = token.trim() ? decodeJwt(token) : null;

  return (
    <ToolPage
      tool="jwt"
      {...(user ? { user } : {})}
      inputLabel="JSON Web Token"
      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.…"
      value={token}
      onValueChange={setToken}
    >
      {result === null ? (
        <ToolHint>Paste a token to read its header and claims.</ToolHint>
      ) : result.ok ? (
        <Decoded jwt={result.value} />
      ) : (
        <ToolError message={result.error} />
      )}
    </ToolPage>
  );
}

function Decoded({ jwt }: { readonly jwt: DecodedJwt }) {
  // Recomputed on render rather than stored: nothing here re-renders on a timer, so a stored
  // "now" would go stale silently while the token sits on screen.
  const now = new Date();
  const claims = timeClaims(jwt.payload);

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-medium">Signature</h2>
          <Badge variant="outline">Not verified</Badge>
        </div>
        <ToolHint>
          Verifying needs the issuer&apos;s key, which stays with the issuer. This shows what the
          token <em>claims</em>, never that the claim is true.
        </ToolHint>
      </section>

      {claims.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-medium">Validity</h2>
          <dl className="flex flex-col gap-1 text-sm">
            {claims.map((claim) => (
              <div key={claim.claim} className="flex flex-wrap items-baseline gap-x-2">
                <dt className="text-muted-foreground w-24 shrink-0 text-xs">
                  {CLAIM_LABELS[claim.kind]}
                </dt>
                <dd className="flex items-baseline gap-2">
                  <time dateTime={claim.iso} className="font-mono text-xs">
                    {formatTimestamp(claim.iso)}
                  </time>
                  <span className="text-muted-foreground font-mono text-xs">
                    {claim.claim} {claim.seconds}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
          {isExpired(jwt.payload, now) && <Badge variant="destructive">Expired</Badge>}
        </section>
      )}

      <Section title="Header" value={jwt.header} />
      <Section title="Payload" value={jwt.payload} />
    </div>
  );
}

function Section({ title, value }: { readonly title: string; readonly value: JsonObject }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xs font-medium">{title}</h2>
      <JsonTree value={value} expansion={EXPANDED} />
    </section>
  );
}
