import { createHash } from "node:crypto";
import type { Kysely } from "kysely";
import { z } from "zod";
import type { JsonModelClient, ModelUsage } from "../ai/deepseek.js";
import { now } from "../db/repository.js";
import type { DatabaseSchema, EventRow } from "../db/types.js";
import { evaluateEventReadiness, type ReadinessBlocker } from "./readiness.js";

const PLACEHOLDER = /待编辑|待补充|\bTBD\b|\bTODO\b|placeholder/i;
const HARD_BLOCKERS = new Set<ReadinessBlocker>([
  "event_not_found",
  "missing_evidence",
  "missing_primary_evidence",
  "low_confidence",
  "unsupported_heat",
]);

const enrichmentSchema = z
  .object({
    factSummary: z.string().trim().min(30).max(600),
    summary: z.string().trim().min(40).max(1_200),
    technicalInsight: z.string().trim().min(40).max(800),
    industryInsight: z.string().trim().min(36).max(800),
    futureOutlook: z.string().trim().min(28).max(600),
    businessValue: z.string().trim().min(36).max(800),
    company: z.string().trim().min(2).max(100),
    category: z.string().trim().min(2).max(80),
    keywords: z.array(z.string().trim().min(2).max(40)).min(3).max(8),
    trackSlugs: z.array(z.string().trim().min(2).max(100)).min(1).max(3),
    usedEvidenceUrls: z.array(z.string().url()).min(1).max(6),
  })
  .superRefine((value, context) => {
    for (const [key, text] of Object.entries(value)) {
      if (typeof text === "string" && PLACEHOLDER.test(text)) {
        context.addIssue({ code: "custom", path: [key], message: "placeholder content" });
      }
    }
    if (["industry", "unknown", "other", "其他", "未知"].includes(value.company.toLowerCase())) {
      context.addIssue({ code: "custom", path: ["company"], message: "generic company" });
    }
    if (value.category.toLowerCase() === "industry") {
      context.addIssue({ code: "custom", path: ["category"], message: "generic category" });
    }
  });

export type EventEnrichmentDraft = z.infer<typeof enrichmentSchema>;

interface EvidenceInput {
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
  source: string;
  tier: number;
  role: string;
}

interface TrackInput {
  id: string;
  slug: string;
  name: string;
  description: string;
}

interface Candidate {
  event: EventRow;
  evidence: EvidenceInput[];
  tracks: TrackInput[];
  blockers: ReadinessBlocker[];
}

export interface EnrichmentOptions {
  maxEvents?: number;
  dryRun?: boolean;
}

export interface EnrichmentFailure {
  eventId: string;
  code: string;
}

export interface EnrichmentReport {
  candidates: number;
  attempted: number;
  succeeded: number;
  readyAfter: number;
  blockedAfter: number;
  dryRun: boolean;
  inputHashes: string[];
  failures: EnrichmentFailure[];
  usage: ModelUsage;
}

export async function enrichReviewEvents(
  db: Kysely<DatabaseSchema>,
  client: JsonModelClient,
  options: EnrichmentOptions = {},
): Promise<EnrichmentReport> {
  const maxEvents = options.maxEvents ?? 8;
  const candidates = await loadCandidates(db, maxEvents);
  const report: EnrichmentReport = {
    candidates: candidates.length,
    attempted: 0,
    succeeded: 0,
    readyAfter: 0,
    blockedAfter: 0,
    dryRun: options.dryRun ?? false,
    inputHashes: [],
    failures: [],
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
  };

  for (const candidate of candidates) {
    report.attempted += 1;
    const prompt = candidatePrompt(candidate);
    report.inputHashes.push(createHash("sha256").update(prompt).digest("hex"));
    try {
      const completion = await client.completeJson({
        system: SYSTEM_PROMPT,
        user: prompt,
        maxTokens: 1_800,
      });
      addUsage(report.usage, completion.usage);
      const draft = validateDraft(completion.value, candidate);
      if (!report.dryRun) await applyDraft(db, candidate, draft);
      report.succeeded += 1;
      if (report.dryRun) continue;
      const readiness = await evaluateEventReadiness(db, candidate.event.id);
      if (readiness.status === "ready") report.readyAfter += 1;
      else report.blockedAfter += 1;
    } catch (error) {
      report.failures.push({ eventId: candidate.event.id, code: safeFailureCode(error) });
    }
  }
  return report;
}

async function loadCandidates(db: Kysely<DatabaseSchema>, maxEvents: number): Promise<Candidate[]> {
  const [events, tracks] = await Promise.all([
    db
      .selectFrom("events")
      .selectAll()
      .where("status", "=", "review")
      .where("manual_override", "=", 0)
      .orderBy("happened_at", "desc")
      .limit(Math.max(maxEvents * 8, maxEvents))
      .execute(),
    db
      .selectFrom("tracks")
      .select(["id", "slug", "name", "description"])
      .where("enabled", "=", 1)
      .orderBy("order_index")
      .execute(),
  ]);
  const candidates: Candidate[] = [];
  for (const event of events) {
    const readiness = await evaluateEventReadiness(db, event.id);
    if (readiness.blockers.some((blocker) => HARD_BLOCKERS.has(blocker))) continue;
    if (readiness.blockers.length === 0) continue;
    const evidence = await db
      .selectFrom("event_signals")
      .innerJoin("signals", "signals.id", "event_signals.signal_id")
      .innerJoin("sources", "sources.id", "signals.source_id")
      .select([
        "signals.title as title",
        "signals.summary as summary",
        "signals.canonical_url as url",
        "signals.published_at as publishedAt",
        "sources.name as source",
        "sources.tier as tier",
        "sources.role as role",
      ])
      .where("event_signals.event_id", "=", event.id)
      .where("sources.role", "!=", "aggregator")
      .where("sources.source_category", "!=", "aggregator")
      .orderBy("sources.tier")
      .orderBy("event_signals.relevance_score", "desc")
      .limit(6)
      .execute();
    if (!evidence.some((item) => item.tier === 1)) continue;
    candidates.push({ event, evidence, tracks, blockers: readiness.blockers });
    if (candidates.length >= maxEvents) break;
  }
  return candidates;
}

function candidatePrompt(candidate: Candidate): string {
  return JSON.stringify({
    task: "根据给定证据收敛一个可核验的 AI 行业 Event。只使用 evidence 中的信息。",
    rules: [
      "factSummary 与 summary 只能陈述证据直接支持的事实，不得补造数字、日期、融资额或产品能力。",
      "technicalInsight、industryInsight、futureOutlook、businessValue 是判断，使用克制措辞并给出可验证下一信号。",
      "不要输出 Markdown。只输出 JSON object。",
      "usedEvidenceUrls 必须是 evidence.url 的子集。",
      "trackSlugs 必须从 availableTracks.slug 中选择。",
      "category 使用具体英文 kebab-case，不得使用 industry。",
      "company 表示事件主体，必须使用标题或证据中明确出现的公司、实验室、模型、方法、项目或论文名；研究论文没有机构信息时使用论文明确命名的方法，不得使用 industry、unknown 或泛称。",
    ],
    outputKeys: [
      "factSummary",
      "summary",
      "technicalInsight",
      "industryInsight",
      "futureOutlook",
      "businessValue",
      "company",
      "category",
      "keywords",
      "trackSlugs",
      "usedEvidenceUrls",
    ],
    event: {
      id: candidate.event.id,
      title: candidate.event.title,
      happenedAt: candidate.event.happened_at,
      currentCompany: candidate.event.company,
      currentCategory: candidate.event.category,
      blockers: candidate.blockers,
    },
    evidence: candidate.evidence.map((item) => ({
      ...item,
      title: truncate(item.title, 300),
      summary: truncate(item.summary, 1_200),
    })),
    availableTracks: candidate.tracks.map((track) => ({
      slug: track.slug,
      name: track.name,
      description: truncate(track.description, 300),
    })),
  });
}

const SYSTEM_PROMPT = [
  "你是 Agent Pulse 的情报编辑器。",
  "事实、推断和建议必须分开；输入证据之外的知识不得作为事实写入。",
  "重大断言必须能回链到输入 URL。",
  "返回严格 JSON，字段完整，不要输出解释、Markdown 或代码围栏。",
].join("\n");

function validateDraft(value: unknown, candidate: Candidate): EventEnrichmentDraft {
  const draft = enrichmentSchema.parse(value);
  const evidenceUrls = new Set(candidate.evidence.map((item) => item.url));
  if (draft.usedEvidenceUrls.some((url) => !evidenceUrls.has(url))) {
    throw new Error("unknown_evidence_url");
  }
  const trackSlugs = new Set(candidate.tracks.map((track) => track.slug));
  if (draft.trackSlugs.some((slug) => !trackSlugs.has(slug))) {
    throw new Error("unknown_track_slug");
  }
  return draft;
}

async function applyDraft(
  db: Kysely<DatabaseSchema>,
  candidate: Candidate,
  draft: EventEnrichmentDraft,
): Promise<void> {
  const tracks = new Map(candidate.tracks.map((track) => [track.slug, track]));
  const timestamp = now();
  await db.transaction().execute(async (transaction) => {
    await transaction
      .updateTable("events")
      .set({
        fact_summary: draft.factSummary,
        summary: draft.summary,
        technical_insight: draft.technicalInsight,
        industry_insight: draft.industryInsight,
        future_outlook: draft.futureOutlook,
        business_value: draft.businessValue,
        company: draft.company,
        category: draft.category,
        keywords_json: JSON.stringify([...new Set(draft.keywords)]),
        updated_at: timestamp,
      })
      .where("id", "=", candidate.event.id)
      .where("status", "=", "review")
      .executeTakeFirstOrThrow();
    for (const [index, slug] of draft.trackSlugs.entries()) {
      const track = tracks.get(slug);
      if (!track) throw new Error("unknown_track_slug");
      await transaction
        .insertInto("event_tracks")
        .values({
          event_id: candidate.event.id,
          track_id: track.id,
          node_role: index === 0 ? "milestone" : "supporting",
          narrative: draft.industryInsight,
          stage: "current",
          order_index: index,
          created_at: timestamp,
        })
        .onConflict((conflict) => conflict.columns(["event_id", "track_id"]).doNothing())
        .execute();
    }
  });
}

function truncate(value: string, maximum: number): string {
  return value.length <= maximum ? value : `${value.slice(0, maximum - 1)}…`;
}

function addUsage(target: ModelUsage, value: ModelUsage): void {
  target.promptTokens += value.promptTokens;
  target.completionTokens += value.completionTokens;
  target.totalTokens += value.totalTokens;
}

function safeFailureCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string") {
    return error.code.slice(0, 80);
  }
  if (error instanceof z.ZodError) {
    const issue = error.issues[0];
    const path = issue?.path.join("_").replace(/[^a-zA-Z0-9_]/g, "_") || "root";
    return `invalid_enrichment_schema_${path}_${issue?.code ?? "unknown"}`.slice(0, 80);
  }
  if (error instanceof Error && /^[a-z0-9_]+$/i.test(error.message)) return error.message;
  return "enrichment_failed";
}
