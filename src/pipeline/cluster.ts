import { randomUUID } from "node:crypto";
import type { Kysely } from "kysely";
import { now, parseJson, Repository } from "../db/repository.js";
import type { DatabaseSchema, EventRow, SignalRow, SourceRow } from "../db/types.js";
import {
  belongsToEvent,
  eventFingerprint,
  titleSimilarity,
  titleTokens,
} from "../domain/clustering.js";
import { scoreEvent } from "../domain/scoring.js";
import type { SignalMetrics } from "../domain/types.js";
import { slugify } from "../domain/url.js";

export async function clusterSignals(
  db: Kysely<DatabaseSchema>,
): Promise<{ created: number; attached: number; deferred: number }> {
  const repository = new Repository(db);
  const [signals, sources] = await Promise.all([
    repository.listUnclusteredSignals(),
    repository.listSources(),
  ]);
  const sourcesById = new Map(sources.map((source) => [source.id, source]));
  signals.sort(
    (left, right) =>
      eventabilityScore(right, sourcesById.get(right.source_id)) -
        eventabilityScore(left, sourcesById.get(left.source_id)) ||
      right.published_at.localeCompare(left.published_at),
  );
  const events = await repository.listEvents();
  let created = 0;
  let attached = 0;
  let deferred = 0;

  for (const signal of signals) {
    // Skip signals with empty or whitespace-only titles — they produce unusable events.
    if (!signal.title?.trim()) continue;
    const source = sourcesById.get(signal.source_id);
    if (source?.lifecycle_status === "shadow") {
      await repository.deferSignal(
        signal.id,
        "shadow_observation",
        eventabilityScore(signal, source),
        {
          sourceSlug: source.slug,
          latestLifecycle: source.lifecycle_status,
          releaseCondition: "source_activation_after_20_healthy_checks_and_7_days",
        },
      );
      deferred += 1;
      continue;
    }
    let eventCreated = false;
    let event = events.find((candidate) =>
      belongsToEvent(
        { title: signal.title, publishedAt: signal.published_at },
        { title: candidate.title, happenedAt: candidate.happened_at },
      ),
    );
    if (!event) {
      const score = eventabilityScore(signal, source);
      if (score < 70) {
        await repository.deferSignal(signal.id, "insufficient_eventability", score, {
          sourceSlug: source?.slug ?? null,
          sourceTier: source?.tier ?? null,
          sourceRole: source?.role ?? null,
          sourceCategory: source?.source_category ?? null,
        });
        deferred += 1;
        continue;
      }
      const timestamp = now();
      const baseSlug = uniqueSlug(signal.title, timestamp);
      // Prevent duplicate slugs by appending a short random suffix when needed.
      const existing = events.find((candidate) => candidate.slug === baseSlug);
      const slug = existing ? `${baseSlug}-${randomUUID().slice(0, 6)}` : baseSlug;
      event = {
        id: randomUUID(),
        slug,
        title: signal.title,
        fact_summary: signal.summary || signal.title,
        summary: signal.summary || signal.title,
        technical_insight: "待编辑：这项变化对能力、成本或工程路线意味着什么？",
        industry_insight: "待编辑：这项变化会如何影响竞争结构与产业分工？",
        future_outlook: "待编辑：接下来要观察哪些可验证信号？",
        business_value: "待编辑：CEO、投资负责人或业务负责人应采取什么动作？",
        category: signal.category,
        company: inferCompany(signal.title),
        keywords_json: JSON.stringify([...titleTokens(signal.title)].slice(0, 8)),
        confidence_score: 0,
        heat_score: 0,
        impact_score: 55,
        value_score: 0,
        score_factors_json: "{}",
        status: "review",
        featured: 0,
        manual_override: 0,
        happened_at: signal.published_at,
        published_at: null,
        created_at: timestamp,
        updated_at: timestamp,
      } satisfies EventRow;
      await repository.insertEvent(event);
      events.push(event);
      created += 1;
      eventCreated = true;
    } else {
      attached += 1;
    }
    await repository.attachSignal(
      event.id,
      signal.id,
      "supporting",
      Math.round(titleSimilarity(signal.title, event.title) * 100),
    );
    if (eventCreated) {
      const candidates = await repository.listDeferredSignalsNear(event.happened_at);
      for (const candidate of candidates) {
        if (
          !belongsToEvent(
            { title: candidate.title, publishedAt: candidate.published_at },
            { title: event.title, happenedAt: event.happened_at },
          )
        )
          continue;
        await repository.attachSignal(
          event.id,
          candidate.id,
          "supporting",
          Math.round(titleSimilarity(candidate.title, event.title) * 100),
        );
        await repository.clearSignalTriage(candidate.id);
        attached += 1;
      }
    }
    await rescoreEvent(repository, event);
  }
  return { created, attached, deferred };
}

export function eventabilityScore(signal: SignalRow, source?: SourceRow): number {
  if (!source || source.role === "aggregator" || source.source_category === "aggregator") return 0;
  let score = source.tier === 1 ? 25 : source.tier === 2 ? 10 : 0;
  if (source.role === "primary" || source.role === "policy") score += 20;
  else if (source.role === "research") score += 10;
  if (
    [
      "frontier-lab",
      "china-lab",
      "company",
      "open-source",
      "agent-devtool",
      "policy",
      "infra-chip-cloud",
    ].includes(source.source_category)
  )
    score += 15;
  if (
    /\breleas(?:e|ed|es|ing)|\blaunch(?:es|ed|ing)?|\bannounc(?:e|ed|es|ing)|\bintroduc(?:e|ed|es|ing)|\bavailable\b|availability|general(?:ly)? available|\bpreview(?:ing|ed)?\b|\badds?\b|now supports?|support for|open[- ]source|funding|acqui(?:re|red|sition)|regulation|policy|发布|推出|上线|可用|预览|新增|支持|开源|融资|并购|收购|监管|政策/i.test(
      signal.title,
    )
  )
    score += 20;
  if (eventFingerprint(signal.title)) score += 20;
  const quality = parseJson<{ quality?: { score?: number } }>(signal.raw_meta_json, {}).quality
    ?.score;
  if (typeof quality === "number" && quality >= 70) score += 10;
  return Math.min(100, score);
}

export async function rescoreEvent(repository: Repository, event: EventRow): Promise<void> {
  if (event.manual_override === 1) return;
  const context = await repository.eventScoringContext(event.id);
  const ageHours = Math.max(0, (Date.now() - new Date(event.happened_at).getTime()) / 3_600_000);
  const score = scoreEvent({
    authorityScores: context.map((item) => item.authorityScore),
    primaryEvidenceCount: context.filter(
      (item) =>
        item.tier === 1 && item.role !== "aggregator" && item.sourceCategory !== "aggregator",
    ).length,
    independentSourceCount: new Set(context.map((item) => item.sourceId)).size,
    metrics: context.map((item) => item.metrics as SignalMetrics),
    ageHours,
    impactHint: event.impact_score,
  });
  await repository.updateEvent(event.id, {
    confidence_score: score.confidence,
    heat_score: score.heat,
    impact_score: score.impact,
    value_score: score.value,
    score_factors_json: JSON.stringify(score.factors),
  });
}

function uniqueSlug(title: string, timestamp: string): string {
  return `${slugify(title)}-${timestamp.slice(0, 10)}`.slice(0, 250);
}

function inferCompany(title: string): string {
  const companies = [
    "OpenAI",
    "Anthropic",
    "Google",
    "Meta",
    "Microsoft",
    "Apple",
    "DeepSeek",
    "Qwen",
    "Kimi",
    "MiniMax",
    "智谱",
    "阿里",
    "腾讯",
    "字节",
  ];
  return (
    companies.find((company) => title.toLowerCase().includes(company.toLowerCase())) ?? "industry"
  );
}
