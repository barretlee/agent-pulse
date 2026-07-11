import { randomUUID } from "node:crypto";
import type { Kysely } from "kysely";
import { capabilities, productVersion } from "../catalog/product.js";
import type { DatabaseSchema } from "../db/types.js";

export interface EvaluationDimension {
  slug: string;
  name: string;
  score: number;
  weight: number;
  status: "measured" | "insufficient_data";
  sampleSize: number;
  summary: string;
  evidence: Record<string, number | string>;
  nextAction: string;
}

export async function evaluateSystem(db: Kysely<DatabaseSchema>) {
  const startedAt = new Date().toISOString();
  const [allSources, runs, events, evidenceRows, scout, signalProvenance] = await Promise.all([
    db.selectFrom("sources").selectAll().execute(),
    db.selectFrom("source_runs").selectAll().orderBy("started_at", "desc").limit(500).execute(),
    db.selectFrom("events").selectAll().execute(),
    db
      .selectFrom("event_signals")
      .select(["event_id"])
      .select(({ fn }) => fn.count<number>("signal_id").as("count"))
      .groupBy("event_id")
      .execute(),
    db.selectFrom("scout_insights").selectAll().execute(),
    db
      .selectFrom("signals")
      .innerJoin("sources", "sources.id", "signals.source_id")
      .select(["signals.id", "sources.role"])
      .execute(),
  ]);
  const sources = allSources.filter((source) => source.lifecycle_status !== "retired");
  const published = events.filter((event) => event.status === "published");
  const activeSources = sources.filter((source) => source.lifecycle_status === "active");
  const successfulRuns = runs.filter((run) => ["succeeded", "not_modified"].includes(run.status));
  const averageEvidence = average(evidenceRows.map((row) => Number(row.count)));
  const categories = new Set(sources.map((source) => source.source_category));
  const cnSources = sources.filter((source) => source.region === "CN").length;
  const automated = sources.filter((source) =>
    ["rss", "api", "github", "arxiv"].includes(source.acquisition),
  );
  const verified = sources.filter((source) => source.last_verified_at).length;
  const sourceCoverageScore = clamp(
    (sources.length / 100) * 55 +
      (categories.size / 14) * 30 +
      balance(cnSources, sources.length) * 15,
  );
  const dimensions: EvaluationDimension[] = [
    {
      slug: "source-coverage",
      name: "来源覆盖",
      score: sourceCoverageScore,
      weight: 10,
      status: sources.length >= 100 && categories.size >= 10 ? "measured" : "insufficient_data",
      sampleSize: sources.length,
      summary: `${sources.length} 个来源，覆盖 ${categories.size} 类，其中中国来源 ${cnSources} 个。`,
      evidence: {
        total: sources.length,
        categories: categories.size,
        china: cnSources,
        automated: automated.length,
      },
      nextAction: "补齐地区/主题缺口，并将 candidate 通过 fixture 和 shadow run 晋级。",
    },
    {
      slug: "source-quality",
      name: "来源质量",
      score: clamp(
        average(sources.map((source) => source.quality_score)) * 0.72 +
          (verified / Math.max(1, sources.length)) * 28,
      ),
      weight: 10,
      status: verified >= 30 ? "measured" : "insufficient_data",
      sampleSize: verified,
      summary: `目录平均质量分 ${Math.round(average(sources.map((source) => source.quality_score)))}，已完成运行验证 ${verified} 个。`,
      evidence: {
        verified,
        tier1: sources.filter((source) => source.tier === 1).length,
        averageQuality: Math.round(average(sources.map((source) => source.quality_score))),
      },
      nextAction: "为所有 active/candidate 来源建立合同样例、原创回链率和人工抽检记录。",
    },
    {
      slug: "primary-source-provenance",
      name: "一手来源归属",
      score: signalProvenance.length
        ? clamp(
            (signalProvenance.filter((row) => row.role !== "aggregator").length /
              signalProvenance.length) *
              60 +
              (signalProvenance.filter((row) =>
                ["primary", "research", "policy"].includes(row.role),
              ).length /
                signalProvenance.length) *
                40,
          )
        : 0,
      weight: 10,
      status: signalProvenance.length >= 20 ? "measured" : "insufficient_data",
      sampleSize: signalProvenance.length,
      summary: `${signalProvenance.length} 条事实信号中，${signalProvenance.filter((row) => row.role === "aggregator").length} 条仍归属于聚合器；聚合器只应产生发现记录。`,
      evidence: {
        signals: signalProvenance.length,
        direct: signalProvenance.filter((row) => row.role !== "aggregator").length,
        primary: signalProvenance.filter((row) =>
          ["primary", "research", "policy"].includes(row.role),
        ).length,
        aggregatorDebt: signalProvenance.filter((row) => row.role === "aggregator").length,
      },
      nextAction: "将聚合发现匹配到原始发布者；无法回源的候选不得进入事实 Timeline。",
    },
    {
      slug: "source-reliability",
      name: "采集稳定性",
      score: runs.length
        ? clamp(
            (successfulRuns.length / runs.length) * 70 +
              average(activeSources.map((source) => source.health_score)) * 0.3,
          )
        : 0,
      weight: 12,
      status: runs.length >= 20 ? "measured" : "insufficient_data",
      sampleSize: runs.length,
      summary: runs.length
        ? `最近 ${runs.length} 次来源运行成功率 ${Math.round((successfulRuns.length / runs.length) * 100)}%。`
        : "尚无足够 SourceRun，不能声称采集稳定。",
      evidence: {
        runs: runs.length,
        successful: successfulRuns.length,
        activeSources: activeSources.length,
      },
      nextAction: "持续运行 7 天并建立成功率、P95 延迟、异常空结果和漂移 SLO。",
    },
    {
      slug: "confidence",
      name: "事实置信度",
      score: clamp(
        average(published.map((event) => event.confidence_score)) * 0.65 +
          Math.min(35, averageEvidence * 17.5),
      ),
      weight: 12,
      status: published.length >= 20 && averageEvidence >= 1.8 ? "measured" : "insufficient_data",
      sampleSize: published.length,
      summary: `${published.length} 个公开事件，平均每事件 ${averageEvidence.toFixed(1)} 条证据；当前样例不足以完成真实校准。`,
      evidence: {
        published: published.length,
        averageEvidence: Number(averageEvidence.toFixed(2)),
        averageConfidence: Math.round(average(published.map((event) => event.confidence_score))),
      },
      nextAction: "建立 claim 级证据覆盖、独立来源身份和事实错误人工标注集。",
    },
    {
      slug: "value",
      name: "认知与决策价值",
      score: clamp(
        average(published.map((event) => event.value_score)) * 0.55 +
          filledInsightRatio(published) * 45,
      ),
      weight: 12,
      status:
        published.length >= 30 && published.some((event) => event.manual_override === 0)
          ? "measured"
          : "insufficient_data",
      sampleSize: published.length,
      summary: `当前公开内容的洞察字段完整率 ${Math.round(filledInsightRatio(published) * 100)}%，但大部分是人工样例。`,
      evidence: {
        published: published.length,
        fieldCompleteness: Math.round(filledInsightRatio(published) * 100),
        averageValue: Math.round(average(published.map((event) => event.value_score))),
      },
      nextAction: "引入读后决策帮助度、保存/引用、Scout 行动和产物完成率反馈。",
    },
    {
      slug: "realtime",
      name: "实时处理能力",
      score: runs.length
        ? clamp(
            100 -
              percentile(
                runs.map((run) => run.duration_ms),
                0.95,
              ) /
                1_000,
          )
        : 0,
      weight: 8,
      status: runs.length >= 30 ? "measured" : "insufficient_data",
      sampleSize: runs.length,
      summary: runs.length
        ? `来源运行 P95 ${Math.round(
            percentile(
              runs.map((run) => run.duration_ms),
              0.95,
            ),
          )}ms。`
        : "没有足够运行样本衡量实时处理。",
      evidence: {
        runs: runs.length,
        p95DurationMs: Math.round(
          percentile(
            runs.map((run) => run.duration_ms),
            0.95,
          ),
        ),
      },
      nextAction: "补 scheduler、队列等待时间和从上游发布到 Signal/Event 的端到端延迟。",
    },
    {
      slug: "timeliness",
      name: "内容时效性",
      score: clamp(
        freshnessScore(published.map((event) => event.happened_at)) * 0.6 +
          freshnessScore(
            activeSources.map((source) => source.last_success_at).filter(Boolean) as string[],
          ) *
            0.4,
      ),
      weight: 10,
      status:
        activeSources.filter((source) => source.last_success_at).length >=
        Math.max(3, activeSources.length * 0.8)
          ? "measured"
          : "insufficient_data",
      sampleSize: published.length,
      summary: `衡量事件新鲜度与 active 来源最近成功时间；未运行来源会显著拉低可信度。`,
      evidence: {
        published: published.length,
        activeSources: activeSources.length,
        activeWithSuccess: activeSources.filter((source) => source.last_success_at).length,
      },
      nextAction: "按 source cadence 计算 freshness lag，并对过期公开内容显示数据水位。",
    },
    {
      slug: "effectiveness",
      name: "机会与行动效果",
      score: scout.length
        ? clamp(
            (scout.filter((idea) => ["accepted", "published"].includes(idea.status)).length /
              scout.length) *
              100,
          )
        : 0,
      weight: 8,
      status: scout.length >= 20 ? "measured" : "insufficient_data",
      sampleSize: scout.length,
      summary: `${scout.length} 条星探卡片；需要真实接受、行动与产物结果才能评价命中率。`,
      evidence: {
        ideas: scout.length,
        acceptedOrPublished: scout.filter((idea) => ["accepted", "published"].includes(idea.status))
          .length,
        dismissed: scout.filter((idea) => idea.status === "dismissed").length,
      },
      nextAction: "增加 save/act/complete 反馈和 30 日结果复盘，按 opportunity type 校准。",
    },
    {
      slug: "governance",
      name: "安全与治理",
      score: clamp(
        (sources.filter((source) => source.lifecycle_status).length / Math.max(1, sources.length)) *
          45 +
          (sources.filter((source) => source.license_note).length / Math.max(1, sources.length)) *
            35 +
          (sources.filter(
            (source) => source.maintenance_status === "restricted" && source.enabled === 0,
          ).length === sources.filter((source) => source.maintenance_status === "restricted").length
            ? 20
            : 0),
      ),
      weight: 8,
      status: "measured",
      sampleSize: sources.length,
      summary: "检查生命周期、许可边界、受限来源默认关闭与发布门禁。",
      evidence: {
        lifecycleCoverage: sources.filter((source) => source.lifecycle_status).length,
        licenseCoverage: sources.filter((source) => source.license_note).length,
        restrictedEnabled: sources.filter(
          (source) => source.maintenance_status === "restricted" && source.enabled === 1,
        ).length,
      },
      nextAction: "增加 audit log、策略版本、release snapshot hash 与回滚证据。",
    },
  ];
  const measuredWeight = dimensions
    .filter((dimension) => dimension.status === "measured")
    .reduce((sum, dimension) => sum + dimension.weight, 0);
  const weighted = dimensions
    .filter((dimension) => dimension.status === "measured")
    .reduce((sum, dimension) => sum + dimension.score * dimension.weight, 0);
  const totalWeight = dimensions.reduce((sum, dimension) => sum + dimension.weight, 0);
  const evidenceCoverage = measuredWeight / Math.max(1, totalWeight);
  const overallScore = measuredWeight
    ? Math.round((weighted / measuredWeight) * evidenceCoverage)
    : 0;
  const status =
    dimensions.filter((dimension) => dimension.status === "measured").length >= 6
      ? "measured"
      : "partial";
  const id = randomUUID();
  const finishedAt = new Date().toISOString();
  await db
    .insertInto("evaluation_runs")
    .values({
      id,
      release_version: productVersion,
      status,
      overall_score: overallScore,
      dimensions_json: JSON.stringify(dimensions),
      capability_snapshot_json: JSON.stringify(capabilities),
      notes: `${dimensions.filter((dimension) => dimension.status === "insufficient_data").length} dimensions lack sufficient evidence; overall score includes a ${Math.round(evidenceCoverage * 100)}% evidence-coverage factor`,
      started_at: startedAt,
      finished_at: finishedAt,
    })
    .execute();
  return {
    id,
    releaseVersion: productVersion,
    status,
    overallScore,
    dimensions,
    capabilities,
    startedAt,
    finishedAt,
  };
}

export async function latestEvaluation(db: Kysely<DatabaseSchema>) {
  const row = await db
    .selectFrom("evaluation_runs")
    .selectAll()
    .orderBy("finished_at", "desc")
    .executeTakeFirst();
  if (!row) return null;
  return {
    id: row.id,
    releaseVersion: row.release_version,
    status: row.status,
    overallScore: row.overall_score,
    dimensions: JSON.parse(row.dimensions_json) as EvaluationDimension[],
    capabilities: JSON.parse(row.capability_snapshot_json) as typeof capabilities,
    notes: row.notes,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
  };
}

function average(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}
function clamp(value: number): number {
  return Math.round(Math.max(0, Math.min(100, value)));
}
function balance(china: number, total: number): number {
  if (!total) return 0;
  const ratio = china / total;
  return Math.max(0, 1 - Math.abs(0.35 - ratio) / 0.35);
}
function percentile(values: number[], point: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * point))] ?? 0;
}
function freshnessScore(values: string[]): number {
  if (!values.length) return 0;
  const day = 86_400_000;
  return average(
    values.map((value) => Math.max(0, 100 - ((Date.now() - Date.parse(value)) / day) * 4)),
  );
}
function filledInsightRatio(
  events: Array<{
    technical_insight: string;
    industry_insight: string;
    future_outlook: string;
    business_value: string;
  }>,
): number {
  if (!events.length) return 0;
  const filled = events
    .flatMap((event) => [
      event.technical_insight,
      event.industry_insight,
      event.future_outlook,
      event.business_value,
    ])
    .filter((value) => value.trim().length >= 20 && !value.includes("待编辑")).length;
  return filled / (events.length * 4);
}
