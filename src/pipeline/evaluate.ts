import { randomUUID } from "node:crypto";
import type { Kysely } from "kysely";
import { capabilities, productVersion } from "../catalog/product.js";
import type { DatabaseSchema } from "../db/types.js";
import { eventReadinessSummary } from "./readiness.js";

export interface EvaluationDimension {
  slug: string;
  name: string;
  score: number;
  rawScore: number;
  scoreCap: number;
  weight: number;
  status: "measured" | "insufficient_data";
  sampleSize: number;
  sampleTarget: number;
  summary: string;
  evidence: Record<string, number | string>;
  penalties: string[];
  nextAction: string;
}

interface DimensionInput {
  slug: string;
  name: string;
  rawScore: number;
  weight: number;
  sufficient: boolean;
  sampleSize: number;
  sampleTarget: number;
  summary: string;
  evidence: Record<string, number | string>;
  penalties?: string[];
  nextAction: string;
  insufficientCap?: number;
  measuredCap?: number;
}

export function calibrateDimension(input: DimensionInput): EvaluationDimension {
  const status = input.sufficient ? "measured" : "insufficient_data";
  const scoreCap = input.sufficient
    ? (input.measuredCap ?? 100)
    : Math.min(45, input.insufficientCap ?? 45);
  return {
    slug: input.slug,
    name: input.name,
    score: Math.min(clamp(input.rawScore), scoreCap),
    rawScore: clamp(input.rawScore),
    scoreCap,
    weight: input.weight,
    status,
    sampleSize: input.sampleSize,
    sampleTarget: input.sampleTarget,
    summary: input.summary,
    evidence: input.evidence,
    penalties: input.penalties ?? [],
    nextAction: input.nextAction,
  };
}

export function calculateOverallScore(dimensions: EvaluationDimension[]) {
  const totalWeight = dimensions.reduce((sum, dimension) => sum + dimension.weight, 0);
  if (!totalWeight) return { overallScore: 0, rawWeightedScore: 0, evidenceCoverage: 0 };
  const weightedScore = dimensions.reduce(
    (sum, dimension) => sum + dimension.score * dimension.weight,
    0,
  );
  const measuredWeight = dimensions
    .filter((dimension) => dimension.status === "measured")
    .reduce((sum, dimension) => sum + dimension.weight, 0);
  const evidenceCoverage = measuredWeight / totalWeight;
  const rawWeightedScore = weightedScore / totalWeight;
  // A scorecard with mostly uncalibrated dimensions must not look production-ready.
  // The 0.65 floor preserves directional progress while the remaining 0.35 requires
  // sufficient samples. Insufficient dimensions are already capped at <= 45.
  const confidenceFactor = 0.65 + evidenceCoverage * 0.35;
  return {
    overallScore: Math.round(rawWeightedScore * confidenceFactor),
    rawWeightedScore: Math.round(rawWeightedScore),
    evidenceCoverage: Math.round(evidenceCoverage * 100),
  };
}

export async function evaluateSystem(db: Kysely<DatabaseSchema>) {
  const startedAt = new Date().toISOString();
  const [allSources, runs, checks, events, eventEvidence, scout, signalProvenance, readiness] =
    await Promise.all([
      db.selectFrom("sources").selectAll().execute(),
      db.selectFrom("source_runs").selectAll().orderBy("started_at", "desc").limit(2_000).execute(),
      db
        .selectFrom("source_checks")
        .selectAll()
        .orderBy("finished_at", "desc")
        .limit(5_000)
        .execute(),
      db.selectFrom("events").selectAll().execute(),
      db
        .selectFrom("event_signals")
        .innerJoin("signals", "signals.id", "event_signals.signal_id")
        .innerJoin("sources", "sources.id", "signals.source_id")
        .select([
          "event_signals.event_id as eventId",
          "signals.source_id as sourceId",
          "sources.tier as tier",
          "sources.role as role",
          "sources.source_category as sourceCategory",
        ])
        .execute(),
      db.selectFrom("scout_insights").selectAll().execute(),
      db
        .selectFrom("signals")
        .innerJoin("sources", "sources.id", "signals.source_id")
        .select(["signals.id", "sources.role", "sources.source_category as sourceCategory"])
        .execute(),
      eventReadinessSummary(db),
    ]);

  const sources = allSources.filter((source) => source.lifecycle_status !== "retired");
  const sourcesById = new Map(sources.map((source) => [source.id, source]));
  const latestChecks = latestBySource(checks);
  const latestRuns = latestBySource(runs);
  const checkedSources = [...latestChecks.values()].filter((check) =>
    sourcesById.has(check.source_id),
  );
  const healthyChecks = checkedSources.filter((check) => check.status === "healthy");
  const degradedChecks = checkedSources.filter((check) => check.status === "degraded");
  const failedChecks = checkedSources.filter((check) => check.status === "failed");
  const skippedChecks = checkedSources.filter((check) => check.status === "skipped");
  const healthySourceIds = new Set(healthyChecks.map((check) => check.source_id));
  const healthySources = sources.filter((source) => healthySourceIds.has(source.id));
  const activeSources = sources.filter((source) => source.lifecycle_status === "active");
  const activeHealthy = activeSources.filter((source) => healthySourceIds.has(source.id));
  const observingHealthy = sources.filter(
    (source) => source.observation_enabled === 1 && healthySourceIds.has(source.id),
  );
  const checkCoverage = ratio(checkedSources.length, sources.length);
  const auditWindows = new Set(checks.map((check) => check.finished_at.slice(0, 10))).size;
  const healthyCategories = new Set(healthySources.map((source) => source.source_category));
  const healthyCn = healthySources.filter((source) => source.region === "CN").length;
  const checkedQuality = healthyChecks.concat(degradedChecks);
  const schemaPass = checkedQuality.filter((check) => check.schema_status === "valid").length;
  const latestRunRows = [...latestRuns.values()].filter((run) => sourcesById.has(run.source_id));
  const successfulLatestRuns = latestRunRows.filter((run) =>
    ["succeeded", "not_modified"].includes(run.status),
  );

  const published = events.filter((event) => event.status === "published");
  const evidenceByEvent = groupEvidence(eventEvidence);
  const publishedEvidence = published.map((event) => evidenceByEvent.get(event.id) ?? []);
  const averageEvidence = average(publishedEvidence.map((rows) => rows.length));
  const publishedWithPrimary = publishedEvidence.filter((rows) =>
    rows.some(
      (row) => row.tier === 1 && row.role !== "aggregator" && row.sourceCategory !== "aggregator",
    ),
  ).length;
  const publishedMultiSource = publishedEvidence.filter(
    (rows) => new Set(rows.map((row) => row.sourceId)).size >= 2,
  ).length;
  const readyIds = new Set(
    readiness.items.filter((item) => item.status === "ready").map((item) => item.eventId),
  );
  const readyPublished = published.filter((event) => readyIds.has(event.id)).length;
  const linkedSignals = new Set(eventEvidence.flatMap((row) => row.sourceId)).size;
  const directSignals = signalProvenance.filter(
    (row) => row.role !== "aggregator" && row.sourceCategory !== "aggregator",
  ).length;
  const primarySignals = signalProvenance.filter((row) =>
    ["primary", "research", "policy"].includes(row.role),
  ).length;

  const freshHealthy = healthyChecks.filter(
    (check) => check.freshness_hours !== null && check.freshness_hours <= 24 * 7,
  ).length;
  const recentPublished = published.filter(
    (event) => Date.now() - Date.parse(event.happened_at) <= 30 * 86_400_000,
  ).length;
  const activeWithRecentSuccess = activeSources.filter(
    (source) =>
      source.last_success_at && Date.now() - Date.parse(source.last_success_at) <= 7 * 86_400_000,
  ).length;
  const feedbackSamples = 0; // Editorial status is not a user outcome signal.

  const dimensions = [
    calibrateDimension({
      slug: "source-coverage",
      name: "有效来源覆盖",
      rawScore:
        ratio(healthyChecks.length, 100) * 35 +
        ratio(observingHealthy.length, 100) * 20 +
        ratio(activeHealthy.length, 100) * 30 +
        ratio(healthyCategories.size, 12) * 5 +
        ratio(healthyCn, 30) * 5 +
        checkCoverage * 5,
      weight: 10,
      sufficient: activeHealthy.length >= 100 && auditWindows >= 7,
      sampleSize: activeHealthy.length,
      sampleTarget: 100,
      insufficientCap: Math.round(
        25 + ratio(observingHealthy.length, 100) * 15 + ratio(activeHealthy.length, 100) * 5,
      ),
      summary: `${sources.length} 个目录源中 ${healthyChecks.length} 个单轮健康、${observingHealthy.length} 个处于隔离观察，只有 ${activeHealthy.length} 个既 active 且健康；E2/E3 不等同生产覆盖。`,
      evidence: {
        catalog: sources.length,
        checked: checkedSources.length,
        healthy: healthyChecks.length,
        degraded: degradedChecks.length,
        failed: failedChecks.length,
        skipped: skippedChecks.length,
        active: activeSources.length,
        activeHealthy: activeHealthy.length,
        observingHealthy: observingHealthy.length,
        healthyCategories: healthyCategories.size,
        healthyChina: healthyCn,
      },
      penalties: [
        ...(activeHealthy.length < 100 ? ["active 且健康的生产来源不足 100"] : []),
        ...(auditWindows < 7 ? ["生产覆盖尚未经历 7 个自然日验证"] : []),
      ],
      nextAction: "让 E3 来源完成 20 次健康检查和 7 天观察，再经人工确认逐批晋级 E4。",
    }),
    calibrateDimension({
      slug: "source-quality",
      name: "来源内容质量",
      rawScore:
        average(checkedQuality.map((check) => check.quality_score)) * 0.55 +
        ratio(schemaPass, checkedQuality.length) * 25 +
        (1 - average(checkedQuality.map((check) => check.duplicate_ratio_bps / 10_000))) * 20,
      weight: 10,
      sufficient: healthyChecks.length >= 100 && auditWindows >= 7,
      sampleSize: checkedQuality.length,
      sampleTarget: 100,
      insufficientCap: 45,
      summary: `${checkedQuality.length} 个可用/部分可用来源参与真实抓取质量计算；目录预填 quality_score 不再计分。`,
      evidence: {
        usableChecks: checkedQuality.length,
        healthy: healthyChecks.length,
        auditWindows,
        averageObservedQuality: Math.round(
          average(checkedQuality.map((check) => check.quality_score)),
        ),
        schemaValid: schemaPass,
      },
      penalties: [
        ...(healthyChecks.length < 100 ? ["健康样本不足 100"] : []),
        ...(auditWindows < 7 ? ["连续观测不足 7 个自然日"] : []),
      ],
      nextAction: "连续 7 天抽检 100+ 健康源，补原创率、正文完整度和人工准确率标签。",
    }),
    calibrateDimension({
      slug: "primary-source-provenance",
      name: "一手来源归属",
      rawScore:
        ratio(directSignals, signalProvenance.length) * 25 +
        ratio(primarySignals, signalProvenance.length) * 45 +
        ratio(eventEvidence.length, signalProvenance.length) * 30,
      weight: 10,
      sufficient: signalProvenance.length >= 100 && eventEvidence.length >= 100,
      sampleSize: signalProvenance.length,
      sampleTarget: 100,
      summary: `${signalProvenance.length} 条信号中 ${primarySignals} 条来自 primary/research/policy，${eventEvidence.length} 条证据进入事件。`,
      evidence: {
        signals: signalProvenance.length,
        direct: directSignals,
        primary: primarySignals,
        linkedEvidence: eventEvidence.length,
        linkedSourceCount: linkedSignals,
        aggregatorDebt: signalProvenance.length - directSignals,
      },
      penalties: eventEvidence.length < 100 ? ["进入事件的证据样本不足 100"] : [],
      nextAction: "提升一手信号占比和 Signal→Event 证据绑定率，并核验媒体集团独立性。",
    }),
    calibrateDimension({
      slug: "source-reliability",
      name: "采集稳定性",
      rawScore:
        ratio(healthyChecks.length, checkedSources.length) * 45 +
        ratio(healthyChecks.length + degradedChecks.length, checkedSources.length) * 20 +
        ratio(activeHealthy.length, activeSources.length) * 20 +
        ratio(successfulLatestRuns.length, latestRunRows.length) * 15,
      weight: 12,
      sufficient: healthyChecks.length >= 100 && auditWindows >= 7,
      sampleSize: checkedSources.length,
      sampleTarget: 100,
      insufficientCap: 45,
      summary: `按每个来源最新一次检查/运行去重：${healthyChecks.length}/${checkedSources.length} 健康，不再让单一来源的重复成功运行抬高分数。`,
      evidence: {
        checked: checkedSources.length,
        healthy: healthyChecks.length,
        degraded: degradedChecks.length,
        failed: failedChecks.length,
        skipped: skippedChecks.length,
        latestRuns: latestRunRows.length,
        latestRunSuccess: successfulLatestRuns.length,
        auditWindows,
      },
      penalties: [
        ...(auditWindows < 7 ? ["稳定性观察窗不足 7 天"] : []),
        ...(healthyChecks.length < 100 ? ["健康来源不足 100"] : []),
      ],
      nextAction: "连续运行 7 天，按来源计算成功率、异常空结果、P95 延迟和恢复时间。",
    }),
    calibrateDimension({
      slug: "confidence",
      name: "事实置信度",
      rawScore:
        ratio(publishedWithPrimary, published.length) * 30 +
        ratio(publishedMultiSource, published.length) * 40 +
        ratio(readyPublished, published.length) * 20 +
        ratio(average(published.map((event) => event.confidence_score)), 100) * 10,
      weight: 12,
      sufficient: publishedMultiSource >= 20 && readyPublished >= 30,
      sampleSize: published.length,
      sampleTarget: 30,
      insufficientCap: 42,
      summary: `${published.length} 个公开事件仅 ${publishedMultiSource} 个拥有多源证据，${readyPublished} 个通过当前就绪门禁；人工置信分只占 10%。`,
      evidence: {
        published: published.length,
        primaryEvidence: publishedWithPrimary,
        multiSource: publishedMultiSource,
        readyPublished,
        averageEvidence: Number(averageEvidence.toFixed(2)),
        averageSelfReportedConfidence: Math.round(
          average(published.map((event) => event.confidence_score)),
        ),
      },
      penalties: publishedMultiSource < 20 ? ["多源公开事件不足 20，分数上限 42"] : [],
      nextAction: "优先把核心事件补成独立多源证据，并建立 claim 级事实错误标注集。",
    }),
    calibrateDimension({
      slug: "value",
      name: "认知与决策价值",
      rawScore:
        filledInsightRatio(published) * 30 +
        ratio(readyPublished, published.length) * 30 +
        ratio(publishedMultiSource, published.length) * 20 +
        ratio(feedbackSamples, 30) * 20,
      weight: 12,
      sufficient: feedbackSamples >= 30,
      sampleSize: feedbackSamples,
      sampleTarget: 30,
      insufficientCap: 35,
      summary: `洞察字段完整不等于有价值；当前没有读者保存、引用、决策帮助度或付费反馈样本。`,
      evidence: {
        published: published.length,
        fieldCompleteness: Math.round(filledInsightRatio(published) * 100),
        readyPublished,
        multiSource: publishedMultiSource,
        outcomeFeedback: feedbackSamples,
      },
      penalties: ["缺少真实用户结果反馈，分数上限 35"],
      nextAction: "采集至少 30 条读后帮助度、保存/引用、行动与付费意愿反馈。",
    }),
    calibrateDimension({
      slug: "realtime",
      name: "端到端实时性",
      rawScore:
        ratio(successfulLatestRuns.length, latestRunRows.length) * 35 +
        ratio(activeWithRecentSuccess, activeSources.length) * 35 +
        ratio(freshHealthy, healthyChecks.length) * 30,
      weight: 8,
      sufficient: false,
      sampleSize: latestRunRows.length,
      sampleTarget: 100,
      insufficientCap: 30,
      summary:
        "collector 耗时不是上游发布到页面可见的端到端延迟；当前缺少 scheduler queue 和发布延迟时间戳。",
      evidence: {
        latestSourceRuns: latestRunRows.length,
        latestRunSuccess: successfulLatestRuns.length,
        freshHealthySources: freshHealthy,
        activeWithRecentSuccess,
        endToEndLatencySamples: 0,
      },
      penalties: ["无端到端延迟样本，分数上限 30"],
      nextAction: "记录 upstream published→Signal→Event→Pages 四段延迟并建立 P50/P95 SLO。",
    }),
    calibrateDimension({
      slug: "timeliness",
      name: "内容时效性",
      rawScore:
        ratio(freshHealthy, healthyChecks.length) * 45 +
        ratio(activeWithRecentSuccess, activeSources.length) * 30 +
        ratio(recentPublished, Math.max(30, published.length)) * 25,
      weight: 10,
      sufficient: healthyChecks.length >= 100 && published.length >= 30,
      sampleSize: healthyChecks.length,
      sampleTarget: 100,
      insufficientCap: 45,
      summary: `${freshHealthy}/${healthyChecks.length} 个健康来源在 7 天窗口内有新内容，最近 30 天公开事件 ${recentPublished} 个。`,
      evidence: {
        healthy: healthyChecks.length,
        freshHealthy,
        active: activeSources.length,
        activeWithRecentSuccess,
        published: published.length,
        recentPublished,
      },
      penalties: healthyChecks.length < 100 ? ["健康来源时效样本不足 100"] : [],
      nextAction: "按 cadence 衡量来源 freshness lag，并补齐从事件发生到页面发布的延迟。",
    }),
    calibrateDimension({
      slug: "effectiveness",
      name: "机会与行动效果",
      rawScore: ratio(feedbackSamples, 30) * 70 + ratio(scout.length, 30) * 30,
      weight: 8,
      sufficient: feedbackSamples >= 30,
      sampleSize: feedbackSamples,
      sampleTarget: 30,
      insufficientCap: 20,
      summary: `${scout.length} 条星探卡片的编辑状态不是用户行动结果，当前真实行动/产物复盘样本为 0。`,
      evidence: {
        ideas: scout.length,
        editorialAccepted: scout.filter((idea) => ["accepted", "published"].includes(idea.status))
          .length,
        outcomeFeedback: feedbackSamples,
        completedArtifacts: 0,
      },
      penalties: ["无 30 日行动结果样本，分数上限 20"],
      nextAction: "增加 save/act/complete 反馈，30 日后按机会类型复盘真实产物和收益。",
    }),
    calibrateDimension({
      slug: "governance",
      name: "安全与治理",
      rawScore:
        ratio(checkedSources.length, sources.length) * 25 +
        ratio(sources.filter((source) => source.license_note).length, sources.length) * 20 +
        (sources.some(
          (source) => source.maintenance_status === "restricted" && source.enabled === 1,
        )
          ? 0
          : 20) +
        ratio(readiness.ready, readiness.total) * 20 +
        ratio(healthyChecks.length, 100) * 15,
      weight: 8,
      sufficient: false,
      sampleSize: checkedSources.length,
      sampleTarget: sources.length,
      insufficientCap: 45,
      summary:
        "字段存在只证明策略已声明，不证明策略有效；当前缺少策略版本回放、发布回滚演练和审计抽检。",
      evidence: {
        sources: sources.length,
        checked: checkedSources.length,
        licenseDeclared: sources.filter((source) => source.license_note).length,
        restrictedEnabled: sources.filter(
          (source) => source.maintenance_status === "restricted" && source.enabled === 1,
        ).length,
        readyEvents: readiness.ready,
        totalEvents: readiness.total,
        rollbackDrills: 0,
      },
      penalties: ["无策略回放和回滚演练证据，分数上限 45"],
      nextAction: "增加 audit log、策略版本、release snapshot hash 与定期回滚演练。",
    }),
  ];

  const { overallScore, rawWeightedScore, evidenceCoverage } = calculateOverallScore(dimensions);
  const status =
    dimensions.filter((dimension) => dimension.status === "measured").length >= 8
      ? "measured"
      : "partial";
  const id = randomUUID();
  const finishedAt = new Date().toISOString();
  const insufficientCount = dimensions.filter(
    (dimension) => dimension.status === "insufficient_data",
  ).length;
  const notes = `${insufficientCount} dimensions lack sufficient evidence; calibrated weighted score ${rawWeightedScore}, evidence coverage ${evidenceCoverage}%, final score ${overallScore}`;
  await db
    .insertInto("evaluation_runs")
    .values({
      id,
      release_version: productVersion,
      status,
      overall_score: overallScore,
      dimensions_json: JSON.stringify(dimensions),
      capability_snapshot_json: JSON.stringify(capabilities),
      notes,
      started_at: startedAt,
      finished_at: finishedAt,
    })
    .execute();
  return {
    id,
    releaseVersion: productVersion,
    status,
    overallScore,
    rawWeightedScore,
    evidenceCoverage,
    dimensions,
    capabilities,
    notes,
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
  const dimensions = JSON.parse(row.dimensions_json) as EvaluationDimension[];
  const calibrated = calculateOverallScore(dimensions);
  return {
    id: row.id,
    releaseVersion: row.release_version,
    status: row.status,
    overallScore: row.overall_score,
    rawWeightedScore: calibrated.rawWeightedScore,
    evidenceCoverage: calibrated.evidenceCoverage,
    dimensions,
    capabilities: JSON.parse(row.capability_snapshot_json) as typeof capabilities,
    notes: row.notes,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
  };
}

function latestBySource<T extends { source_id: string }>(rows: T[]): Map<string, T> {
  const latest = new Map<string, T>();
  for (const row of rows) {
    if (!latest.has(row.source_id)) latest.set(row.source_id, row);
  }
  return latest;
}

function groupEvidence<T extends { eventId: string }>(rows: T[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const current = grouped.get(row.eventId) ?? [];
    current.push(row);
    grouped.set(row.eventId, current);
  }
  return grouped;
}

function average(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function clamp(value: number): number {
  return Math.round(Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0)));
}

function ratio(value: number, target: number): number {
  return target > 0 ? Math.max(0, Math.min(1, value / target)) : 0;
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
