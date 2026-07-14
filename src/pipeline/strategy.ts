/**
 * Self-evolution strategy engine.
 *
 * Analyzes system state and generates evolution actions — what to build next,
 * which sources to prioritize, which gaps are most urgent, and how to
 * optimize the collection/clustering/scoring pipeline.
 *
 * The strategy engine is the "brain" of the self-evolution loop —
 * it reads monitor reports, coverage gaps, and quality metrics,
 * then produces prioritized action plans.
 */

import type { MonitorReport } from "./monitor.js";
import type { QualitySummary } from "./quality.js";

export type ActionPriority = "now" | "next" | "later" | "wishlist";
export type ActionCategory =
  | "add-source"
  | "fix-adapter"
  | "improve-quality"
  | "enhance-clustering"
  | "expand-coverage"
  | "optimize-performance"
  | "add-capability"
  | "documentation";

export interface EvolutionAction {
  id: string;
  category: ActionCategory;
  title: string;
  description: string;
  priority: ActionPriority;
  estimatedEffort: "S" | "M" | "L" | "XL";
  impactArea: string;
  rationale: string;
  successMetric: string;
  dependencies: string[];
}

export interface EvolutionPlan {
  generatedAt: string;
  version: number;
  summary: string;
  actions: EvolutionAction[];
  metrics: {
    totalActions: number;
    byPriority: Record<ActionPriority, number>;
    byCategory: Record<ActionCategory, number>;
  };
}

/**
 * Generate an evolution plan from the current system state.
 */
export function generateEvolutionPlan(
  monitor: MonitorReport,
  quality?: QualitySummary,
): EvolutionPlan {
  const actions: EvolutionAction[] = [];
  let id = 0;

  // ─── Source Coverage Actions ──────────────────────────────────────
  for (const gap of monitor.coverageGaps) {
    if (gap.severity === "critical") {
      actions.push({
        id: `action-${++id}`,
        category: "add-source",
        title: `接入 ${gap.label} 数据源`,
        description: `${gap.label} 当前没有健康检查通过的来源，需要立即恢复或接入至少 ${gap.target} 个高质量来源。优先修复目录中的官方 API/RSS，再发现新候选。`,
        priority: "now",
        estimatedEffort: "M",
        impactArea: gap.dimension,
        rationale: `${gap.label} 是核心覆盖维度，缺失会导致决策盲区。`,
        successMetric: `${gap.label} 健康检查通过来源 >= ${gap.target}`,
        dependencies: [],
      });
    } else if (gap.severity === "warning") {
      actions.push({
        id: `action-${++id}`,
        category: "expand-coverage",
        title: `扩充 ${gap.label} 覆盖 (${gap.current}/${gap.target})`,
        description: `${gap.label} 当前仅 ${gap.current} 个来源通过健康检查，目标 ${gap.target}。建议优先修复已有 shadow 源，满足观察窗后再人工激活，并通过 source discovery 寻找新候选。`,
        priority: "next",
        estimatedEffort: "S",
        impactArea: gap.dimension,
        rationale: `覆盖率不足会导致信息偏斜和决策偏差。`,
        successMetric: `${gap.label} 健康检查通过来源 >= ${gap.target}`,
        dependencies: [],
      });
    }
  }

  // ─── Health-Based Actions ─────────────────────────────────────────
  const degradedCount = monitor.sourcesNeedingAttention.filter(
    (s) => s.lifecycle === "degraded",
  ).length;
  if (
    monitor.automatableHealthyPercent !== undefined &&
    monitor.automatableHealthyPercent < 70 &&
    (monitor.repairableCheckedSources ?? 0) > 0
  ) {
    actions.push({
      id: `action-${++id}`,
      category: "fix-adapter",
      title: `恢复 ${monitor.repairableCheckedSources} 个异常自动来源`,
      description: `排除 ${monitor.skippedCheckedSources ?? 0} 个 policy/manual 来源后，自动来源健康率仅 ${monitor.automatableHealthyPercent}%。按 contract、HTTP、空内容和网络错误分池修复，并在 shadow 观察窗中复测。`,
      priority: "now",
      estimatedEffort: "L",
      impactArea: "source-audit-health",
      rationale: "生命周期默认分不能替代真实抓取审计；供给恢复必须以最新检查结果为准。",
      successMetric: "自动来源健康率 >= 70%，且 failed/degraded 数量持续下降",
      dependencies: [],
    });
  }
  if (degradedCount > 5) {
    actions.push({
      id: `action-${++id}`,
      category: "fix-adapter",
      title: `修复 ${degradedCount} 个已降级来源`,
      description: `${degradedCount} 个来源处于 degraded 状态。批量检查 adapter 兼容性、网络可达性和 feed 格式漂移，逐一定位根因。`,
      priority: "now",
      estimatedEffort: "L",
      impactArea: "source-health",
      rationale: "持续降级会侵蚀系统可信度和数据新鲜度。",
      successMetric: "degraded source 数量降至 3 以下",
      dependencies: [],
    });
  }

  // ─── Quality-Based Actions ────────────────────────────────────────
  if (quality && quality.avgScore < 60) {
    actions.push({
      id: `action-${++id}`,
      category: "improve-quality",
      title: "提升信号质量评分",
      description: `当前平均质量评分 ${quality.avgScore}，低于 60 分阈值。建议：(1) 增加高 tier 来源权重；(2) 改进 thin-content 过滤；(3) 提升摘要提取质量。`,
      priority: "now",
      estimatedEffort: "M",
      impactArea: "signal-quality",
      rationale: "低质量信号会稀释聚合事件的可信度和可操作性。",
      successMetric: "平均质量评分 >= 65",
      dependencies: [],
    });
  }

  // ─── Capability Actions ───────────────────────────────────────────
  actions.push({
    id: `action-${++id}`,
    category: "add-capability",
    title: "实现自动修复管线",
    description:
      "当检测到 adapter contract drift 时，自动尝试已知修复策略（如调整 CSS selector、更新 API endpoint），失败后再升级为人工处理。",
    priority: "next",
    estimatedEffort: "L",
    impactArea: "self-evolution",
    rationale: "减少人工干预频率，提升系统自主运行时间。",
    successMetric: "自动修复成功率 >= 50%",
    dependencies: [],
  });

  actions.push({
    id: `action-${++id}`,
    category: "add-capability",
    title: "构建交叉验证引擎",
    description:
      "对同一事件的多源报道进行交叉验证，自动标注事实一致性、来源独立性和证据强度。不一致事件自动提升为待审核。",
    priority: "later",
    estimatedEffort: "XL",
    impactArea: "verification",
    rationale: "交叉验证是区分信号与噪音的核心能力，也是 LLM 难以替代的高价值判断层。",
    successMetric: "交叉验证覆盖率 >= 80% 的 published events",
    dependencies: [],
  });

  actions.push({
    id: `action-${++id}`,
    category: "add-capability",
    title: "实现个性化星探偏好学习",
    description:
      "从用户对星探建议的接受/驳回/暂缓操作中学习偏好，调整 novelty、actionability、owner fit 权重，提升建议采纳率。",
    priority: "later",
    estimatedEffort: "M",
    impactArea: "personalization",
    rationale: "个性化是星探从通用工具升级为贴身顾问的关键一步。",
    successMetric: "星探采纳率 >= 40%",
    dependencies: [],
  });

  actions.push({
    id: `action-${++id}`,
    category: "optimize-performance",
    title: "实现增量采集与增量发布",
    description:
      "利用 ETag/Last-Modified 和 cursor 机制，仅采集和发布变更部分。对于无变更的来源跳过全量处理，将采集周期从全量缩短为增量。",
    priority: "next",
    estimatedEffort: "M",
    impactArea: "performance",
    rationale: "来源数量增长后全量采集不可持续，增量机制是规模化前提。",
    successMetric: "平均采集耗时降低 60%",
    dependencies: [],
  });

  actions.push({
    id: `action-${++id}`,
    category: "add-capability",
    title: "建立事件趋势预测模型",
    description:
      "基于历史事件序列，训练轻量级趋势预测模型，对未来 1-4 周可能的热点方向给出概率预测和置信区间。",
    priority: "wishlist",
    estimatedEffort: "XL",
    impactArea: "forecasting",
    rationale: "加入可核验的预测，帮助读者从事件摘要进一步判断后续变化。",
    successMetric: "预测准确率 >= 60% (top-5 predictions)",
    dependencies: [],
  });

  actions.push({
    id: `action-${++id}`,
    category: "enhance-clustering",
    title: "增强跨语言聚类能力",
    description:
      "当前聚类主要基于中文和英文标题相似度。增加跨语言 embeddings 和实体链接，使同一事件的英文、中文、日文报道能自动聚合。",
    priority: "next",
    estimatedEffort: "L",
    impactArea: "clustering",
    rationale: "AI 行业跨越多个地区和语言，相关事件需要跨语言归并和核验。",
    successMetric: "跨语言事件聚合召回率 >= 70%",
    dependencies: [],
  });

  // ─── Documentation Actions ────────────────────────────────────────
  if (monitor.shadowSources > 50) {
    actions.push({
      id: `action-${++id}`,
      category: "documentation",
      title: "编写来源接入指南",
      description: `仍有 ${monitor.shadowSources} 个来源待激活，编写标准化的接入 checklist 和常见问题文档，降低后续接入成本。`,
      priority: "later",
      estimatedEffort: "S",
      impactArea: "documentation",
      rationale: "清晰的接入文档可以让其他贡献者或 agent 自主完成来源接入。",
      successMetric: "文档覆盖所有 adapter 类型的接入流程",
      dependencies: [],
    });
  }

  // ─── Metrics ──────────────────────────────────────────────────────
  const byPriority: Record<ActionPriority, number> = { now: 0, next: 0, later: 0, wishlist: 0 };
  const byCategory: Record<ActionCategory, number> = {
    "add-source": 0,
    "fix-adapter": 0,
    "improve-quality": 0,
    "enhance-clustering": 0,
    "expand-coverage": 0,
    "optimize-performance": 0,
    "add-capability": 0,
    documentation: 0,
  };

  for (const action of actions) {
    byPriority[action.priority]++;
    byCategory[action.category]++;
  }

  const totalActions = actions.length;
  const nowActions = byPriority.now;
  const criticalGaps = monitor.coverageGaps.filter((g) => g.severity === "critical").length;

  return {
    generatedAt: new Date().toISOString(),
    version: 1,
    summary: `${totalActions} actions planned — ${nowActions} urgent (${criticalGaps} critical coverage gaps, ${degradedCount} degraded sources)`,
    actions,
    metrics: { totalActions, byPriority, byCategory },
  };
}

/**
 * Select the top N actions by priority.
 */
export function selectTopActions(plan: EvolutionPlan, count: number): EvolutionAction[] {
  const priorityOrder: ActionPriority[] = ["now", "next", "later", "wishlist"];
  const sorted = [...plan.actions].sort(
    (a, b) => priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority),
  );
  return sorted.slice(0, count);
}

/**
 * Merge multiple evolution plans into a consolidated roadmap.
 */
export function mergePlans(plans: EvolutionPlan[]): EvolutionPlan {
  const allActions = plans.flatMap((p) => p.actions);
  const seen = new Set<string>();
  const deduped: EvolutionAction[] = [];

  for (const action of allActions) {
    const key = `${action.category}:${action.title}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(action);
    }
  }

  const byPriority: Record<ActionPriority, number> = { now: 0, next: 0, later: 0, wishlist: 0 };
  const byCategory: Record<ActionCategory, number> = {
    "add-source": 0,
    "fix-adapter": 0,
    "improve-quality": 0,
    "enhance-clustering": 0,
    "expand-coverage": 0,
    "optimize-performance": 0,
    "add-capability": 0,
    documentation: 0,
  };

  for (const action of deduped) {
    byPriority[action.priority]++;
    byCategory[action.category]++;
  }

  return {
    generatedAt: new Date().toISOString(),
    version: Math.max(...plans.map((p) => p.version)) + 1,
    summary: `Merged from ${plans.length} plans — ${deduped.length} unique actions`,
    actions: deduped,
    metrics: { totalActions: deduped.length, byPriority, byCategory },
  };
}
