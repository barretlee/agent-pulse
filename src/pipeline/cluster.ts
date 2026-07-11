import { randomUUID } from "node:crypto";
import type { Kysely } from "kysely";
import { now, Repository } from "../db/repository.js";
import type { DatabaseSchema, EventRow } from "../db/types.js";
import { belongsToEvent, titleSimilarity, titleTokens } from "../domain/clustering.js";
import { scoreEvent } from "../domain/scoring.js";
import type { SignalMetrics } from "../domain/types.js";
import { slugify } from "../domain/url.js";

export async function clusterSignals(
  db: Kysely<DatabaseSchema>,
): Promise<{ created: number; attached: number }> {
  const repository = new Repository(db);
  const signals = await repository.listUnclusteredSignals();
  const events = await repository.listEvents();
  let created = 0;
  let attached = 0;

  for (const signal of signals) {
    let event = events.find((candidate) =>
      belongsToEvent(
        { title: signal.title, publishedAt: signal.published_at },
        { title: candidate.title, happenedAt: candidate.happened_at },
      ),
    );
    if (!event) {
      const timestamp = now();
      event = {
        id: randomUUID(),
        slug: uniqueSlug(signal.title, timestamp),
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
    } else {
      attached += 1;
    }
    await repository.attachSignal(
      event.id,
      signal.id,
      "supporting",
      Math.round(titleSimilarity(signal.title, event.title) * 100),
    );
    await rescore(repository, event);
  }
  return { created, attached };
}

async function rescore(repository: Repository, event: EventRow): Promise<void> {
  if (event.manual_override === 1) return;
  const context = await repository.eventScoringContext(event.id);
  const ageHours = Math.max(0, (Date.now() - new Date(event.happened_at).getTime()) / 3_600_000);
  const score = scoreEvent({
    authorityScores: context.map((item) => item.authorityScore),
    primaryEvidenceCount: context.filter((item) => item.tier === 1).length,
    independentSourceCount: new Set(context.map((item) => `${item.role}:${item.authorityScore}`))
      .size,
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
