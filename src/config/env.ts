import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default("127.0.0.1"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(8899),
  DATABASE_URL: z.string().default("sqlite:./var/agent-pulse.db"),
  ADMIN_TOKEN: z.string().min(16).optional(),
  COLLECTOR_USER_AGENT: z
    .string()
    .min(8)
    .default("agent-pulse/0.3 (+https://github.com/barretlee/agent-pulse)"),
  COLLECTOR_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(120_000).default(30_000),
  COLLECTOR_CONCURRENCY: z.coerce.number().int().min(1).max(16).default(4),
  PUBLIC_SITE_URL: z.string().url().default("https://barretlee.github.io/agent-pulse/"),
});

export type AppConfig = ReturnType<typeof loadConfig>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env) {
  const parsed = EnvSchema.parse(env);
  const databaseUrl = normalizeDatabaseUrl(parsed.DATABASE_URL);

  if (databaseUrl.startsWith("sqlite:")) {
    mkdirSync(dirname(databaseUrl.slice("sqlite:".length)), { recursive: true });
  }

  return {
    ...parsed,
    rootDir,
    databaseUrl,
    distDir: resolve(rootDir, "dist"),
  };
}

function normalizeDatabaseUrl(value: string): string {
  if (!value.startsWith("sqlite:")) return value;
  const path = value.slice("sqlite:".length);
  if (path === ":memory:") return "sqlite::memory:";
  return `sqlite:${resolve(rootDir, path)}`;
}
