import { createHash } from "node:crypto";
import type { Kysely } from "kysely";
import { Repository } from "../db/repository.js";
import type { DatabaseSchema, EventRow } from "../db/types.js";

const COOLDOWN_MS = 72 * 60 * 60 * 1_000;
const kinds = ["venture", "media", "work"] as const;

export async function runScout(db: Kysely<DatabaseSchema>, limit = 3) {
  const repository = new Repository(db);
  const target = Math.max(1, Math.min(limit, 10));
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
    const kind = kinds[(existingCount + index) % kinds.length] ?? "venture";
    const cooldownKey = `${kind}:${event.slug}`;
    const since = new Date(Date.now() - COOLDOWN_MS).toISOString();
    if (await repository.findRecentScoutInsight(cooldownKey, since)) {
      skipped += 1;
      continue;
    }
    const card = buildScoutCard(event, kind);
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
        expires_at: new Date(Date.now() + 30 * 86_400_000).toISOString(),
      },
      event.id,
    );
    created += 1;
    if (publishable.allowed) published += 1;
    else archived += 1;
  }
  return {
    scanned: Math.min(events.length, created + skipped),
    candidates: events.length,
    created,
    published,
    archived,
    skipped,
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
    observation: `${event.title} 已进入已发布事件，并在影响力 ${event.impact_score}、业务价值 ${event.value_score} 的维度上形成值得继续验证的信号。`,
    why_now: `能力、产业叙事和行动窗口正在同一时间发生变化；未来 7 天的新发布、采用和成本信号将决定它是短期噪声还是结构性转折。`,
    counter_signals: `当前证据仍可能偏向发布方叙事；如果独立采用、真实成本或持续性指标没有出现，应下调判断。`,
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
      title: `把「${event.title}」做成一份可复用的判断框架`,
      hypothesis: `市场会快速复述发布本身，但缺少把事实、反证、技术门槛和业务影响放在一起的中文分析。先建立证据框架，可能形成持续内容栏目。`,
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
      hypothesis: `如果该变化能被转译为当前组织的客户、成本或研发指标，就有机会从行业信息变成可见的工作杠杆。`,
      target_audience: "业务、产品、工程与战略协作团队",
      suggested_action:
        "选择一个真实工作流，写出成功指标和停止条件，用最小 demo 或数据分析完成一次跨职能评审。",
      artifact_idea: "内部机会 brief、可运行 demo、决策记录和复盘模板",
    };
  }
  return {
    ...base,
    title: `从「${event.title}」验证一个窄而深的创业入口`,
    hypothesis: `事件可能让过去成本过高或能力不足的用户问题首次可解。真正机会不在复刻发布，而在找到愿意为结果付费的窄场景与分发路径。`,
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
