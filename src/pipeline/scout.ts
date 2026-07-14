import { createHash } from "node:crypto";
import type { Kysely } from "kysely";
import { Repository, scoutFingerprint } from "../db/repository.js";
import type { DatabaseSchema, EventRow } from "../db/types.js";

const SCOUT_LIFETIME_MS = 14 * 86_400_000;
export const PUBLIC_SCOUT_POOL_TARGET = 18;
const kinds = ["venture", "media", "work", "learning", "artifact", "influence"] as const;

export async function runScout(db: Kysely<DatabaseSchema>, limit = 3) {
  const repository = new Repository(db);
  const timestamp = new Date().toISOString();
  const expiredResult = await db
    .updateTable("scout_insights")
    .set({ status: "archived", published_at: null, updated_at: timestamp })
    .where("status", "=", "published")
    .where("expires_at", "is not", null)
    .where("expires_at", "<", timestamp)
    .executeTakeFirst();
  const publishedCandidates = await repository.listScoutInsights("published");
  const retainedFingerprints = new Set<string>();
  const duplicateIds: string[] = [];
  for (const insight of publishedCandidates) {
    const fingerprint = scoutFingerprint(insight.kind, insight.title);
    if (retainedFingerprints.has(fingerprint)) duplicateIds.push(insight.id);
    else retainedFingerprints.add(fingerprint);
  }
  if (duplicateIds.length > 0) {
    await db
      .updateTable("scout_insights")
      .set({ status: "archived", published_at: null, updated_at: timestamp })
      .where("id", "in", duplicateIds)
      .execute();
  }
  const publishedPool = publishedCandidates.filter((insight) => !duplicateIds.includes(insight.id));
  const publicFingerprints = new Set(
    publishedPool.map((insight) => scoutFingerprint(insight.kind, insight.title)),
  );
  const publishedKindCounts = new Map(
    kinds.map((kind) => [kind, publishedPool.filter((insight) => insight.kind === kind).length]),
  );
  const requested = Math.max(1, Math.min(limit, PUBLIC_SCOUT_POOL_TARGET));
  const missingKindCount = kinds.filter(
    (kind) => (publishedKindCounts.get(kind) ?? 0) === 0,
  ).length;
  const target = Math.min(
    requested,
    Math.max(PUBLIC_SCOUT_POOL_TARGET - publicFingerprints.size, missingKindCount, 0),
  );
  const events = (await repository.listEvents("published")).sort(
    (a, b) =>
      scoutCandidateScore(b) - scoutCandidateScore(a) ||
      Date.parse(b.updated_at) - Date.parse(a.updated_at),
  );
  const existingCount = (await repository.listScoutInsights()).length;
  let created = 0;
  let published = 0;
  let archived = 0;
  let skipped = 0;

  for (const [index, event] of events.entries()) {
    if (created >= target) break;
    const kind =
      [...kinds].sort(
        (left, right) =>
          (publishedKindCounts.get(left) ?? 0) - (publishedKindCounts.get(right) ?? 0) ||
          ((kinds.indexOf(left) + existingCount + index) % kinds.length) -
            ((kinds.indexOf(right) + existingCount + index) % kinds.length),
      )[0] ?? "venture";
    const cooldownKey = `${kind}:${event.slug}`;
    const card = buildScoutCard(event, kind);
    const fingerprint = scoutFingerprint(kind, card.title);
    if (publicFingerprints.has(fingerprint)) {
      skipped += 1;
      continue;
    }
    const since = new Date(Date.now() - SCOUT_LIFETIME_MS).toISOString();
    if (await repository.findRecentScoutInsight(cooldownKey, since)) {
      skipped += 1;
      continue;
    }
    const publishable = scoutPublicationDecision(card);
    const generatedAt = new Date().toISOString();
    await repository.insertScoutInsight(
      {
        slug: `${kind}-${event.slug}-${shortHash(generatedAt)}`,
        kind,
        status: publishable.allowed ? "published" : "archived",
        ...card,
        cooldown_key: cooldownKey,
        generated_at: generatedAt,
        expires_at: new Date(Date.now() + SCOUT_LIFETIME_MS).toISOString(),
      },
      event.id,
    );
    created += 1;
    if (publishable.allowed) {
      published += 1;
      publicFingerprints.add(fingerprint);
      publishedKindCounts.set(kind, (publishedKindCounts.get(kind) ?? 0) + 1);
    } else archived += 1;
  }
  return {
    scanned: Math.min(events.length, created + skipped),
    candidates: events.length,
    created,
    published,
    archived: archived + duplicateIds.length,
    deduplicated: duplicateIds.length,
    expired: Number(expiredResult.numUpdatedRows ?? 0),
    skipped,
    publishedPoolBefore: new Set(
      publishedPool.map((insight) => scoutFingerprint(insight.kind, insight.title)),
    ).size,
    publishedPoolTarget: PUBLIC_SCOUT_POOL_TARGET,
    mode: "deterministic-v3-autonomous-publishing",
  };
}

export interface ScoutPublicationInput {
  total_score: number;
  evidence_score: number;
  confidence_score: number;
  novelty_score: number;
}

export function scoutPublicationDecision(input: ScoutPublicationInput): {
  allowed: boolean;
  blockers: string[];
} {
  const blockers = [
    ...(input.total_score < 72 ? ["total_score_below_72"] : []),
    ...(input.evidence_score < 70 ? ["evidence_score_below_70"] : []),
    ...(input.confidence_score < 70 ? ["confidence_score_below_70"] : []),
    ...(input.novelty_score < 55 ? ["novelty_score_below_55"] : []),
  ];
  return { allowed: blockers.length === 0, blockers };
}

export function buildScoutCard(event: EventRow, kind: (typeof kinds)[number]) {
  const base = {
    observation: `${event.title} 已发布。当前评分为行业影响 ${event.impact_score}、业务价值 ${event.value_score}，适合继续做小规模验证。`,
    why_now: `未来 7 天可重点观察新发布、采用情况和成本变化，用这些信号判断影响能否持续。`,
    counter_signals: `现有证据可能偏向发布方。如果没有独立采用、真实成本或持续性数据，应降低优先级。`,
    horizon: "7-30d",
    confidence_score: Math.min(92, event.confidence_score),
    evidence_score: Math.min(95, Math.round((event.confidence_score + event.impact_score) / 2)),
    novelty_score: Math.min(95, Math.round((event.heat_score + event.impact_score) / 2)),
    leverage_score: Math.min(96, event.value_score),
    total_score: Math.min(
      96,
      Math.round(
        event.confidence_score * 0.3 +
          event.impact_score * 0.25 +
          event.value_score * 0.3 +
          event.heat_score * 0.15,
      ),
    ),
  };
  if (kind === "media") {
    return {
      ...base,
      title: `围绕「${event.title}」整理一份可持续更新的分析`,
      hypothesis: `市场会快速复述发布内容。把事实、反例、技术条件和业务影响放在一起，能为中文读者提供更完整的判断依据。`,
      target_audience: "AI 从业者、产品负责人、投资与创业观察者",
      suggested_action:
        "48 小时内整理一页事实/推断对照，访谈 2 位相关从业者，并验证读者最关心的三个问题。",
      artifact_idea: "一张证据地图 + 一篇 1500 字分析 + 后续可持续更新的观察清单",
    };
  }
  if (kind === "work") {
    return {
      ...base,
      title: `围绕「${event.title}」发起一个 7 天内部验证`,
      hypothesis: `将这项变化映射到客户、成本或研发指标，可以检验它是否适用于当前组织。`,
      target_audience: "业务、产品、工程与战略协作团队",
      suggested_action:
        "选择一个真实工作流，写出成功指标和停止条件，用最小 demo 或数据分析完成一次跨职能评审。",
      artifact_idea: "内部机会 brief、可运行 demo、决策记录和复盘模板",
    };
  }
  if (kind === "learning") {
    return {
      ...base,
      title: `围绕「${event.title}」核对一个关键未知项`,
      hypothesis: `事件已经公开，但它的技术前提、适用边界和反例可能仍不清楚。把未知项拆成可验证的问题，有助于团队独立评估发布方的说法。`,
      target_audience: "需要建立 AI 技术与产业判断框架的负责人和研究者",
      suggested_action:
        "用 3 天完成一份问题树：核对原始资料，找 2 个反例，并请一位领域从业者指出最可能被误读的结论。",
      artifact_idea: "概念地图、原始资料索引、反例清单和一页学习复盘",
    };
  }
  if (kind === "artifact") {
    return {
      ...base,
      title: `围绕「${event.title}」制作一个可复用的数据集或工具`,
      hypothesis: `事件背后的比较、评测或迁移问题会重复出现。把分析整理为结构化数据、检查器或模板，便于后续重复使用。`,
      target_audience: "开发者、研究工程师、技术内容与开源项目维护者",
      suggested_action:
        "48 小时内定义一个最小 schema，录入 10 条可核验样本，并让 2 位目标用户完成一次无指导使用。",
      artifact_idea: "公开数据表、评测脚本、检查清单或可复用 CLI",
    };
  }
  if (kind === "influence") {
    return {
      ...base,
      title: `围绕「${event.title}」发布一条可持续核验的观点`,
      hypothesis: `公开事实、不同判断、反证和后续指标，可以让观点持续接受检验，并减少对短期热点的依赖。`,
      target_audience: "希望建立 AI 专业表达与行业连接的创作者和负责人",
      suggested_action:
        "先发布一张事实/判断/反证卡片，邀请 3 位相关从业者纠错，并在 7 天后按新增证据公开更新结论。",
      artifact_idea: "观点卡、证据链接页、公开预测记录和 7 天更新帖",
    };
  }
  return {
    ...base,
    title: `围绕「${event.title}」验证一个具体创业场景`,
    hypothesis: `这项变化可能让部分过去成本过高或能力不足的问题变得可解。验证重点是找到愿意为结果付费的具体场景和可行的获客路径。`,
    target_audience: "有高频痛点且已有预算的垂直团队",
    suggested_action:
      "48 小时内访谈 5 个潜在用户，确认现有替代方案、付费触发点和不可接受风险；只做一个能验证结果的原型。",
    artifact_idea: "机会假设画布、5 份访谈记录、一个结果型 demo 和继续/停止决策",
  };
}

function shortHash(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 8);
}

function scoutCandidateScore(event: EventRow): number {
  const ageDays = Math.max(0, (Date.now() - Date.parse(event.happened_at)) / 86_400_000);
  const recency = Math.max(0, 30 * (1 - ageDays / 90));
  return event.value_score + event.impact_score + recency;
}
