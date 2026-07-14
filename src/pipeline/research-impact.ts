import { readFile } from "node:fs/promises";
import type { PublicEvent } from "../domain/types.js";

export const RESEARCH_IMPACT_POLICY_VERSION = "2026-07-14.v1";
export const RESEARCH_MONTH_LIMIT = 6;
export const RESEARCH_REPORT_MAX_AGE_DAYS = 14;

export type ResearchImpactRoute =
  | "established-field-impact"
  | "accelerating-field-impact"
  | "peer-recognition"
  | "industry-adoption"
  | "watch"
  | "rejected";

export interface ResearchImpactAssessment {
  eventSlug: string;
  arxivId: string;
  paperTitle: string;
  openAlexId: string | null;
  citedByCount: number;
  recentCitations: number;
  titleMatchScore: number;
  topicRelevant: boolean;
  publicationDate: string;
  publicationDateDeltaDays: number | null;
  qualified: boolean;
  route: ResearchImpactRoute;
  reasons: string[];
  evidenceUrls: string[];
}

export interface ResearchImpactOverride {
  route: "peer-recognition" | "industry-adoption";
  reason: string;
  evidenceUrls: string[];
}

export interface ResearchImpactReport {
  schemaVersion: 1;
  policyVersion: string;
  generatedAt: string;
  source: {
    name: "OpenAlex";
    url: string;
  };
  assessments: ResearchImpactAssessment[];
}

export interface OpenAlexWorkMetrics {
  id: string;
  doi: string | null;
  title: string;
  publicationDate: string;
  citedByCount: number;
  recentCitations: number;
}

export function extractArxivId(value: string): string | null {
  const match = value.match(
    /(?:arxiv\.org\/(?:abs|pdf)\/|10\.48550\/arxiv\.)(\d{4}\.\d{4,5})(?:v\d+)?/i,
  );
  return match?.[1] ?? null;
}

export function arxivIdForEvent(event: Pick<PublicEvent, "evidence">): string | null {
  for (const evidence of event.evidence) {
    const id = extractArxivId(evidence.url);
    if (id) return id;
  }
  return null;
}

export function titleMatchScore(left: string, right: string): number {
  const leftTokens = titleTokens(left);
  const rightTokens = titleTokens(right);
  if (!leftTokens.size || !rightTokens.size) return 0;
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  return Number((intersection / Math.min(leftTokens.size, rightTokens.size)).toFixed(3));
}

export function assessResearchImpact(
  event: Pick<
    PublicEvent,
    "slug" | "title" | "summary" | "technicalInsight" | "keywords" | "happenedAt" | "evidence"
  >,
  work: OpenAlexWorkMetrics | null,
  referenceAt = new Date().toISOString(),
  override?: ResearchImpactOverride,
): ResearchImpactAssessment {
  const arxivId = arxivIdForEvent(event) ?? "";
  if (!arxivId || !work) {
    return {
      eventSlug: event.slug,
      arxivId,
      paperTitle: work?.title ?? event.title,
      openAlexId: work?.id ?? null,
      citedByCount: work?.citedByCount ?? 0,
      recentCitations: work?.recentCitations ?? 0,
      titleMatchScore: 0,
      topicRelevant: false,
      publicationDate: work?.publicationDate ?? "",
      publicationDateDeltaDays: null,
      qualified: false,
      route: "rejected",
      reasons: [arxivId ? "openalex_work_missing" : "paper_identity_missing"],
      evidenceUrls: arxivId ? [arxivUrl(arxivId)] : [],
    };
  }

  const identityScore = titleMatchScore(event.title, work.title);
  const ageDays = Math.max(
    0,
    Math.floor((Date.parse(referenceAt) - Date.parse(work.publicationDate)) / 86_400_000),
  );
  const publicationDateDeltaDays = Math.floor(
    Math.abs(Date.parse(event.happenedAt) - Date.parse(work.publicationDate)) / 86_400_000,
  );
  const identityMatches = identityScore >= 0.65;
  const topicRelevant = researchTopicRelevant(event);
  const publicationDateMatches =
    Number.isFinite(publicationDateDeltaDays) && publicationDateDeltaDays <= 180;
  const established = ageDays >= 365 && work.citedByCount >= 200;
  const accelerating = ageDays >= 120 && work.citedByCount >= 50 && work.recentCitations >= 80;
  const qualified =
    identityMatches &&
    topicRelevant &&
    publicationDateMatches &&
    (!!override || established || accelerating);
  const route: ResearchImpactRoute = !identityMatches
    ? "rejected"
    : !topicRelevant
      ? "rejected"
      : !publicationDateMatches
        ? "rejected"
        : override
          ? override.route
          : established
            ? "established-field-impact"
            : accelerating
              ? "accelerating-field-impact"
              : "watch";
  const reasons = [
    `title_match=${identityScore}`,
    `citations=${work.citedByCount}`,
    `recent_citations=${work.recentCitations}`,
    `age_days=${ageDays}`,
    `publication_date_delta_days=${publicationDateDeltaDays}`,
  ];
  if (!identityMatches) reasons.push("paper_title_identity_mismatch");
  else if (!topicRelevant) reasons.push("outside_core_ai_research_scope");
  else if (!publicationDateMatches) reasons.push("paper_publication_date_mismatch");
  else if (override) reasons.push(override.reason);
  else if (!qualified) reasons.push("impact_threshold_not_met");

  return {
    eventSlug: event.slug,
    arxivId,
    paperTitle: work.title,
    openAlexId: work.id,
    citedByCount: work.citedByCount,
    recentCitations: work.recentCitations,
    titleMatchScore: identityScore,
    topicRelevant,
    publicationDate: work.publicationDate,
    publicationDateDeltaDays,
    qualified,
    route,
    reasons,
    evidenceUrls: [...new Set([arxivUrl(arxivId), work.id, ...(override?.evidenceUrls ?? [])])],
  };
}

export function researchTopicRelevant(
  event: Pick<PublicEvent, "title" | "summary" | "technicalInsight" | "keywords">,
): boolean {
  const content = [event.title, event.summary, event.technicalInsight, ...event.keywords]
    .join(" ")
    .normalize("NFKC")
    .toLowerCase();
  return CORE_AI_RESEARCH.test(content);
}

export async function loadResearchImpactReport(path: string): Promise<ResearchImpactReport | null> {
  try {
    const value = JSON.parse(await readFile(path, "utf8")) as Partial<ResearchImpactReport>;
    if (
      value.schemaVersion !== 1 ||
      value.policyVersion !== RESEARCH_IMPACT_POLICY_VERSION ||
      !value.generatedAt ||
      !Array.isArray(value.assessments)
    ) {
      return null;
    }
    return value as ResearchImpactReport;
  } catch {
    return null;
  }
}

export function researchImpactAssessmentForEvent(
  event: Pick<PublicEvent, "slug" | "evidence">,
  report: ResearchImpactReport | null,
  referenceAt = new Date().toISOString(),
): ResearchImpactAssessment | null {
  if (!report || reportIsStale(report, referenceAt)) return null;
  const arxivId = arxivIdForEvent(event);
  return (
    report.assessments.find(
      (assessment) =>
        assessment.eventSlug === event.slug || (!!arxivId && assessment.arxivId === arxivId),
    ) ?? null
  );
}

export function reportIsStale(
  report: ResearchImpactReport,
  referenceAt = new Date().toISOString(),
): boolean {
  const age = Date.parse(referenceAt) - Date.parse(report.generatedAt);
  return !Number.isFinite(age) || age < 0 || age > RESEARCH_REPORT_MAX_AGE_DAYS * 86_400_000;
}

function arxivUrl(id: string): string {
  return `https://arxiv.org/abs/${id}`;
}

function titleTokens(value: string): Set<string> {
  const normalized = value
    .split("：", 1)[0]
    ?.normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return new Set(
    String(normalized || "")
      .split(/\s+/)
      .filter((token) => token.length >= 2 && !TITLE_STOP_WORDS.has(token)),
  );
}

const TITLE_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "for",
  "in",
  "of",
  "on",
  "the",
  "to",
  "via",
  "with",
]);

const CORE_AI_RESEARCH =
  /\b(ai|llms?|bert|transformer|benchmark|agent|robot|robotics|alignment|reasoning)\b|artificial intelligence|language model|foundation model|machine learning|deep learning|neural network|multimodal|vision-language|diffusion model|speech recognition|object detection|image segmentation|reinforcement learning|state space model|retrieval-augmented|genomic foundation|protein design|materials model|大语言模型|大模型|机器学习|深度学习|神经网络|多模态|视觉语言|扩散模型|语音识别|目标检测|图像分割|强化学习|状态空间模型|检索增强|智能体|机器人|评测基准/i;
