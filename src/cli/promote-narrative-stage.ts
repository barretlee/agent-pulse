import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DeepSeekClient } from "../ai/deepseek.js";
import { loadConfig } from "../config/env.js";
import { createDatabase } from "../db/database.js";
import { migrateToLatest } from "../db/migrate.js";
import { Repository } from "../db/repository.js";
import { seedDatabase } from "../db/seed.js";
import { restoreRepositorySnapshot } from "../pipeline/snapshot.js";
import {
  applyStagePromotion,
  evaluateStagePromotion,
  loadMergedIndustryNarratives,
  type PromotionSource,
  parseStagePromotionCandidate,
  readStagePromotionFile,
  renderStagePromotionIssue,
  STAGE_PROMOTION_MODEL,
  STAGE_PROMOTION_PATH,
  selectStagePromotionCandidate,
} from "../pipeline/stage-promotion.js";
import type { EnrichedEvent } from "../pipeline/static-site/dto.js";

export async function runStagePromotionCli(args = process.argv.slice(2)): Promise<void> {
  const command = args[0] ?? "propose";
  if (command === "propose") return propose(args.slice(1));
  if (command === "render-issue") return renderIssue(args.slice(1));
  if (command === "apply") return apply(args.slice(1));
  throw new Error("unknown_stage_promotion_command");
}

async function propose(args: string[]): Promise<void> {
  const config = loadConfig();
  const candidatePath = requiredValue(args, "--candidate-path");
  if (!config.AI_STAGE_PROMOTION_ENABLED) {
    printReport({
      status: "disabled",
      model: config.DEEPSEEK_STAGE_MODEL,
      anchorEventSlug: null,
      trackSlug: null,
      promotionId: null,
      inputHash: null,
      usage: emptyUsage(),
    });
    return;
  }
  if (config.DEEPSEEK_STAGE_MODEL !== STAGE_PROMOTION_MODEL)
    throw new Error("stage_model_must_be_deepseek_v4_pro");

  const db = createDatabase(config);
  try {
    await migrateToLatest(db, config);
    const count = await db
      .selectFrom("events")
      .select(({ fn }) => fn.countAll<number>().as("count"))
      .executeTakeFirstOrThrow();
    if (Number(count.count) === 0) {
      await seedDatabase(db);
      await restoreRepositorySnapshot(db, config.rootDir);
    }
    const repository = new Repository(db);
    const [events, sources, narratives, promotions] = await Promise.all([
      repository.publicEvents(),
      repository.listSources(),
      loadMergedIndustryNarratives(config.rootDir),
      readStagePromotionFile(config.rootDir),
    ]);
    const enrichedEvents = (await Promise.all(
      events.map(async (event) => ({
        ...event,
        tracks: await repository.eventTracks(event.id),
        actors: await repository.eventActors(event.id),
      })),
    )) as EnrichedEvent[];
    const promotionSources: PromotionSource[] = sources.map((source) => ({
      slug: source.slug,
      name: source.name,
      tier: source.tier,
      role: source.role,
    }));
    const input = selectStagePromotionCandidate(
      enrichedEvents,
      promotionSources,
      narratives,
      promotions,
      valueFor(args, "--reference-at") ?? new Date().toISOString(),
    );
    if (!input) {
      printReport({
        status: "no_candidate",
        model: config.DEEPSEEK_STAGE_MODEL,
        anchorEventSlug: null,
        trackSlug: null,
        promotionId: null,
        inputHash: null,
        usage: emptyUsage(),
      });
      return;
    }
    if (!config.DEEPSEEK_API_KEY) throw new Error("missing_deepseek_api_key");
    const client = new DeepSeekClient({
      apiKey: config.DEEPSEEK_API_KEY,
      baseUrl: config.DEEPSEEK_BASE_URL,
      model: config.DEEPSEEK_STAGE_MODEL,
      timeoutMs: config.AI_STAGE_PROMOTION_TIMEOUT_MS,
    });
    const { report, candidate } = await evaluateStagePromotion(client, input);
    if (candidate) await writeJsonAtomic(candidatePath, candidate);
    printReport(report);
  } finally {
    await db.destroy();
  }
}

async function renderIssue(args: string[]): Promise<void> {
  const candidate = await readCandidate(requiredValue(args, "--candidate-path"));
  const issue = renderStagePromotionIssue(candidate, valueFor(args, "--actions-url"));
  if (args.includes("--title")) process.stdout.write(`${issue.title}\n`);
  else process.stdout.write(issue.body);
}

async function apply(args: string[]): Promise<void> {
  const config = loadConfig();
  const candidate = await readCandidate(requiredValue(args, "--candidate-path"));
  const issueNumber = Number(requiredValue(args, "--issue-number"));
  const issueUrl = requiredValue(args, "--issue-url");
  if (!Number.isInteger(issueNumber) || issueNumber <= 0) throw new Error("invalid_issue_number");
  const path = resolve(config.rootDir, STAGE_PROMOTION_PATH);
  const file = JSON.parse(await readFile(path, "utf8"));
  const result = applyStagePromotion(file, candidate, { number: issueNumber, url: issueUrl });
  if (result.changed) await writeJsonAtomic(path, result.file);
  process.stdout.write(
    `${JSON.stringify({ status: result.changed ? "applied" : "already_applied", promotionId: result.promotion.id, issueNumber }, null, 2)}\n`,
  );
}

async function readCandidate(path: string) {
  return parseStagePromotionCandidate(JSON.parse(await readFile(resolve(path), "utf8")));
}

function printReport(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

async function writeJsonAtomic(pathValue: string, value: unknown): Promise<void> {
  const path = resolve(pathValue);
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, path);
}

function emptyUsage() {
  return { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
}

function requiredValue(args: string[], flag: string): string {
  const value = valueFor(args, flag);
  if (!value) throw new Error(`missing_${flag.replace(/^--/, "").replaceAll("-", "_")}`);
  return value;
}

function valueFor(args: string[], flag: string): string | undefined {
  const inline = args.find((argument) => argument.startsWith(`${flag}=`));
  if (inline) return inline.slice(flag.length + 1);
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function safeErrorCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string")
    return error.code.replace(/[^a-zA-Z0-9_:-]/g, "_").slice(0, 100);
  if (error instanceof Error && /^[a-zA-Z0-9_:-]+$/.test(error.message)) return error.message;
  return "stage_promotion_failed";
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === currentFile) {
  runStagePromotionCli().catch((error) => {
    printReport({
      status: "failed",
      model: process.env.DEEPSEEK_STAGE_MODEL ?? STAGE_PROMOTION_MODEL,
      errorCode: safeErrorCode(error),
      usage: emptyUsage(),
    });
    process.exitCode = 1;
  });
}
