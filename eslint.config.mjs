import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/** Third-party packages that must never reach the inner layers. */
const ioPackages = [
  {
    group: ["next", "next/*", "@next/*"],
    message:
      "Framework import in an inner layer. lib/domain and lib/application must run " +
      "unchanged outside Next.js — that is the whole point of the architecture. Keep " +
      "Next.js in app/ and in src/proxy.ts.",
  },
  {
    group: [
      "@prisma/client",
      "@prisma/client/*",
      "@prisma/adapter-pg",
      ".prisma/*",
      "prisma/*",
      "@/prisma/**",
      "**/generated/client",
      "**/generated/client/**",
    ],
    message:
      "Prisma belongs to lib/infrastructure/prisma only. A Prisma model is not a domain " +
      "entity (rule 5) — go through a repository port and map with toDomain().",
  },
  {
    group: ["bcryptjs", "bcrypt", "argon2", "jsonwebtoken", "jose"],
    message:
      "Crypto and hashing libraries belong in lib/infrastructure/auth. A use case receives " +
      "`verifyPassword` as an injected function, the same way it receives `now` — that is what " +
      "keeps the application layer runnable without a native module.",
  },
  {
    group: ["axios", "axios/*", "node-fetch", "got", "undici", "ky"],
    message:
      "HTTP clients belong in lib/infrastructure adapters. An inner layer that can make " +
      "a network call is no longer testable without one.",
  },
  {
    group: ["node:*", "fs", "path", "crypto", "os", "child_process"],
    message:
      "Node built-ins are I/O (or non-determinism). Keep them in lib/infrastructure and " +
      "inject the result — pass `now` and `generateId` in rather than reading the clock " +
      "or minting a UUID here.",
  },
];

/** `ioPackages` minus the framework fence, for src/proxy.ts — which IS Next.js glue. */
const ioPackagesExceptNext = ioPackages.filter((pattern) => !pattern.group.includes("next"));

/** Outer layers the domain must never reach for. */
const outerLayers = [
  "@/lib/application",
  "@/lib/application/**",
  "@/lib/infrastructure",
  "@/lib/infrastructure/**",
  "@/lib/config",
  "@/app/**",
  "@/components/**",
  "../application/**",
  "../infrastructure/**",
  "../../application/**",
  "../../infrastructure/**",
  "../../../application/**",
  "../../../infrastructure/**",
  "../config",
  "../../config",
];

/**
 * Test doubles must never be reachable from shipped code. Merged into every production
 * layer's pattern list rather than declared as its own block: `no-restricted-imports` is a
 * single rule, so a second block matching the same files would REPLACE the layer fence
 * instead of adding to it.
 */
const testingFence = {
  group: ["@/lib/testing", "@/lib/testing/**", "**/testing/fakes/**"],
  message:
    "lib/testing holds test doubles. Importing it from production code would ship an " +
    "in-memory repository or a fake gateway. Tests may import it; nothing else.",
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // A leading underscore means "deliberately unused". Repository mappers rely on it:
  // `const { id: _id, ...updatable } = data` is how a field is excluded from an UPDATE.
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },

  // ── lib/domain: the innermost layer. Depends on NOTHING. ──────────────────
  // Includes lib/domain/ports: ports are interfaces the domain OWNS (dependency
  // inversion), so they are bound by exactly the same restrictions.
  {
    files: ["src/lib/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            testingFence,
            ...ioPackages,
            {
              group: ["zod", "zod/*"],
              message:
                "The domain validates with its own factories returning Result, not with " +
                "Zod. Zod parses untrusted input at the edges: route handlers (app/**) " +
                "and lib/config.ts.",
            },
            {
              group: outerLayers,
              message:
                "Dependencies point inward. lib/domain is the centre — it may not import " +
                "an outer layer. If the domain seems to need something from outside, it " +
                "belongs as a parameter, or as a port in lib/domain/ports.",
            },
          ],
        },
      ],
    },
  },

  // ── lib/application: orchestration. May use lib/domain and its ports. ──────
  {
    files: ["src/lib/application/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            testingFence,
            ...ioPackages,
            {
              group: [
                "@/lib/infrastructure",
                "@/lib/infrastructure/**",
                "@/app/**",
                "@/components/**",
                "../infrastructure/**",
                "../../infrastructure/**",
                "../../../infrastructure/**",
              ],
              message:
                "A use case depends on a PORT, never on an adapter. Declare the " +
                "capability in lib/domain/ports and let the container inject the " +
                "implementation (rule 3).",
            },
            {
              group: ["@/lib/config", "../config", "../../config"],
              message:
                "Use cases do not read configuration (rule 7). lib/config.ts is read " +
                "once in lib/infrastructure/container.ts and injected downward.",
            },
          ],
        },
      ],
    },
  },

  // ── lib/infrastructure: adapters. Vendor SDKs allowed, the framework is not. ─
  {
    files: ["src/lib/infrastructure/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            testingFence,
            {
              group: ["next", "next/*"],
              message:
                "Adapters must not depend on Next.js. If you need the request, pass the " +
                "plain values in from the route handler.",
            },
            {
              group: ["@/app/**", "@/components/**"],
              message:
                "Infrastructure is an outer layer, but it sits BELOW the UI — it must not " +
                "import from app/ or components/.",
            },
          ],
        },
      ],
    },
  },

  // Only lib/infrastructure/prisma/** may touch Prisma. This catches an adapter in
  // payment/, calendar/, crm/ or notification/ reaching for the database directly.
  {
    files: [
      "src/lib/infrastructure/payment/**/*.ts",
      "src/lib/infrastructure/calendar/**/*.ts",
      "src/lib/infrastructure/crm/**/*.ts",
      "src/lib/infrastructure/notification/**/*.ts",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            testingFence,
            {
              group: [
                "@prisma/client",
                "@prisma/adapter-pg",
                "@/prisma/**",
                "@/lib/infrastructure/prisma/**",
                "../prisma/**",
                "../../prisma/**",
              ],
              message:
                "Only lib/infrastructure/prisma may touch the database. A payment, " +
                "calendar, CRM or notification adapter that reads the database has two " +
                "responsibilities; give the use case a repository instead.",
            },
          ],
        },
      ],
    },
  },

  // ── app/: the HTTP + UI adapter. Thin (rule 4). ────────────────────────────
  {
    files: ["src/app/**/*.ts", "src/app/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            testingFence,
            {
              group: [
                "@prisma/client",
                "@prisma/client/*",
                "@prisma/adapter-pg",
                ".prisma/*",
                "@/prisma/**",
                "**/generated/client",
                "**/generated/client/**",
                "@/lib/infrastructure/prisma/**",
              ],
              message:
                "No database access from a route handler or page. Call a use case; it " +
                "reaches the database through a repository port (rules 4 and 5).",
            },
            {
              group: [
                "@/lib/infrastructure/payment/**",
                "@/lib/infrastructure/calendar/**",
                "@/lib/infrastructure/crm/**",
                "@/lib/infrastructure/notification/**",
              ],
              message:
                "Do not construct an adapter in app/. Ask lib/infrastructure/container " +
                "for it — the container is the single composition root.",
            },
            {
              // A page or route handler that reads a signing secret inline is how the same key
              // ends up read in three places. Keep secret-bearing helpers behind app/_lib, which
              // gets its own relaxation below.
              group: ["@/lib/infrastructure/auth/**"],
              message:
                "Anything that needs a signing secret goes through app/_lib, which reads it " +
                "once. Injected functions a use case receives (rule 3) are not key holders and " +
                "may be exempted here as they appear.",
            },
            {
              group: ["../*", "../../*", "../../../*", "../../../../*"],
              message:
                "Inside app/, import with the @/ alias. Route folders get moved and renamed; a " +
                "relative path that climbs out of its own folder breaks silently when they do.",
            },
          ],
        },
      ],
    },
  },


  // ── app/_lib: the auth edge. The ONE place in app/ allowed to touch lib/infrastructure/auth,
  // because signing a session cookie needs `cookies()` and cannot live in an inner layer.
  // Placed AFTER the app/** block so it wins: no-restricted-imports is a single rule, and a
  // later block matching the same files REPLACES the earlier options rather than merging them.
  {
    files: ["src/app/_lib/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            testingFence,
            {
              group: [
                "@prisma/client",
                "@prisma/adapter-pg",
                "@/prisma/**",
                "@/lib/infrastructure/prisma/**",
              ],
              message:
                "Still no direct database access. Go through the container's repositories.",
            },
          ],
        },
      ],
    },
  },

  // ── src/proxy.ts: Next 16's proxy (the former middleware). Runs before every matched
  // request, so only cheap, optimistic edge work belongs here — CORS headers today. It may read
  // lib/config (rule 7's injection point) and lib/http, and nothing deeper: a query or a token
  // check would run on requests that never needed it, and Next.js explicitly does not offer
  // proxy as an authorization boundary.
  {
    files: ["src/proxy.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            testingFence,
            ...ioPackagesExceptNext,
            {
              group: [
                "@/lib/domain/**",
                "@/lib/application/**",
                "@/lib/infrastructure/**",
                "@/app/**",
                "@/components/**",
                "../**",
              ],
              message:
                "proxy.ts runs on every matched request and cannot be trusted as a security " +
                "boundary. Keep business rules in a use case and the real check next to the " +
                "data — a layout or a route handler.",
            },
          ],
        },
      ],
    },
  },

  // ── components/: shared UI only. It is a LEAF — nothing above it may be imported. ──
  // Before this fence existed, five admin components imported Server Actions out of app/, so
  // app/ and components/ depended on each other in both directions.
  {
    files: ["src/components/**/*.ts", "src/components/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            testingFence,
            {
              group: ["@/app/**"],
              message:
                "components/ holds UI shared by every route group, so it must not depend on " +
                "any one of them. A component that needs a Server Action or a page helper is " +
                "not shared — colocate it in that route's _components folder.",
            },
            {
              group: [
                "@prisma/client",
                "@prisma/adapter-pg",
                "@/prisma/**",
                "**/generated/client/**",
                "@/lib/infrastructure/**",
                "@/lib/config",
              ],
              message:
                "A component never reaches the database, an adapter or the environment. It " +
                "receives already-serialised DTOs as props.",
            },
            {
              group: ["../*", "../../*", "../../../*"],
              message:
                "Import with the @/ alias. Same rule as app/: a path that climbs out of its own " +
                "folder breaks silently the day the folder moves.",
            },
          ],
        },
      ],
    },
  },

  // ── lib/http: the wire contract, shared by route handlers and the browser client. ──
  // Pure TypeScript on purpose: the envelope has to be readable by a future separate frontend.
  {
    files: ["src/lib/http/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            testingFence,
            ...ioPackages,
            {
              group: [
                "@/lib/domain/**",
                "@/lib/application/**",
                "@/lib/infrastructure/**",
                "@/lib/config",
                "@/app/**",
                "@/components/**",
              ],
              message:
                "lib/http describes the HTTP envelope and nothing else. It must not know about " +
                "the domain, a use case or an adapter — callers supply the payload type.",
            },
          ],
        },
      ],
    },
  },

  // ── Test files ─────────────────────────────────────────────────────────────
  // These come last so they win. Tests are the one place `lib/testing` is legitimate.

  // Domain tests keep the purity fence: the whole point of the domain suite is that it runs
  // with no framework, no Prisma and no network, so importing any of those is still an error.
  {
    files: ["src/lib/domain/**/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            ...ioPackages,
            {
              group: outerLayers,
              message:
                "A domain test may only exercise the domain. Reaching into an outer layer " +
                "means the test no longer proves the domain stands alone.",
            },
          ],
        },
      ],
    },
  },

  // Other tests are unrestricted: they are never shipped, and they need the fakes.
  {
    files: [
      "src/lib/application/**/*.test.ts",
      "src/lib/infrastructure/**/*.test.ts",
      "**/*.integration.test.ts",
      "src/lib/testing/**/*.ts",
    ],
    rules: {
      "no-restricted-imports": "off",
    },
  },

  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated Prisma client: not ours to lint, and it is `@ts-nocheck`'d anyway.
    "prisma/generated/**",
  ]),
]);

export default eslintConfig;
