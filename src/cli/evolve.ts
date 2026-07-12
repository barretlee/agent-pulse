/**
 * Auditable evolution runner.
 *
 * The runner changes data only through collection and clustering. Candidate
 * persistence and static export are explicit opt-ins. It never activates,
 * degrades, quarantines, retires, or publishes sources/events automatically.
 */

import { randomUUID } from "node:crypto";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Kysely } from "kysely";
import { type AppConfig, loadConfig } from "../config/env.js";
import { createDatabase } from "../db/database.js";
import { migrateToLatest } from "../db/migrate.js";
import { seedDatabase } from "../db/seed.js";
import type { DatabaseSchema } from "../db/types.js";
import { clusterSignals } from "../pipeline/cluster.js";
import { collectSources } from "../pipeline/collect.js";
import {
  type DiscoveryReport,
  discoverNewSources,
  saveDiscoveredSources,
} from "../pipeline/discovery.js";
import { exportStaticSite } from "../pipeline/export.js";
import { generatePipelineFunnel, type PipelineFunnelReport } from "../pipeline/funnel.js";
import { generateMonitorReport, type MonitorReport } from "../pipeline/monitor.js";
import { type EvolutionPlan, generateEvolutionPlan } from "../pipeline/strategy.js";

type EvolutionDatabase = Kysely<DatabaseSchema>;

export interface EvolutionCliOptions {
  once: boolean;
  intervalMs: number;
  maxIterations: number;
  reportDir: string;
  saveCandidates: boolean;
  exportStatic: boolean;
  help: boolean;
}

export type FunnelMetrics = PipelineFunnelReport;

export interface EvolutionInitialization {
  migrated: boolean;
  databaseWasEmpty: boolean;
  seeded: boolean;
  seedReason: "empty-database" | "existing-data";
}

export interface EvolutionIterationReport {
  schemaVersion: 1;
  iteration: number;
  status: "completed" | "partial" | "failed" | "interrupted";
  phase: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  objective: string;
  initialization: EvolutionInitialization;
  policies: {
    automaticSourceLifecycleChanges: false;
    automaticPublication: false;
    candidatePersistence: boolean;
    staticExport: boolean;
  };
  problems: string[];
  changes: {
    signalsCreated: number;
    eventsCreated: number;
    signalsAttached: number;
    signalsDeferred: number;
    candidatesSaved: number;
    staticExported: boolean;
    capabilities: string[];
  };
  collection: {
    collected: number;
    created: number;
    skipped: number;
    errors: string[];
  } | null;
  clustering: { created: number; attached: number; deferred?: number } | null;
  discovery: {
    candidates: number;
    saved: number;
    persistenceEnabled: boolean;
  } | null;
  funnel: FunnelMetrics | null;
  monitor: MonitorReport | null;
  strategy: EvolutionPlan | null;
  testBoundaries: string[];
  nextIteration: {
    willContinue: boolean;
    scheduledAt: string | null;
    recommendedActions: string[];
  };
  stageErrors: Array<{ phase: string; message: string }>;
}

export interface EvolutionCheckpoint {
  schemaVersion: 1;
  iteration: number;
  phase: string;
  status: "running" | EvolutionIterationReport["status"];
  startedAt: string;
  updatedAt: string;
  stopRequested: boolean;
  stopReason: string | null;
  reportPath: string | null;
}

interface CollectionResult {
  collected: number;
  created: number;
  skipped: number;
  errors: string[];
}

interface EvolutionServices {
  migrate: (db: EvolutionDatabase, config: AppConfig) => Promise<void>;
  databaseIsEmpty: (db: EvolutionDatabase) => Promise<boolean>;
  seed: (db: EvolutionDatabase) => Promise<void>;
  collect: (db: EvolutionDatabase, config: AppConfig) => Promise<CollectionResult>;
  cluster: (
    db: EvolutionDatabase,
  ) => Promise<{ created: number; attached: number; deferred?: number }>;
  readiness: (db: EvolutionDatabase) => Promise<FunnelMetrics>;
  monitor: (db: EvolutionDatabase) => Promise<MonitorReport>;
  strategy: (monitor: MonitorReport) => EvolutionPlan;
  discover: (db: EvolutionDatabase) => Promise<DiscoveryReport>;
  saveCandidates: (
    db: EvolutionDatabase,
    candidates: DiscoveryReport["candidates"],
  ) => Promise<{ created: number; skipped: number }>;
  exportStatic: (db: EvolutionDatabase, config: AppConfig) => Promise<unknown>;
  now: () => Date;
}

export type EvolutionServiceOverrides = Partial<EvolutionServices>;

export class EvolutionStopController {
  requested = false;
  reason: string | null = null;
  private waitAbortController: AbortController | null = null;

  request(reason: string): void {
    if (this.requested) return;
    this.requested = true;
    this.reason = reason;
    this.waitAbortController?.abort();
  }

  async wait(ms: number): Promise<boolean> {
    if (this.requested) return false;
    const controller = new AbortController();
    this.waitAbortController = controller;
    try {
      await abortableDelay(ms, controller.signal);
      return true;
    } catch (error) {
      if (controller.signal.aborted) return false;
      throw error;
    } finally {
      if (this.waitAbortController === controller) this.waitAbortController = null;
    }
  }
}

const defaultServices: EvolutionServices = {
  migrate: migrateToLatest,
  databaseIsEmpty,
  seed: seedDatabase,
  collect: collectSources,
  cluster: clusterSignals,
  readiness: calculateFunnelMetrics,
  monitor: generateMonitorReport,
  strategy: generateEvolutionPlan,
  discover: (db) => discoverNewSources(db, { minSignals: 2, limit: 20 }),
  saveCandidates: saveDiscoveredSources,
  exportStatic: exportStaticSite,
  now: () => new Date(),
};

export function parseEvolutionArgs(
  args: string[],
  defaultReportDir = resolve("var/evolution-reports"),
): EvolutionCliOptions {
  let once = false;
  let intervalMs = 30 * 60_000;
  let maxIterations = 1;
  let reportDir = defaultReportDir;
  let saveCandidates = false;
  let exportStatic = false;
  let help = false;

  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (!argument) continue;
    const [flag, inlineValue] = splitArgument(argument);

    switch (flag) {
      case "--once":
        once = true;
        break;
      case "--save-candidates":
        saveCandidates = true;
        break;
      case "--export":
        exportStatic = true;
        break;
      case "--help":
      case "-h":
        help = true;
        break;
      case "--interval": {
        const [value, consumed] = argumentValue(args, index, inlineValue, flag);
        index += consumed;
        intervalMs = parseDuration(value);
        break;
      }
      case "--max-iterations": {
        const [value, consumed] = argumentValue(args, index, inlineValue, flag);
        index += consumed;
        const parsed = Number(value);
        if (!Number.isSafeInteger(parsed) || parsed < 1) {
          throw new Error("--max-iterations must be a positive integer");
        }
        maxIterations = parsed;
        break;
      }
      case "--report-dir": {
        const [value, consumed] = argumentValue(args, index, inlineValue, flag);
        index += consumed;
        reportDir = resolve(value);
        break;
      }
      default:
        throw new Error(`Unknown option: ${flag}`);
    }
  }

  // Safe by default: one iteration. --once always wins over loop settings.
  if (once) maxIterations = 1;
  return {
    once: once || maxIterations === 1,
    intervalMs,
    maxIterations,
    reportDir,
    saveCandidates,
    exportStatic,
    help,
  };
}

export async function initializeEvolution(
  db: EvolutionDatabase,
  config: AppConfig,
  overrides: EvolutionServiceOverrides = {},
): Promise<EvolutionInitialization> {
  const services = { ...defaultServices, ...overrides };
  await services.migrate(db, config);
  const empty = await services.databaseIsEmpty(db);
  if (empty) await services.seed(db);
  return {
    migrated: true,
    databaseWasEmpty: empty,
    seeded: empty,
    seedReason: empty ? "empty-database" : "existing-data",
  };
}

interface RunLoopInput {
  db: EvolutionDatabase;
  config: AppConfig;
  options: EvolutionCliOptions;
  stop?: EvolutionStopController;
  services?: EvolutionServiceOverrides;
  onReport?: (report: EvolutionIterationReport, path: string) => void | Promise<void>;
}

export async function runEvolutionLoop(input: RunLoopInput): Promise<EvolutionIterationReport[]> {
  const stop = input.stop ?? new EvolutionStopController();
  const services = { ...defaultServices, ...input.services };
  const initialization = await initializeEvolution(input.db, input.config, services);
  const reports: EvolutionIterationReport[] = [];

  for (let iteration = 1; iteration <= input.options.maxIterations; iteration++) {
    if (stop.requested) break;
    const willHaveAnotherIteration = iteration < input.options.maxIterations;
    const report = await runEvolutionIteration({
      db: input.db,
      config: input.config,
      options: input.options,
      initialization,
      iteration,
      willHaveAnotherIteration,
      stop,
      services,
    });
    reports.push(report.report);
    await input.onReport?.(report.report, report.path);

    if (stop.requested || !willHaveAnotherIteration) break;
    const completedWait = await stop.wait(input.options.intervalMs);
    if (!completedWait) break;
  }

  return reports;
}

interface RunIterationInput {
  db: EvolutionDatabase;
  config: AppConfig;
  options: EvolutionCliOptions;
  initialization: EvolutionInitialization;
  iteration: number;
  willHaveAnotherIteration: boolean;
  stop: EvolutionStopController;
  services?: EvolutionServiceOverrides;
}

export async function runEvolutionIteration(
  input: RunIterationInput,
): Promise<{ report: EvolutionIterationReport; path: string }> {
  const services = { ...defaultServices, ...input.services };
  const started = services.now();
  let phase = "starting";
  let collection: CollectionResult | null = null;
  let clustering: { created: number; attached: number; deferred?: number } | null = null;
  let discovery: EvolutionIterationReport["discovery"] = null;
  let funnel: FunnelMetrics | null = null;
  let monitor: MonitorReport | null = null;
  let strategy: EvolutionPlan | null = null;
  let staticExported = false;
  const stageErrors: EvolutionIterationReport["stageErrors"] = [];

  const checkpoint = async (
    nextPhase: string,
    status: EvolutionCheckpoint["status"] = "running",
  ) => {
    phase = nextPhase;
    await writeCheckpoint(input.options.reportDir, {
      schemaVersion: 1,
      iteration: input.iteration,
      phase,
      status,
      startedAt: started.toISOString(),
      updatedAt: services.now().toISOString(),
      stopRequested: input.stop.requested,
      stopReason: input.stop.reason,
      reportPath: null,
    });
  };

  const capture = async <T>(nextPhase: string, action: () => Promise<T>): Promise<T | null> => {
    await checkpoint(nextPhase);
    try {
      return await action();
    } catch (error) {
      stageErrors.push({ phase: nextPhase, message: errorMessage(error) });
      return null;
    }
  };

  await checkpoint("collecting");
  if (!input.stop.requested) {
    collection = await capture("collecting", () => services.collect(input.db, input.config));
  }

  // A stop request takes effect at the stage boundary. Read-only evaluation
  // still runs so the final checkpoint describes the actual database state.
  if (!input.stop.requested && stageErrors.length === 0) {
    clustering = await capture("clustering", () => services.cluster(input.db));
  }

  await checkpoint("evaluating");
  const [funnelResult, monitorResult] = await Promise.allSettled([
    services.readiness(input.db),
    services.monitor(input.db),
  ]);
  if (funnelResult.status === "fulfilled") funnel = funnelResult.value;
  else stageErrors.push({ phase: "readiness", message: errorMessage(funnelResult.reason) });
  if (monitorResult.status === "fulfilled") monitor = monitorResult.value;
  else stageErrors.push({ phase: "monitoring", message: errorMessage(monitorResult.reason) });

  if (monitor) {
    await checkpoint("planning");
    try {
      strategy = services.strategy(monitor);
    } catch (error) {
      stageErrors.push({ phase: "planning", message: errorMessage(error) });
    }
  }

  if (!input.stop.requested && stageErrors.length === 0) {
    const discoveryReport = await capture("discovering", () => services.discover(input.db));
    if (discoveryReport) {
      let saved = 0;
      if (input.options.saveCandidates && discoveryReport.candidates.length > 0) {
        const saveResult = await capture("saving-candidates", () =>
          services.saveCandidates(input.db, discoveryReport.candidates.slice(0, 10)),
        );
        saved = saveResult?.created ?? 0;
      }
      discovery = {
        candidates: discoveryReport.newCandidates,
        saved,
        persistenceEnabled: input.options.saveCandidates,
      };
    }
  }

  if (!input.stop.requested && stageErrors.length === 0 && input.options.exportStatic) {
    const exportResult = await capture("exporting", () =>
      services.exportStatic(input.db, input.config),
    );
    staticExported = exportResult !== null;
  }

  const finished = services.now();
  const status = determineStatus(input.stop, collection, funnel, monitor, stageErrors);
  const problems = buildProblems(collection, funnel, monitor, stageErrors, input.stop);
  const recommendedActions =
    strategy?.actions
      .filter((action) => action.priority === "now" || action.priority === "next")
      .slice(0, 5)
      .map((action) => action.title) ?? [];
  const scheduledAt =
    status !== "interrupted" && input.willHaveAnotherIteration
      ? new Date(finished.getTime() + input.options.intervalMs).toISOString()
      : null;

  const report: EvolutionIterationReport = {
    schemaVersion: 1,
    iteration: input.iteration,
    status,
    phase: "reported",
    startedAt: started.toISOString(),
    finishedAt: finished.toISOString(),
    durationMs: Math.max(0, finished.getTime() - started.getTime()),
    objective:
      "在不自动改变来源生命周期或发布事实的前提下，采集、收敛并评估 AI 行业情报，形成可复核的下一轮改进策略。",
    initialization: input.initialization,
    policies: {
      automaticSourceLifecycleChanges: false,
      automaticPublication: false,
      candidatePersistence: input.options.saveCandidates,
      staticExport: input.options.exportStatic,
    },
    problems,
    changes: {
      signalsCreated: collection?.created ?? 0,
      eventsCreated: clustering?.created ?? 0,
      signalsAttached: clustering?.attached ?? 0,
      signalsDeferred: clustering?.deferred ?? 0,
      candidatesSaved: discovery?.saved ?? 0,
      staticExported,
      capabilities: [
        "阶段检查点与原子化 JSON 报告",
        "采集与聚类漏斗评估",
        "来源候选只建议、默认不落库",
        "来源生命周期与事实发布保持人工决策",
      ],
    },
    collection,
    clustering,
    discovery,
    funnel,
    monitor,
    strategy,
    testBoundaries: [
      "报告记录管线结果，不等于证明事实语义正确或来源彼此独立。",
      "SIGINT/SIGTERM 在当前执行阶段结束后生效；不会强杀正在进行的单个 collector 请求。",
      "本轮不会自动激活、降级、隔离、退役来源，也不会自动发布事件。",
      "静态导出只反映数据库中已发布内容，且仅在显式传入 --export 时执行。",
    ],
    nextIteration: {
      willContinue: scheduledAt !== null,
      scheduledAt,
      recommendedActions,
    },
    stageErrors,
  };

  const path = await writeIterationReport(input.options.reportDir, report);
  await writeCheckpoint(input.options.reportDir, {
    schemaVersion: 1,
    iteration: input.iteration,
    phase: "reported",
    status,
    startedAt: started.toISOString(),
    updatedAt: services.now().toISOString(),
    stopRequested: input.stop.requested,
    stopReason: input.stop.reason,
    // Checkpoints can be committed as operational evidence. Never leak the
    // developer's absolute workspace path into that portable artifact.
    reportPath: basename(path),
  });
  return { report, path };
}

export async function databaseIsEmpty(db: EvolutionDatabase): Promise<boolean> {
  const counts = await Promise.all([
    countRows(db, "sources"),
    countRows(db, "source_runs"),
    countRows(db, "source_checks"),
    countRows(db, "source_discoveries"),
    countRows(db, "signals"),
    countRows(db, "events"),
    countRows(db, "jobs"),
    countRows(db, "settings"),
    countRows(db, "tracks"),
    countRows(db, "actors"),
    countRows(db, "model_resources"),
    countRows(db, "views"),
    countRows(db, "scout_insights"),
    countRows(db, "evaluation_runs"),
  ]);
  return counts.every((count) => count === 0);
}

export async function calculateFunnelMetrics(db: EvolutionDatabase): Promise<FunnelMetrics> {
  return generatePipelineFunnel(db);
}

export async function writeIterationReport(
  reportDir: string,
  report: EvolutionIterationReport,
): Promise<string> {
  await mkdir(reportDir, { recursive: true });
  const timestamp = report.startedAt.replaceAll(":", "-").replaceAll(".", "-");
  const filename = `iteration-${String(report.iteration).padStart(4, "0")}-${timestamp}.json`;
  const path = resolve(reportDir, filename);
  await atomicWriteJson(path, report);
  await atomicWriteJson(resolve(reportDir, "latest.json"), report);
  return path;
}

export async function writeCheckpoint(
  reportDir: string,
  checkpoint: EvolutionCheckpoint,
): Promise<void> {
  await mkdir(reportDir, { recursive: true });
  await atomicWriteJson(resolve(reportDir, "checkpoint.json"), checkpoint);
}

function buildProblems(
  collection: CollectionResult | null,
  funnel: FunnelMetrics | null,
  monitor: MonitorReport | null,
  stageErrors: EvolutionIterationReport["stageErrors"],
  stop: EvolutionStopController,
): string[] {
  const problems = stageErrors.map((error) => `${error.phase}: ${error.message}`);
  if (collection?.errors.length) problems.push(`采集出现 ${collection.errors.length} 个错误。`);
  if (funnel) {
    if (funnel.signals.backlog > 0) problems.push(`${funnel.signals.backlog} 条信号尚未聚类。`);
    if (funnel.events.placeholder > 0)
      problems.push(`${funnel.events.placeholder} 个事件仍含占位洞察。`);
    if (funnel.events.singleSource > 0)
      problems.push(`${funnel.events.singleSource} 个事件只有单来源证据。`);
    if (funnel.events.multiSource === 0 && funnel.events.total > 0) {
      problems.push("当前没有得到多来源交叉印证的事件。");
    }
  }
  const criticalGaps = monitor?.coverageGaps.filter((gap) => gap.severity === "critical") ?? [];
  if (criticalGaps.length > 0) {
    problems.push(`存在 ${criticalGaps.length} 个关键来源覆盖缺口。`);
  }
  if (stop.requested) problems.push(`收到 ${stop.reason ?? "stop"}，已在阶段边界安全停止。`);
  return [...new Set(problems)];
}

function determineStatus(
  stop: EvolutionStopController,
  collection: CollectionResult | null,
  funnel: FunnelMetrics | null,
  monitor: MonitorReport | null,
  errors: EvolutionIterationReport["stageErrors"],
): EvolutionIterationReport["status"] {
  if (stop.requested) return "interrupted";
  if (errors.length > 0 || !collection || !funnel || !monitor) return "failed";
  if (collection.errors.length > 0) return "partial";
  return "completed";
}

async function countRows(
  db: EvolutionDatabase,
  table:
    | "sources"
    | "source_runs"
    | "source_checks"
    | "source_discoveries"
    | "signals"
    | "events"
    | "jobs"
    | "settings"
    | "tracks"
    | "actors"
    | "model_resources"
    | "views"
    | "scout_insights"
    | "evaluation_runs",
): Promise<number> {
  const result = await db
    .selectFrom(table)
    .select(({ fn }) => fn.countAll().as("count"))
    .executeTakeFirstOrThrow();
  return Number(result.count);
}

async function atomicWriteJson(path: string, value: unknown): Promise<void> {
  const temporaryPath = `${path}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporaryPath, path);
}

function splitArgument(argument: string): [string, string | undefined] {
  const separator = argument.indexOf("=");
  if (separator === -1) return [argument, undefined];
  return [argument.slice(0, separator), argument.slice(separator + 1)];
}

function argumentValue(
  args: string[],
  index: number,
  inlineValue: string | undefined,
  flag: string,
): [string, number] {
  if (inlineValue) return [inlineValue, 0];
  const next = args[index + 1];
  if (!next || next.startsWith("-")) throw new Error(`${flag} requires a value`);
  return [next, 1];
}

function parseDuration(value: string): number {
  const match = /^(\d+(?:\.\d+)?)(ms|s|m|h)?$/i.exec(value.trim());
  if (!match) throw new Error("--interval must use ms, s, m, or h (for example: 30m)");
  const amount = Number(match[1]);
  const unit = match[2]?.toLowerCase() ?? "s";
  const multiplier = unit === "ms" ? 1 : unit === "s" ? 1_000 : unit === "m" ? 60_000 : 3_600_000;
  const duration = Math.round(amount * multiplier);
  if (!Number.isSafeInteger(duration) || duration < 100) {
    throw new Error("--interval must be at least 100ms");
  }
  return duration;
}

function abortableDelay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolveDelay, reject) => {
    const timer = setTimeout(resolveDelay, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new Error("wait aborted"));
      },
      { once: true },
    );
  });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function printHelp(): void {
  console.log(`Agent Pulse evolution runner

Usage:
  npm run evolve -- --once
  npm run evolve -- --max-iterations 4 --interval 30m

Options:
  --once                 Run exactly one iteration (safe default)
  --interval <duration>  Wait between iterations: 30s, 10m, 1h (default: 30m)
  --max-iterations <n>   Maximum iterations (default: 1)
  --report-dir <path>    Checkpoint/report directory
  --save-candidates      Persist discovered candidates as disabled drafts
  --export               Export the static site after a successful iteration
  -h, --help             Show this help

The runner never changes source lifecycle states or publishes events automatically.`);
}

async function main(): Promise<void> {
  const config = loadConfig();
  const options = parseEvolutionArgs(
    process.argv.slice(2),
    resolve(config.rootDir, "var/evolution-reports"),
  );
  if (options.help) {
    printHelp();
    return;
  }

  const db = createDatabase(config);
  const stop = new EvolutionStopController();
  const handleSignal = (signal: NodeJS.Signals) => {
    console.warn(`[evolve] Received ${signal}; stopping at the next stage boundary.`);
    stop.request(signal);
  };
  process.once("SIGINT", handleSignal);
  process.once("SIGTERM", handleSignal);

  try {
    const reports = await runEvolutionLoop({
      db,
      config,
      options,
      stop,
      onReport: (report, path) => {
        console.log(
          JSON.stringify(
            {
              iteration: report.iteration,
              status: report.status,
              signalsCreated: report.changes.signalsCreated,
              eventsCreated: report.changes.eventsCreated,
              candidatesSaved: report.changes.candidatesSaved,
              report: path,
            },
            null,
            2,
          ),
        );
      },
    });
    if (reports.some((report) => report.status === "failed")) process.exitCode = 1;
  } finally {
    process.off("SIGINT", handleSignal);
    process.off("SIGTERM", handleSignal);
    await db.destroy();
  }
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === currentFile) {
  main().catch((error) => {
    console.error("[evolve] Fatal:", errorMessage(error));
    process.exitCode = 1;
  });
}
