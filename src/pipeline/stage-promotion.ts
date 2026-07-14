import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import type { JsonModelClient, ModelUsage } from "../ai/deepseek.js";
import { industryNarratives } from "../catalog/history.js";
import type { EnrichedEvent, IndustryNarratives, TrackNarrative } from "./static-site/dto.js";

export const STAGE_PROMOTION_PATH = "data/narratives/stage-promotions.json";
export const STAGE_PROMOTION_MODEL = "deepseek-v4-pro";
export const STAGE_PROMOTION_ISSUE_REPOSITORY = "barretlee/agent-pulse";
const OPEN_STAGE_END = "9999-12-31";
const PLACEHOLDER = /待编辑|待补充|待确认|\bTBD\b|\bTODO\b|placeholder/i;
const TRUSTED_ROLES = new Set(["primary", "research", "policy"]);
const sourceRoleSchema = z.enum([
  "primary",
  "research",
  "expert",
  "media",
  "heat",
  "aggregator",
  "policy",
]);
const evidenceRoleSchema = z.enum(["primary", "supporting", "secondary", "amplification"]);
const boundedText = (minimum: number, maximum: number) =>
  z
    .string()
    .trim()
    .min(minimum)
    .max(maximum)
    .refine((value) => !/[\r\n]/.test(value), "single_line_text_required");
const httpsUrl = z
  .string()
  .url()
  .refine((value) => new URL(value).protocol === "https:", "https_url_required");

const narrativeStageSchema = z
  .object({
    start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end: z.literal(OPEN_STAGE_END),
    period: boundedText(4, 40),
    label: boundedText(4, 40),
    summary: boundedText(40, 500),
    interpretation: boundedText(50, 800),
    chinaPosition: boundedText(20, 500),
    nextSignal: boundedText(30, 500),
  })
  .strict();

const usedEvidenceSchema = z
  .object({
    eventSlug: z.string().trim().min(2).max(160),
    title: boundedText(3, 300),
    sourceSlug: z.string().trim().min(2).max(120),
    sourceName: boundedText(2, 160),
    sourceTier: z.number().int().min(1).max(4),
    sourceRole: sourceRoleSchema,
    evidenceRole: evidenceRoleSchema,
    url: httpsUrl,
    publishedAt: z.string().datetime(),
  })
  .strict();

export const stagePromotionCandidateSchema = z
  .object({
    id: z.string().regex(/^[a-f0-9]{16}$/),
    marker: z.string().regex(/^agent-pulse-stage-promotion:[a-f0-9]{16}$/),
    trackSlug: z.string().trim().min(2).max(100),
    trackName: boundedText(2, 100),
    anchorEventSlug: z.string().trim().min(2).max(160),
    anchorEventTitle: boundedText(3, 300),
    sourceEventSlugs: z.array(z.string().trim().min(2).max(160)).min(1).max(6),
    usedEvidence: z.array(usedEvidenceSchema).min(2).max(12),
    stage: narrativeStageSchema,
    trackNow: boundedText(40, 600),
    trackNext: boundedText(30, 500),
    impactStatement: boundedText(50, 800),
    previousStageGap: boundedText(50, 800),
    counterSignals: z.array(boundedText(20, 300)).min(1).max(4),
    confidence: z.number().int().min(95).max(100),
    model: z.literal(STAGE_PROMOTION_MODEL),
    inputHash: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();

const persistedPromotionSchema = stagePromotionCandidateSchema.extend({
  issueNumber: z.number().int().positive(),
  issueUrl: z.string().url(),
  createdAt: z.string().datetime(),
});

export const stagePromotionFileSchema = z
  .object({
    schemaVersion: z.literal(1),
    promotions: z.array(persistedPromotionSchema),
  })
  .strict();

const holdVerdictSchema = z
  .object({
    decision: z.literal("hold"),
    reason: boundedText(30, 800),
    counterSignals: z.array(boundedText(20, 300)).min(1).max(4),
  })
  .strict();

const promoteVerdictSchema = z
  .object({
    decision: z.literal("promote"),
    trackSlug: z.string().trim().min(2).max(100),
    sourceEventSlugs: z.array(z.string().trim().min(2).max(160)).min(1).max(6),
    usedEvidenceUrls: z.array(httpsUrl).min(2).max(12),
    stage: narrativeStageSchema,
    trackNow: boundedText(40, 600),
    trackNext: boundedText(30, 500),
    impactStatement: boundedText(50, 800),
    previousStageGap: boundedText(50, 800),
    counterSignals: z.array(boundedText(20, 300)).min(1).max(4),
    confidence: z.number().int().min(0).max(100),
  })
  .strict();

const verdictSchema = z.discriminatedUnion("decision", [holdVerdictSchema, promoteVerdictSchema]);

export interface PromotionSource {
  slug: string;
  name: string;
  tier: number;
  role: string;
}

export interface EligiblePromotionEvidence {
  eventSlug: string;
  title: string;
  sourceSlug: string;
  sourceName: string;
  sourceTier: number;
  sourceRole: string;
  evidenceRole: string;
  url: string;
  publishedAt: string;
}

export interface StagePromotionInput {
  track: TrackNarrative & { name?: string };
  anchor: EnrichedEvent;
  events: EnrichedEvent[];
  evidence: EligiblePromotionEvidence[];
  existingLabels: string[];
}

export type StagePromotionCandidate = z.infer<typeof stagePromotionCandidateSchema>;
export type StagePromotionFile = z.infer<typeof stagePromotionFileSchema>;
export type PersistedStagePromotion = z.infer<typeof persistedPromotionSchema>;

export interface StagePromotionReport {
  status: "no_candidate" | "held" | "candidate";
  model: string;
  anchorEventSlug: string | null;
  trackSlug: string | null;
  promotionId: string | null;
  inputHash: string | null;
  usage: ModelUsage;
}

export async function readStagePromotionFile(rootDir: string): Promise<StagePromotionFile> {
  const path = resolve(rootDir, STAGE_PROMOTION_PATH);
  return validateStagePromotionFile(JSON.parse(await readFile(path, "utf8")));
}

export function validateStagePromotionFile(value: unknown): StagePromotionFile {
  const file = stagePromotionFileSchema.parse(value);
  const ids = new Set<string>();
  const markers = new Set<string>();
  const anchors = new Set<string>();
  for (const promotion of file.promotions) {
    if (ids.has(promotion.id)) throw new Error("duplicate_stage_promotion_id");
    if (markers.has(promotion.marker)) throw new Error("duplicate_stage_promotion_marker");
    if (anchors.has(promotion.anchorEventSlug)) throw new Error("duplicate_stage_anchor_event");
    ids.add(promotion.id);
    markers.add(promotion.marker);
    anchors.add(promotion.anchorEventSlug);
    validateCandidateConsistency(promotion);
    validateIssueBacklink(promotion.issueNumber, promotion.issueUrl);
    assertNoPlaceholder(promotion);
  }
  return file;
}

export function selectStagePromotionCandidate(
  events: EnrichedEvent[],
  sources: PromotionSource[],
  narratives: IndustryNarratives,
  promotions: StagePromotionFile,
  referenceAt = new Date().toISOString(),
): StagePromotionInput | null {
  const referenceTime = Date.parse(referenceAt);
  if (!Number.isFinite(referenceTime)) throw new Error("invalid_stage_reference_time");
  const sourceByName = new Map(sources.map((source) => [source.name, source]));
  const promotedAnchors = new Set(promotions.promotions.map((item) => item.anchorEventSlug));
  const tracks = new Map(narratives.tracks.map((track) => [track.slug, track]));
  const eligible: StagePromotionInput[] = [];

  for (const event of events) {
    if (promotedAnchors.has(event.slug)) continue;
    if (event.confidenceScore < 92 || event.impactScore < 98 || event.valueScore < 85) continue;
    const happenedTime = Date.parse(event.happenedAt);
    const ageDays = (referenceTime - happenedTime) / 86_400_000;
    if (!Number.isFinite(ageDays) || ageDays < 0 || ageDays > 14) continue;
    const milestoneTracks = event.tracks.filter((track) => track.role === "milestone");
    for (const eventTrack of milestoneTracks) {
      const track = tracks.get(eventTrack.slug);
      if (!track) continue;
      const currentStage = track.stages.at(-1);
      if (!currentStage || currentStage.end !== OPEN_STAGE_END) continue;
      if (daysBetween(currentStage.start, dayOf(event.happenedAt)) < 45) continue;
      const evidence = eligibleEvidence(event, sourceByName);
      if (!hasIndependentStageEvidence(evidence)) continue;
      const related = events
        .filter(
          (item) =>
            Math.abs(Date.parse(item.happenedAt) - happenedTime) <= 30 * 86_400_000 &&
            item.tracks.some((candidateTrack) => candidateTrack.slug === track.slug),
        )
        .sort(eventPriority)
        .slice(0, 6);
      if (!related.some((item) => item.slug === event.slug)) related.unshift(event);
      eligible.push({
        track: { ...track, name: eventTrack.name },
        anchor: event,
        events: related.slice(0, 6),
        evidence: uniqueEvidence(
          related.flatMap((item) => eligibleEvidence(item, sourceByName)),
        ).slice(0, 12),
        existingLabels: track.stages.map((stage) => stage.label),
      });
    }
  }

  return eligible.sort((left, right) => eventPriority(left.anchor, right.anchor))[0] ?? null;
}

export async function evaluateStagePromotion(
  client: JsonModelClient,
  input: StagePromotionInput,
): Promise<{ report: StagePromotionReport; candidate: StagePromotionCandidate | null }> {
  const prompt = stagePromotionPrompt(input);
  const inputHash = createHash("sha256").update(prompt).digest("hex");
  const completion = await client.completeJson({
    system: STAGE_PROMOTION_SYSTEM_PROMPT,
    user: prompt,
    maxTokens: 3_200,
    thinking: true,
    reasoningEffort: "high",
    temperature: 0,
  });
  if (completion.model !== STAGE_PROMOTION_MODEL) throw new Error("unexpected_stage_model");
  const verdict = verdictSchema.parse(completion.value);
  if (verdict.decision === "hold") {
    return {
      report: {
        status: "held",
        model: completion.model,
        anchorEventSlug: input.anchor.slug,
        trackSlug: input.track.slug,
        promotionId: null,
        inputHash,
        usage: completion.usage,
      },
      candidate: null,
    };
  }
  const candidate = validatePromoteVerdict(verdict, input, inputHash, completion.model);
  return {
    report: {
      status: "candidate",
      model: completion.model,
      anchorEventSlug: input.anchor.slug,
      trackSlug: input.track.slug,
      promotionId: candidate.id,
      inputHash,
      usage: completion.usage,
    },
    candidate,
  };
}

export function applyStagePromotion(
  fileValue: unknown,
  candidateValue: unknown,
  issue: { number: number; url: string },
  createdAt = new Date().toISOString(),
): { file: StagePromotionFile; changed: boolean; promotion: PersistedStagePromotion } {
  const file = validateStagePromotionFile(fileValue);
  const candidate = parseStagePromotionCandidate(candidateValue);
  validateIssueBacklink(issue.number, issue.url);
  const existing = file.promotions.find((item) => item.id === candidate.id);
  if (existing) return { file, changed: false, promotion: existing };
  const promotion = persistedPromotionSchema.parse({
    ...candidate,
    issueNumber: issue.number,
    issueUrl: issue.url,
    createdAt,
  });
  const next = validateStagePromotionFile({
    schemaVersion: 1,
    promotions: [...file.promotions, promotion],
  });
  return { file: next, changed: true, promotion };
}

export function mergeStagePromotions(
  base: IndustryNarratives,
  fileValue: unknown,
): IndustryNarratives {
  const file = validateStagePromotionFile(fileValue);
  const result = structuredClone(base) as IndustryNarratives;
  const grouped = new Map<string, PersistedStagePromotion[]>();
  for (const promotion of file.promotions) {
    const items = grouped.get(promotion.trackSlug) ?? [];
    items.push(promotion);
    grouped.set(promotion.trackSlug, items);
  }
  for (const [trackSlug, promotions] of grouped) {
    const track = result.tracks.find((item) => item.slug === trackSlug);
    if (!track) throw new Error("unknown_persisted_stage_track");
    for (const promotion of promotions.sort((a, b) => a.stage.start.localeCompare(b.stage.start))) {
      const previous = track.stages.at(-1);
      if (!previous || previous.end !== OPEN_STAGE_END) throw new Error("missing_open_stage");
      if (promotion.stage.start <= previous.start) throw new Error("non_monotonic_stage_promotion");
      if (daysBetween(previous.start, promotion.stage.start) < 45)
        throw new Error("stage_promotion_too_close");
      if (
        track.stages.some(
          (stage) => normalizeLabel(stage.label) === normalizeLabel(promotion.stage.label),
        )
      )
        throw new Error("duplicate_persisted_stage_label");
      previous.end = previousDay(promotion.stage.start);
      track.stages.push({ ...promotion.stage });
      track.now = promotion.trackNow;
      track.next = promotion.trackNext;
      if (promotion.stage.start > result.horizon.end) result.horizon.end = promotion.stage.start;
    }
  }
  return result;
}

export async function loadMergedIndustryNarratives(rootDir: string): Promise<IndustryNarratives> {
  const file = await readStagePromotionFile(rootDir);
  return mergeStagePromotions(
    structuredClone(industryNarratives) as unknown as IndustryNarratives,
    file,
  );
}

export function renderStagePromotionIssue(
  candidateValue: unknown,
  actionsUrl?: string,
): { title: string; body: string } {
  const candidate = parseStagePromotionCandidate(candidateValue);
  const actionsLink = actionsUrl ? validateActionsUrl(actionsUrl) : undefined;
  const evidenceRows = candidate.usedEvidence
    .map(
      (item) =>
        `| \`${escapeMarkdown(item.eventSlug)}\` | ${escapeMarkdown(item.title)} | ${escapeMarkdown(item.sourceName)} | ${item.publishedAt.slice(0, 10)} | [原始证据](<${markdownUrl(item.url)}>) |`,
    )
    .join("\n");
  const body = [
    `<!-- ${candidate.marker} -->`,
    `# ${escapeMarkdown(candidate.trackName)}：${escapeMarkdown(candidate.stage.label)}`,
    "",
    "> 这是通过高门槛自动审计后拟新增的趋势阶段，不是普通热点标签。只有版本化数据提交并完成部署后才正式生效；事实仍以原始 Evidence 和 Event 为准。",
    "",
    `- 阶段起点：${candidate.stage.start}`,
    `- 触发事件：${escapeMarkdown(candidate.anchorEventTitle)}（\`${candidate.anchorEventSlug}\`）`,
    `- 模型：\`${candidate.model}\`（thinking enabled / high effort）`,
    `- 晋级置信度：${candidate.confidence}/100`,
    "",
    "## 发生了什么",
    "",
    escapeMarkdown(candidate.stage.summary),
    "",
    "## 为什么需要新阶段",
    "",
    escapeMarkdown(candidate.previousStageGap),
    "",
    escapeMarkdown(candidate.stage.interpretation),
    "",
    "## 影响",
    "",
    escapeMarkdown(candidate.impactStatement),
    "",
    "## 中国位置",
    "",
    escapeMarkdown(candidate.stage.chinaPosition),
    "",
    "## 当前判断与下一验证",
    "",
    `- 当前判断：${escapeMarkdown(candidate.trackNow)}`,
    `- 下一验证：${escapeMarkdown(candidate.trackNext)}`,
    `- 阶段信号：${escapeMarkdown(candidate.stage.nextSignal)}`,
    "",
    "## 反向信号",
    "",
    ...candidate.counterSignals.map((item) => `- ${escapeMarkdown(item)}`),
    "",
    "## Evidence 与 Source",
    "",
    "| Event | Evidence | Source | Date | Link |",
    "| --- | --- | --- | --- | --- |",
    evidenceRows,
    "",
    "## 审计",
    "",
    `- Promotion ID：\`${candidate.id}\``,
    `- Input hash：\`${candidate.inputHash}\``,
    `- 关联 Event：${candidate.sourceEventSlugs.map((slug) => `\`${slug}\``).join("、")}`,
    ...(actionsLink ? [`- Actions：[查看本次运行](<${actionsLink}>)`] : []),
    "",
  ].join("\n");
  return {
    title: `[Stage] ${candidate.trackName} · ${candidate.stage.label}`,
    body,
  };
}

export function parseStagePromotionCandidate(value: unknown): StagePromotionCandidate {
  const candidate = stagePromotionCandidateSchema.parse(value);
  validateCandidateConsistency(candidate);
  return candidate;
}

function validatePromoteVerdict(
  verdict: z.infer<typeof promoteVerdictSchema>,
  input: StagePromotionInput,
  inputHash: string,
  model: string,
): StagePromotionCandidate {
  if (verdict.confidence < 95) throw new Error("stage_confidence_below_gate");
  if (verdict.trackSlug !== input.track.slug) throw new Error("unknown_stage_track");
  if (!verdict.sourceEventSlugs.includes(input.anchor.slug))
    throw new Error("missing_anchor_event");
  const eventSlugs = new Set(input.events.map((event) => event.slug));
  if (verdict.sourceEventSlugs.some((slug) => !eventSlugs.has(slug)))
    throw new Error("unknown_stage_event");
  if (verdict.stage.start !== dayOf(input.anchor.happenedAt))
    throw new Error("invalid_stage_start");
  if (
    input.existingLabels.some(
      (label) => normalizeLabel(label) === normalizeLabel(verdict.stage.label),
    )
  )
    throw new Error("duplicate_stage_label");
  const evidenceByUrl = new Map(input.evidence.map((item) => [item.url, item]));
  const used = verdict.usedEvidenceUrls.map((url) => {
    const evidence = evidenceByUrl.get(url);
    if (!evidence) throw new Error("unknown_stage_evidence_url");
    return evidence;
  });
  if (!hasIndependentStageEvidence(used)) throw new Error("insufficient_stage_evidence");
  if (used.some((item) => !verdict.sourceEventSlugs.includes(item.eventSlug)))
    throw new Error("stage_evidence_event_not_selected");
  assertNoPlaceholder(verdict);
  const id = createHash("sha256")
    .update(`${verdict.trackSlug}:${verdict.stage.start}:${input.anchor.slug}`)
    .digest("hex")
    .slice(0, 16);
  return parseStagePromotionCandidate({
    id,
    marker: `agent-pulse-stage-promotion:${id}`,
    trackSlug: verdict.trackSlug,
    trackName: input.track.name ?? input.track.slug,
    anchorEventSlug: input.anchor.slug,
    anchorEventTitle: input.anchor.title,
    sourceEventSlugs: [...new Set(verdict.sourceEventSlugs)],
    usedEvidence: used.map((item) => ({
      eventSlug: item.eventSlug,
      title: item.title,
      sourceSlug: item.sourceSlug,
      sourceName: item.sourceName,
      sourceTier: item.sourceTier,
      sourceRole: item.sourceRole,
      evidenceRole: item.evidenceRole,
      url: item.url,
      publishedAt: item.publishedAt,
    })),
    stage: verdict.stage,
    trackNow: verdict.trackNow,
    trackNext: verdict.trackNext,
    impactStatement: verdict.impactStatement,
    previousStageGap: verdict.previousStageGap,
    counterSignals: verdict.counterSignals,
    confidence: verdict.confidence,
    model,
    inputHash,
  });
}

function stagePromotionPrompt(input: StagePromotionInput): string {
  return JSON.stringify({
    task: "判断输入是否足以让一个长期 AI 行业趋势新增阶段。默认 hold；只有旧阶段已经无法解释现实且证据达到里程碑级别时才 promote。",
    rules: [
      "只能使用输入 Event 与 Evidence；不得使用外部记忆补造事实。",
      "普通产品更新、单次 benchmark、短期热度或同一路线渐进改进必须 hold。",
      "promote 必须解释旧阶段为何失效、决策影响、反向信号和下一验证。",
      "stage.start 必须等于 anchorEvent.happenedAt 的 UTC 日期，stage.end 必须为 9999-12-31。",
      "trackSlug、sourceEventSlugs、usedEvidenceUrls 只能从输入 allowlist 选择。",
      "返回严格 JSON，不要 Markdown。",
    ],
    output: {
      hold: ["decision", "reason", "counterSignals"],
      promote: [
        "decision",
        "trackSlug",
        "sourceEventSlugs",
        "usedEvidenceUrls",
        "stage",
        "trackNow",
        "trackNext",
        "impactStatement",
        "previousStageGap",
        "counterSignals",
        "confidence",
      ],
    },
    track: {
      slug: input.track.slug,
      thesis: input.track.thesis,
      now: input.track.now,
      next: input.track.next,
      currentStage: input.track.stages.at(-1),
      existingLabels: input.existingLabels,
    },
    anchorEvent: publicEventForPrompt(input.anchor),
    relatedEvents: input.events.map(publicEventForPrompt),
    evidence: input.evidence,
  });
}

const STAGE_PROMOTION_SYSTEM_PROMPT = [
  "你是 Agent Pulse 的首席趋势编辑，阶段变化是极低频操作。",
  "你的默认答案是 hold。只有重大事实使旧阶段失去解释力时才 promote。",
  "事实、推断和预测必须分开；不得把热度或模型判断包装成事实。",
  "只返回严格 JSON，不输出 reasoning、Markdown 或代码围栏。",
].join("\n");

function publicEventForPrompt(event: EnrichedEvent) {
  return {
    slug: event.slug,
    title: event.title,
    happenedAt: event.happenedAt,
    factSummary: event.factSummary,
    technicalInsight: event.technicalInsight,
    industryInsight: event.industryInsight,
    futureOutlook: event.futureOutlook,
    businessValue: event.businessValue,
    confidenceScore: event.confidenceScore,
    heatScore: event.heatScore,
    impactScore: event.impactScore,
    valueScore: event.valueScore,
  };
}

function eligibleEvidence(
  event: EnrichedEvent,
  sourceByName: Map<string, PromotionSource>,
): EligiblePromotionEvidence[] {
  return event.evidence.flatMap((evidence) => {
    const source = sourceByName.get(evidence.source);
    if (!source || source.role === "aggregator" || source.role === "heat") return [];
    return [
      {
        eventSlug: event.slug,
        title: evidence.title,
        sourceSlug: source.slug,
        sourceName: source.name,
        sourceTier: source.tier,
        sourceRole: source.role,
        evidenceRole: evidence.role,
        url: evidence.url,
        publishedAt: evidence.publishedAt,
      },
    ];
  });
}

function hasIndependentStageEvidence(evidence: EligiblePromotionEvidence[]): boolean {
  const sources = new Set(evidence.map((item) => item.sourceSlug));
  const names = new Set(evidence.map((item) => item.sourceName.toLowerCase()));
  const hosts = new Set(evidence.map((item) => safeHost(item.url)).filter(Boolean));
  const tierOne = evidence.some(
    (item) => item.sourceTier === 1 && TRUSTED_ROLES.has(item.sourceRole),
  );
  return evidence.length >= 2 && sources.size >= 2 && names.size >= 2 && hosts.size >= 2 && tierOne;
}

function uniqueEvidence(evidence: EligiblePromotionEvidence[]): EligiblePromotionEvidence[] {
  return [...new Map(evidence.map((item) => [item.url, item])).values()];
}

function eventPriority(left: EnrichedEvent, right: EnrichedEvent): number {
  return (
    right.impactScore - left.impactScore ||
    right.confidenceScore - left.confidenceScore ||
    right.valueScore - left.valueScore ||
    Date.parse(right.happenedAt) - Date.parse(left.happenedAt) ||
    left.slug.localeCompare(right.slug)
  );
}

function dayOf(value: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new Error("invalid_stage_event_date");
  return new Date(timestamp).toISOString().slice(0, 10);
}

function daysBetween(start: string, end: string): number {
  return (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000;
}

function previousDay(day: string): string {
  const timestamp = Date.parse(`${day}T00:00:00Z`);
  if (!Number.isFinite(timestamp)) throw new Error("invalid_stage_start");
  return new Date(timestamp - 86_400_000).toISOString().slice(0, 10);
}

function normalizeLabel(value: string): string {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

function safeHost(value: string): string {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function validateIssueBacklink(number: number, url: string): void {
  const parsed = new URL(url);
  if (
    parsed.protocol !== "https:" ||
    parsed.hostname !== "github.com" ||
    parsed.search ||
    parsed.hash
  )
    throw new Error("invalid_stage_issue_url");
  if (parsed.pathname !== `/${STAGE_PROMOTION_ISSUE_REPOSITORY}/issues/${number}`)
    throw new Error("stage_issue_number_mismatch");
}

function validateActionsUrl(value: string): string {
  const parsed = new URL(value);
  if (
    parsed.protocol !== "https:" ||
    parsed.hostname !== "github.com" ||
    parsed.search ||
    parsed.hash ||
    !new RegExp(`^/${STAGE_PROMOTION_ISSUE_REPOSITORY}/actions/runs/\\d+$`).test(parsed.pathname)
  )
    throw new Error("invalid_stage_actions_url");
  return markdownUrl(parsed.toString());
}

function validateCandidateConsistency(candidate: StagePromotionCandidate): void {
  const expectedId = createHash("sha256")
    .update(`${candidate.trackSlug}:${candidate.stage.start}:${candidate.anchorEventSlug}`)
    .digest("hex")
    .slice(0, 16);
  if (candidate.id !== expectedId) throw new Error("stage_promotion_id_mismatch");
  if (candidate.marker !== `agent-pulse-stage-promotion:${candidate.id}`)
    throw new Error("stage_marker_id_mismatch");
  if (new Set(candidate.sourceEventSlugs).size !== candidate.sourceEventSlugs.length)
    throw new Error("duplicate_stage_event");
  if (
    new Set(candidate.usedEvidence.map((item) => item.url)).size !== candidate.usedEvidence.length
  )
    throw new Error("duplicate_stage_evidence");
  if (!candidate.sourceEventSlugs.includes(candidate.anchorEventSlug))
    throw new Error("missing_anchor_event");
  if (candidate.usedEvidence.some((item) => !candidate.sourceEventSlugs.includes(item.eventSlug)))
    throw new Error("stage_evidence_event_not_selected");
  const sourceSlugs = new Set(candidate.usedEvidence.map((item) => item.sourceSlug));
  const sourceNames = new Set(candidate.usedEvidence.map((item) => item.sourceName.toLowerCase()));
  const hosts = new Set(candidate.usedEvidence.map((item) => safeHost(item.url)).filter(Boolean));
  const hasTierOne = candidate.usedEvidence.some(
    (item) => item.sourceTier === 1 && TRUSTED_ROLES.has(item.sourceRole),
  );
  const hasDiscoveryOnlySource = candidate.usedEvidence.some((item) =>
    ["aggregator", "heat"].includes(item.sourceRole),
  );
  if (
    sourceSlugs.size < 2 ||
    sourceNames.size < 2 ||
    hosts.size < 2 ||
    !hasTierOne ||
    hasDiscoveryOnlySource
  )
    throw new Error("insufficient_persisted_stage_evidence");
}

function assertNoPlaceholder(value: unknown): void {
  const text = JSON.stringify(value);
  if (PLACEHOLDER.test(text)) throw new Error("stage_placeholder_content");
}

function escapeMarkdown(value: string): string {
  return value.replace(/[\\`*_{}[\]()#+.!|>-]/g, "\\$&");
}

function markdownUrl(value: string): string {
  return value.replaceAll("<", "%3C").replaceAll(">", "%3E").replaceAll(" ", "%20");
}
