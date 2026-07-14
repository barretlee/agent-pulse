import { DeepSeekClient } from "../ai/deepseek.js";
import { loadConfig } from "../config/env.js";
import { createDatabase } from "../db/database.js";
import { migrateToLatest } from "../db/migrate.js";
import { enrichReviewEvents } from "../pipeline/ai-enrichment.js";

const config = loadConfig();
const dryRun = process.argv.includes("--dry-run");
const requireSuccess = process.argv.includes("--require-success");
const maxArgument = process.argv.find((argument) => argument.startsWith("--max-events="));
const maxEvents = maxArgument
  ? Number(maxArgument.slice("--max-events=".length))
  : config.AI_ENRICHMENT_MAX_EVENTS;

if (!config.AI_ENRICHMENT_ENABLED) {
  console.log(JSON.stringify({ enabled: false, skipped: "AI_ENRICHMENT_ENABLED is false" }));
  process.exit(0);
}
if (!config.DEEPSEEK_API_KEY)
  throw new Error("DEEPSEEK_API_KEY is required when AI enrichment is enabled");
if (!Number.isInteger(maxEvents) || maxEvents < 1 || maxEvents > 50) {
  throw new Error("--max-events must be an integer between 1 and 50");
}

const db = createDatabase(config);
try {
  await migrateToLatest(db, config);
  const client = new DeepSeekClient({
    apiKey: config.DEEPSEEK_API_KEY,
    baseUrl: config.DEEPSEEK_BASE_URL,
    model: config.DEEPSEEK_MODEL,
    timeoutMs: config.AI_ENRICHMENT_TIMEOUT_MS,
  });
  const report = await enrichReviewEvents(db, client, { maxEvents, dryRun });
  console.log(JSON.stringify({ enabled: true, model: config.DEEPSEEK_MODEL, ...report }, null, 2));
  if (requireSuccess && report.candidates > 0 && report.succeeded === 0) process.exitCode = 1;
} finally {
  await db.destroy();
}
