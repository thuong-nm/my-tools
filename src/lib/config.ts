// The ONLY module that reads `process.env` (rule 7). Parsing is lazy because `next build` runs
// where production secrets legitimately do not exist, and module-scope parsing would fail it.
import { z } from "zod";

/** Trailing slashes cause double-slash callback URLs, which some upstreams reject. */
const urlNoTrailingSlash = z.url().transform((value) => value.replace(/\/+$/, ""));

// Normalised to a bare origin because that is what a browser sends in `Origin`: an entry with a
// trailing slash or a path would parse fine and then never match anything.
const originList = z
  .string()
  .default("")
  .transform((csv) =>
    csv
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  )
  .pipe(z.array(z.url()).transform((entries) => entries.map((entry) => new URL(entry).origin)));

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  APP_URL: urlNoTrailingSlash.default("http://localhost:3000"),

  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine(
      (value) => value.startsWith("postgresql://") || value.startsWith("postgres://"),
      "DATABASE_URL must be a PostgreSQL connection string",
    ),

  /** Timestamps are stored as UTC; this is the zone server-side rendering formats them in. */
  TZ: z.string().default("Asia/Ho_Chi_Minh"),

  /** Origins allowed to call `/api` from a browser. Empty means same-origin only. */
  CORS_ALLOWED_ORIGINS: originList,
});

type ServerEnv = z.infer<typeof serverEnvSchema>;

export type ServerConfig = {
  readonly nodeEnv: ServerEnv["NODE_ENV"];
  readonly isProduction: boolean;
  readonly appUrl: string;
  readonly timeZone: string;
  readonly database: { readonly url: string };
  readonly cors: { readonly allowedOrigins: readonly string[] };
};

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
}

// A blank value means "not set": `.optional()` accepts only `undefined`, so a bare `SOME_KEY=`
// left in `.env` would otherwise fail validation.
function withoutBlanks(
  source: Readonly<Record<string, string | undefined>>,
): Record<string, string | undefined> {
  const cleaned: Record<string, string | undefined> = {};

  for (const [key, value] of Object.entries(source)) {
    if (typeof value === "string" && value.trim().length === 0) continue;
    cleaned[key] = value;
  }

  return cleaned;
}

// Exported for tests, which pass an explicit record rather than mutating the real `process.env`.
export function parseServerConfig(
  source: Readonly<Record<string, string | undefined>>,
): ServerConfig {
  const parsed = serverEnvSchema.safeParse(withoutBlanks(source));

  if (!parsed.success) {
    throw new ConfigError(
      `Invalid environment configuration:\n${formatIssues(parsed.error)}\n\n` +
        `See .env for the expected variables.`,
    );
  }

  const env = parsed.data;

  return {
    nodeEnv: env.NODE_ENV,
    isProduction: env.NODE_ENV === "production",
    appUrl: env.APP_URL,
    timeZone: env.TZ,
    database: { url: env.DATABASE_URL },
    cors: { allowedOrigins: env.CORS_ALLOWED_ORIGINS },
  };
}

let cached: ServerConfig | undefined;

// Composition root only. Throws: a misconfigured process cannot serve any request correctly, so
// it should fail visibly rather than degrade.
export function serverConfig(): ServerConfig {
  cached ??= parseServerConfig(process.env);
  return cached;
}

/** Test-only: drop the memoised config. */
export function resetServerConfig(): void {
  cached = undefined;
}
