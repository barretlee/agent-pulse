import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
let localEnvLoaded = false;

const booleanEnv = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

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
  COLLECTOR_PROXY_MODE: z.enum(["off", "env-fallback"]).default("env-fallback"),
  PUBLIC_SITE_URL: z.string().url().default("https://barretlee.github.io/agent-pulse/"),
  DEEPSEEK_API_KEY: z.string().min(16).optional(),
  DEEPSEEK_BASE_URL: z.string().url().default("https://api.deepseek.com"),
  DEEPSEEK_MODEL: z.string().min(3).default("deepseek-v4-flash"),
  AI_ENRICHMENT_ENABLED: booleanEnv,
  AI_ENRICHMENT_MAX_EVENTS: z.coerce.number().int().min(1).max(50).default(8),
  AI_ENRICHMENT_TIMEOUT_MS: z.coerce.number().int().min(5_000).max(120_000).default(60_000),
  AI_STAGE_PROMOTION_ENABLED: booleanEnv,
  DEEPSEEK_STAGE_MODEL: z.string().min(3).default("deepseek-v4-pro"),
  AI_STAGE_PROMOTION_TIMEOUT_MS: z.coerce.number().int().min(10_000).max(180_000).default(120_000),
});

export type AppConfig = ReturnType<typeof loadConfig>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env) {
  loadLocalEnv(env);
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

function loadLocalEnv(env: NodeJS.ProcessEnv): void {
  if (env !== process.env || localEnvLoaded || env.NODE_ENV === "test") return;
  localEnvLoaded = true;
  const path = resolve(rootDir, ".env");
  if (existsSync(path)) loadEnvFile(path);
}

function normalizeDatabaseUrl(value: string): string {
  if (!value.startsWith("sqlite:")) return value;
  const path = value.slice("sqlite:".length);
  if (path === ":memory:") return "sqlite::memory:";
  return `sqlite:${resolve(rootDir, path)}`;
}
