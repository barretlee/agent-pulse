import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type { JsonModelClient, ModelUsage } from "../ai/deepseek.js";

export const weeklyBriefMarker = (week: string) => `<!-- agent-pulse-weekly-brief:${week} -->`;

export interface WeeklyEvent {
  slug: string;
  title: string;
  happenedAt: string;
  category: string;
  factSummary: string;
  technicalInsight?: string;
  industryInsight: string;
  futureOutlook: string;
  businessValue?: string;
  impactScore?: number;
  valueScore?: number;
  evidence?: Array<{
    title?: string;
    source?: string;
    url?: string;
    role?: string;
    publishedAt?: string;
  }>;
  tracks?: Array<{ slug: string; name: string }>;
}

export interface WeeklyScout {
  title: string;
  hypothesis: string;
  suggestedAction: string;
  counterSignals?: string;
  confidenceScore: number;
  publishedAt: string;
}

export interface WeeklyBriefInput {
  timeline: { generatedAt?: string; events: WeeklyEvent[] };
  scout: { insights: WeeklyScout[] };
  product: {
    version?: string;
    evaluation?: { overallScore?: number; evidenceCoverage?: number } | null;
    sourceCoverage?: { total?: number; active?: number; observing?: number };
  };
  siteUrl?: string;
}

const strategicTracks = [
  ["tech-evolution", "模型能力与研究"],
  ["agi-progress", "Agent 与软件重构"],
  ["commercialization", "产品与商业验证"],
  ["model-economics", "基础设施与成本"],
  ["investing", "资本与公司演化"],
  ["global-innovation", "全球创新版图"],
] as const;

const aiWeeklyBriefSchema = z.object({
  headline: z.string().trim().min(20).max(180),
  executiveSummary: z.string().trim().min(50).max(800),
  thesisChanges: z
    .array(
      z.object({
        eventSlug: z.string().min(1),
        whatChanged: z.string().trim().min(30).max(500),
        whyItMatters: z.string().trim().min(30).max(600),
        affected: z.string().trim().min(10).max(300),
        decisionImplication: z.string().trim().min(24).max(500),
        nextSignal: z.string().trim().min(20).max(400),
      }),
    )
    .min(1)
    .max(4),
  decisionCards: z
    .array(
      z.object({
        audience: z.enum(["CEO / 业务负责人", "投资负责人", "技术负责人", "创业者 / 产品负责人"]),
        action: z.string().trim().min(16).max(300),
        rationale: z.string().trim().min(20).max(400),
        firstStep: z.string().trim().min(20).max(300),
        stopCondition: z.string().trim().min(20).max(300),
        eventSlugs: z.array(z.string().min(1)).min(1).max(4),
      }),
    )
    .min(2)
    .max(4),
  uncertainties: z
    .array(
      z.object({
        question: z.string().trim().min(20).max(300),
        evidenceBoundary: z.string().trim().min(20).max(400),
        nextSignal: z.string().trim().min(20).max(300),
        eventSlugs: z.array(z.string().min(1)).min(1).max(4),
      }),
    )
    .min(1)
    .max(4),
  watchlist: z
    .array(
      z.object({
        item: z.string().trim().min(4).max(240),
        trigger: z.string().trim().min(15).max(300),
        eventSlugs: z.array(z.string().min(1)).min(1).max(4),
      }),
    )
    .min(2)
    .max(6),
});

const STOP_CONDITION = /(如果|若|一旦|当).*(未|没有|无法|不能|不再|低于|高于|超过|缺乏|失败|恶化)/;

export type AiWeeklyBrief = z.infer<typeof aiWeeklyBriefSchema>;

export interface AiWeeklyBriefResult {
  body: string;
  usage: ModelUsage;
  model: string | null;
  eventCount: number;
  repairAttempts: number;
}

export function renderWeeklyBrief(
  input: WeeklyBriefInput,
  endDate: string,
  timeZone = "Asia/Shanghai",
): string {
  const window = isoWeekWindow(endDate);
  const events = input.timeline.events
    .filter((event) => {
      const date = eventDate(event, timeZone);
      return date >= window.start && date <= window.end;
    })
    .sort(
      (left, right) =>
        (right.impactScore ?? 0) - (left.impactScore ?? 0) ||
        (right.valueScore ?? 0) - (left.valueScore ?? 0) ||
        right.happenedAt.localeCompare(left.happenedAt),
    );
  if (!events.length) return "";
  const research = events.filter((event) => ["research", "paper"].includes(event.category));
  const scout = input.scout.insights
    .filter((item) => {
      const date = zonedDate(item.publishedAt, timeZone);
      return date >= window.start && date <= window.end;
    })
    .sort((left, right) => right.confidenceScore - left.confidenceScore);
  const sourceCount = new Set(
    events.flatMap((event) => event.evidence?.map((item) => item.source).filter(Boolean) ?? []),
  ).size;
  const siteUrl = input.siteUrl ?? "https://barretlee.github.io/agent-pulse/";
  const leadingEvents = events.slice(0, 3);
  const actions = selectActionableScouts(scout, 3);
  const affectedTracks = new Set(events.flatMap(eventTrackNames));
  const unchangedTracks = strategicTracks.length - affectedTracks.size;
  const judgment = `需要更新。${safe(events[0]?.industryInsight ?? events[0]?.factSummary ?? "", 180)}`;
  const lines = [
    weeklyBriefMarker(window.week),
    `# Agent Pulse AI 周报 · ${window.week}`,
    "",
    `> **一句话判断：${judgment}**`,
    "",
    `**周期** ${window.start}—${window.end} · **新增变化** ${events.length} · **事实信源** ${sourceCount} · **研究** ${research.length}`,
    "",
    `[查看完整站点](${siteUrl}) · [打开趋势判断](${siteUrl.replace(/\/?$/, "/")}lines/)`,
    "",
    "## 本周关键变化",
    "",
  ];

  for (const event of leadingEvents) {
    const tracks = eventTrackNames(event);
    lines.push(
      `### [${safe(event.title, 120)}](${eventUrl(siteUrl, event.slug)})`,
      "",
      safe(event.factSummary, 220),
      "",
      `- **影响主线**：${tracks.length ? tracks.join(" / ") : "待归类"}`,
      `- **判断变化**：${safe(event.industryInsight, 240)}`,
      `- **下一观察**：${safe(event.futureOutlook, 240)}`,
      "",
    );
  }
  if (events.length > leadingEvents.length) {
    lines.push(
      `另有 ${events.length - leadingEvents.length} 个变化已进入完整站点，本期只保留最值得判断的 3 个。`,
      "",
    );
  }
  if (unchangedTracks > 0)
    lines.push(`其余 ${unchangedTracks} 条主线本周暂无足以改变判断的新证据。`, "");

  lines.push("## 下周三件事", "");
  if (!actions.length) lines.push("暂无达到公开门槛的新行动建议。", "");
  for (const [index, item] of actions.entries()) {
    const trigger = scoutTrigger(item.title);
    lines.push(
      `${index + 1}. **${scoutLabel(item.title)}**${trigger ? `（${safe(trigger, 52)}）` : ""}`,
      `   ${safe(item.suggestedAction, 220)}`,
    );
  }
  const stopCondition = actions.find((item) => item.counterSignals)?.counterSignals;
  if (stopCondition) lines.push("", `**统一停止条件**：${safe(stopCondition, 220)}`);

  lines.push(
    "",
    "## 仍需验证",
    "",
    research.length
      ? `本周有 ${research.length} 篇研究通过公开门禁；优先核对方法、复现和真实影响。`
      : "本周没有新增研究通过方法、证据与影响门禁。",
    ...uniqueStrings(leadingEvents.map((event) => event.futureOutlook))
      .slice(0, 3)
      .map((item) => `- ${safe(item, 220)}`),
    "",
    "<details>",
    "<summary>数据与覆盖</summary>",
    "",
    `- 站点版本：${safe(input.product.version ?? "unknown", 30)}`,
    `- 系统评测：${boundedScore(input.product.evaluation?.overallScore)}/100`,
    `- 证据覆盖：${boundedScore(input.product.evaluation?.evidenceCoverage)}%`,
    `- 来源目录：${Math.max(0, Math.round(input.product.sourceCoverage?.total ?? 0))} 个；active ${Math.max(0, Math.round(input.product.sourceCoverage?.active ?? 0))}；observing ${Math.max(0, Math.round(input.product.sourceCoverage?.observing ?? 0))}`,
    `- 快照生成：${safe(input.timeline.generatedAt ?? "unknown", 40)}`,
    "",
    "> 来源目录不等于事实证据；具体判断以事件页的原始资料为准。",
    "",
    "</details>",
  );
  return `${lines.join("\n")}\n`;
}

export async function renderAiWeeklyBrief(
  input: WeeklyBriefInput,
  endDate: string,
  client: JsonModelClient,
  timeZone = "Asia/Shanghai",
): Promise<AiWeeklyBriefResult> {
  const window = isoWeekWindow(endDate);
  const events = weeklyEvents(input, window, timeZone);
  if (!events.length) {
    return {
      body: "",
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      model: null,
      eventCount: 0,
      repairAttempts: 0,
    };
  }
  const scout = input.scout.insights
    .filter((item) => {
      const date = zonedDate(item.publishedAt, timeZone);
      return date >= window.start && date <= window.end;
    })
    .sort((left, right) => right.confidenceScore - left.confidenceScore)
    .slice(0, 6);
  const prompt = JSON.stringify({
    task: "生成一份面向决策者的 Agent Pulse AI 周报结构化草稿。只使用输入中的公开事实。",
    rules: [
      "不要复述新闻列表，要说明判断发生了什么变化、影响谁、现在应做什么。",
      "事实与判断分开，不得补造模型能力、采用率、价格、收入或融资数字。",
      "所有 eventSlug/eventSlugs 必须来自 events.slug。",
      "每个动作必须有 48 小时第一步和停止条件，避免泛泛而谈。",
      "stopCondition 必须是证伪、暂停或放弃动作的条件，使用‘如果/若/一旦/当……未、无法、低于、高于、失败’表达；完成任务本身不是停止条件。",
      "headline 提炼判断变化，不要简单重复事件标题；避免‘颠覆、必然、直接消灭’等无证据的绝对表达。",
      "只返回 JSON object，不要返回 Markdown。",
    ],
    outputSchema: {
      headline: "string",
      executiveSummary: "string",
      thesisChanges: [
        {
          eventSlug: "events.slug",
          whatChanged: "string",
          whyItMatters: "string",
          affected: "string",
          decisionImplication: "string",
          nextSignal: "string",
        },
      ],
      decisionCards: [
        {
          audience: "CEO / 业务负责人 | 投资负责人 | 技术负责人 | 创业者 / 产品负责人",
          action: "string",
          rationale: "string",
          firstStep: "string",
          stopCondition: "string",
          eventSlugs: ["events.slug"],
        },
      ],
      uncertainties: [
        {
          question: "string",
          evidenceBoundary: "string",
          nextSignal: "string",
          eventSlugs: ["events.slug"],
        },
      ],
      watchlist: [{ item: "string", trigger: "string", eventSlugs: ["events.slug"] }],
    },
    period: window,
    dataAsOf: endDate,
    events: events.slice(0, 8).map((event) => ({
      slug: event.slug,
      title: event.title,
      happenedAt: event.happenedAt,
      category: event.category,
      factSummary: safe(event.factSummary, 600),
      technicalInsight: safe(event.technicalInsight ?? "", 600),
      industryInsight: safe(event.industryInsight, 600),
      futureOutlook: safe(event.futureOutlook, 500),
      businessValue: safe(event.businessValue ?? "", 600),
      tracks: eventTrackNames(event),
      evidence: (event.evidence ?? []).slice(0, 6).map((evidence) => ({
        title: safe(evidence.title ?? "", 240),
        source: safe(evidence.source ?? "", 100),
        role: safe(evidence.role ?? "", 40),
        publishedAt: evidence.publishedAt,
        url: evidence.url,
      })),
    })),
    scout: scout.map((item) => ({
      title: safe(item.title, 200),
      hypothesis: safe(item.hypothesis, 500),
      suggestedAction: safe(item.suggestedAction, 500),
      counterSignals: safe(item.counterSignals ?? "", 400),
      confidenceScore: item.confidenceScore,
    })),
    product: {
      version: input.product.version,
      evaluation: input.product.evaluation
        ? {
            overallScore: input.product.evaluation.overallScore,
            evidenceCoverage: input.product.evaluation.evidenceCoverage,
          }
        : null,
      sourceCoverage: input.product.sourceCoverage,
    },
  });
  const system = [
    "你是 Agent Pulse 的主编，服务 CEO、投资负责人、创业者和技术负责人。",
    "你只使用提供的公开 Event 和 Evidence，不把推断写成事实。",
    "输出必须具体、可执行、可证伪，并返回严格 JSON。",
  ].join("\n");
  const completion = await client.completeJson({
    system,
    user: prompt,
    maxTokens: 2_400,
  });
  let brief: AiWeeklyBrief;
  let model = completion.model;
  let usage = { ...completion.usage };
  let repairAttempts = 0;
  try {
    brief = validateAiWeeklyBrief(completion.value, events);
  } catch (error) {
    repairAttempts = 1;
    const repaired = await client.completeJson({
      system,
      user: JSON.stringify({
        task: "修复这份 AI 周报 JSON，使其通过本地结构与引用校验。只修结构和表达，不新增事实。",
        validationError: safeWeeklyErrorCode(error),
        allowedEventSlugs: events.map((event) => event.slug),
        rules: [
          "保留原草稿中有输入证据支持的内容。",
          "所有 eventSlug/eventSlugs 只能来自 allowedEventSlugs。",
          "补齐缺失字段并满足原数组数量、长度和枚举约束。",
          "不要输出 Markdown，只返回修复后的 JSON object。",
        ],
        invalidDraft: completion.value,
      }),
      maxTokens: 2_400,
    });
    usage = addModelUsage(usage, repaired.usage);
    model = repaired.model;
    brief = validateAiWeeklyBrief(repaired.value, events, true);
  }
  return {
    body: renderAiWeeklyMarkdown(input, window, endDate, events, brief),
    usage,
    model,
    eventCount: events.length,
    repairAttempts,
  };
}

export async function runWeeklyBriefCli(args = process.argv.slice(2)): Promise<void> {
  const timelinePath = requiredValue(args, "--timeline");
  const scoutPath = requiredValue(args, "--scout");
  const productPath = requiredValue(args, "--product");
  const timeZone = valueFor(args, "--time-zone") ?? "Asia/Shanghai";
  const endDate = valueFor(args, "--end-date") ?? zonedDate(new Date().toISOString(), timeZone);
  const [timeline, scout, product] = await Promise.all(
    [timelinePath, scoutPath, productPath].map(async (path) =>
      JSON.parse(await readFile(resolve(path), "utf8")),
    ),
  );
  const input = { timeline, scout, product } as WeeklyBriefInput;
  if (args.includes("--ai")) {
    const [{ DeepSeekClient }, { loadConfig }] = await Promise.all([
      import("../ai/deepseek.js"),
      import("../config/env.js"),
    ]);
    const config = loadConfig();
    if (!config.AI_ENRICHMENT_ENABLED)
      throw new Error("AI_ENRICHMENT_ENABLED must be true for --ai");
    if (!config.DEEPSEEK_API_KEY) throw new Error("DEEPSEEK_API_KEY is required for --ai");
    const result = await renderAiWeeklyBrief(
      input,
      endDate,
      new DeepSeekClient({
        apiKey: config.DEEPSEEK_API_KEY,
        baseUrl: config.DEEPSEEK_BASE_URL,
        model: config.DEEPSEEK_MODEL,
        timeoutMs: config.AI_ENRICHMENT_TIMEOUT_MS,
      }),
      timeZone,
    );
    process.stderr.write(
      `${JSON.stringify({ mode: "ai-weekly-brief", model: result.model, eventCount: result.eventCount, repairAttempts: result.repairAttempts, usage: result.usage })}\n`,
    );
    process.stdout.write(result.body);
    return;
  }
  process.stdout.write(renderWeeklyBrief(input, endDate, timeZone));
}

function weeklyEvents(
  input: WeeklyBriefInput,
  window: { start: string; end: string },
  timeZone: string,
): WeeklyEvent[] {
  return input.timeline.events
    .filter((event) => {
      const date = eventDate(event, timeZone);
      return date >= window.start && date <= window.end;
    })
    .sort(
      (left, right) =>
        (right.impactScore ?? 0) - (left.impactScore ?? 0) ||
        (right.valueScore ?? 0) - (left.valueScore ?? 0) ||
        right.happenedAt.localeCompare(left.happenedAt),
    );
}

function validateAiWeeklyBrief(
  value: unknown,
  events: WeeklyEvent[],
  allowStopConditionFallback = false,
): AiWeeklyBrief {
  const unwrapped =
    value && typeof value === "object" && "weeklyBrief" in value
      ? (value as { weeklyBrief: unknown }).weeklyBrief
      : value;
  const parsed = aiWeeklyBriefSchema.safeParse(unwrapped);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path.join("_").replace(/[^a-zA-Z0-9_]/g, "_") || "root";
    throw new Error(`invalid_ai_weekly_schema_${path}_${issue?.code ?? "unknown"}`);
  }
  const invalidStopCondition = parsed.data.decisionCards.findIndex(
    (card) => !STOP_CONDITION.test(card.stopCondition),
  );
  if (invalidStopCondition >= 0 && !allowStopConditionFallback) {
    throw new Error(
      `invalid_ai_weekly_schema_decisionCards_${invalidStopCondition}_stopCondition_custom`,
    );
  }
  const brief: AiWeeklyBrief = {
    ...parsed.data,
    decisionCards: parsed.data.decisionCards.map((card) => ({
      ...card,
      stopCondition: STOP_CONDITION.test(card.stopCondition)
        ? card.stopCondition
        : "如果 7 天内无法观察到可量化改善，或风险与人工接管未下降，则停止扩面。",
    })),
  };
  const slugs = new Set(events.map((event) => event.slug));
  const referenced = [
    ...brief.thesisChanges.map((item) => item.eventSlug),
    ...brief.decisionCards.flatMap((item) => item.eventSlugs),
    ...brief.uncertainties.flatMap((item) => item.eventSlugs),
    ...brief.watchlist.flatMap((item) => item.eventSlugs),
  ];
  if (referenced.some((slug) => !slugs.has(slug))) throw new Error("unknown_weekly_event_slug");
  if (containsPlaceholder(brief)) throw new Error("weekly_brief_contains_placeholder");
  return brief;
}

function safeWeeklyErrorCode(error: unknown): string {
  const value = error instanceof Error ? error.message : "invalid_ai_weekly_output";
  return value.replace(/[^a-zA-Z0-9_:-]/g, "_").slice(0, 160) || "invalid_ai_weekly_output";
}

function addModelUsage(left: ModelUsage, right: ModelUsage): ModelUsage {
  return {
    promptTokens: left.promptTokens + right.promptTokens,
    completionTokens: left.completionTokens + right.completionTokens,
    totalTokens: left.totalTokens + right.totalTokens,
  };
}

function renderAiWeeklyMarkdown(
  input: WeeklyBriefInput,
  window: { start: string; end: string; week: string },
  dataAsOf: string,
  events: WeeklyEvent[],
  brief: AiWeeklyBrief,
): string {
  const siteUrl = input.siteUrl ?? "https://barretlee.github.io/agent-pulse/";
  const eventsBySlug = new Map(events.map((event) => [event.slug, event]));
  const sourceCount = new Set(
    events.flatMap((event) => event.evidence?.map((item) => item.source).filter(Boolean) ?? []),
  ).size;
  const research = events.filter((event) => ["research", "paper"].includes(event.category));
  const eventLinks = (slugs: string[]) =>
    uniqueStrings(slugs)
      .map((slug) => eventsBySlug.get(slug))
      .filter((event): event is WeeklyEvent => Boolean(event))
      .map((event) => `[${safe(event.title, 80)}](${eventUrl(siteUrl, event.slug)})`)
      .join("、");
  const lines = [
    weeklyBriefMarker(window.week),
    `# Agent Pulse AI 周报 · ${window.week}`,
    "",
    `> **核心判断：${safe(brief.headline, 180)}**`,
    "",
    safe(brief.executiveSummary, 800),
    "",
    `**周期** ${window.start}—${window.end} · **数据截至** ${dataAsOf} · **公开变化** ${events.length} · **独立事实信源** ${sourceCount} · **研究** ${research.length}`,
    "",
    `[完整站点](${siteUrl}) · [趋势判断](${siteUrl.replace(/\/?$/, "/")}lines/) · [事件脉络](${siteUrl.replace(/\/?$/, "/")}timeline/)`,
    "",
    "## 本周判断发生了什么变化",
    "",
  ];
  for (const [index, change] of brief.thesisChanges.entries()) {
    const event = eventsBySlug.get(change.eventSlug);
    if (!event) continue;
    lines.push(
      `### ${index + 1}. [${safe(event.title, 120)}](${eventUrl(siteUrl, event.slug)})`,
      "",
      `- **可核验事实**：${safe(change.whatChanged, 500)}`,
      `- **为什么现在重要**：${safe(change.whyItMatters, 600)}`,
      `- **直接影响谁**：${safe(change.affected, 300)}`,
      `- **决策含义**：${safe(change.decisionImplication, 500)}`,
      `- **下一验证信号**：${safe(change.nextSignal, 400)}`,
      "",
    );
  }
  lines.push("## 给决策者的行动卡", "");
  for (const card of brief.decisionCards) {
    lines.push(
      `### ${safe(card.audience, 40)}`,
      "",
      `- **现在做什么**：${safe(card.action, 300)}`,
      `- **为什么**：${safe(card.rationale, 400)}`,
      `- **48 小时第一步**：${safe(card.firstStep, 300)}`,
      `- **停止条件**：${safe(card.stopCondition, 300)}`,
      `- **触发事件**：${eventLinks(card.eventSlugs)}`,
      "",
    );
  }
  lines.push("## 非共识与仍需验证", "");
  for (const uncertainty of brief.uncertainties) {
    lines.push(
      `- **${safe(uncertainty.question, 300)}**`,
      `  - 当前边界：${safe(uncertainty.evidenceBoundary, 400)}`,
      `  - 下一信号：${safe(uncertainty.nextSignal, 300)}`,
      `  - 相关事件：${eventLinks(uncertainty.eventSlugs)}`,
    );
  }
  lines.push("", "## 下周观察清单", "");
  for (const item of brief.watchlist) {
    lines.push(
      `- **${safe(item.item, 240)}**：${safe(item.trigger, 300)}（${eventLinks(item.eventSlugs)}）`,
    );
  }
  lines.push(
    "",
    "<details>",
    "<summary>方法与覆盖</summary>",
    "",
    `- 站点版本：${safe(input.product.version ?? "unknown", 30)}`,
    `- 系统评测：${boundedScore(input.product.evaluation?.overallScore)}/100`,
    `- 证据覆盖：${boundedScore(input.product.evaluation?.evidenceCoverage)}%`,
    `- 来源目录：${Math.max(0, Math.round(input.product.sourceCoverage?.total ?? 0))}；active ${Math.max(0, Math.round(input.product.sourceCoverage?.active ?? 0))}；observing ${Math.max(0, Math.round(input.product.sourceCoverage?.observing ?? 0))}`,
    `- 快照生成：${safe(input.timeline.generatedAt ?? "unknown", 40)}`,
    "",
    "> AI 只基于已公开 Event 生成结构化判断；事实以事件页原始 Evidence 为准。来源目录不等于事实证据。",
    "",
    "</details>",
  );
  return `${lines.join("\n")}\n`;
}

function containsPlaceholder(value: unknown): boolean {
  if (typeof value === "string") return /待编辑|待补充|\bTBD\b|\bTODO\b|placeholder/i.test(value);
  if (Array.isArray(value)) return value.some(containsPlaceholder);
  return Boolean(
    value && typeof value === "object" && Object.values(value).some(containsPlaceholder),
  );
}

function isoWeekWindow(date: string): { start: string; end: string; week: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Weekly brief date must be YYYY-MM-DD");
  const current = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(current.valueOf())) throw new Error(`Invalid date: ${date}`);
  const weekday = current.getUTCDay() || 7;
  const monday = new Date(current);
  monday.setUTCDate(current.getUTCDate() - weekday + 1);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const thursday = new Date(monday);
  thursday.setUTCDate(monday.getUTCDate() + 3);
  const year = thursday.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(
    ((thursday.getTime() - yearStart.getTime()) / 86_400_000 + yearStart.getUTCDay() + 1) / 7,
  );
  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
    week: `${year}-W${String(week).padStart(2, "0")}`,
  };
}

function eventDate(event: WeeklyEvent, timeZone: string): string {
  const latest = [event.happenedAt, ...(event.evidence ?? []).map((item) => item.publishedAt ?? "")]
    .filter(Boolean)
    .sort()
    .at(-1);
  return zonedDate(latest ?? event.happenedAt, timeZone);
}

function zonedDate(value: string, timeZone: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) throw new Error(`Invalid timestamp: ${value}`);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function eventUrl(siteUrl: string, slug: string): string {
  return `${siteUrl.replace(/\/?$/, "/")}events/${encodeURIComponent(slug)}/`;
}

function eventTrackNames(event: WeeklyEvent): string[] {
  const names = new Map<string, string>(strategicTracks);
  return uniqueStrings(
    (event.tracks ?? [])
      .map((track) => names.get(track.slug))
      .filter((name): name is string => Boolean(name)),
  );
}

function selectActionableScouts(items: WeeklyScout[], limit: number): WeeklyScout[] {
  const selected: WeeklyScout[] = [];
  const seenTriggers = new Set<string>();
  const seenLabels = new Set<string>();
  const add = (item: WeeklyScout) => {
    if (selected.includes(item) || selected.length >= limit) return;
    selected.push(item);
    const trigger = scoutTrigger(item.title);
    if (trigger) seenTriggers.add(trigger);
    seenLabels.add(scoutLabel(item.title));
  };

  for (const item of items) {
    const trigger = scoutTrigger(item.title);
    if (trigger && !seenTriggers.has(trigger)) add(item);
  }
  for (const item of items) {
    if (!seenLabels.has(scoutLabel(item.title))) add(item);
  }
  for (const item of items) add(item);
  return selected;
}

function scoutTrigger(title: string): string {
  return title.match(/「([^」]+)」/)?.[1]?.trim() ?? "";
}

function scoutLabel(title: string): string {
  const labels: Array<[string, string]> = [
    ["数据或工具资产", "沉淀一个数据或工具资产"],
    ["内部验证", "做一次 7 天内部验证"],
    ["创业入口", "验证一个窄而深的创业入口"],
    ["认知缺口", "补齐一个会改变判断的认知缺口"],
    ["公开观点", "发布一条可持续验证的公开观点"],
    ["判断框架", "沉淀一份可复用判断框架"],
  ];
  return labels.find(([keyword]) => title.includes(keyword))?.[1] ?? safe(title, 48);
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function safe(value: string, max: number): string {
  return value
    .replace(/[\r\n<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function boundedScore(value: number | undefined): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value ?? 0))) : 0;
}

function requiredValue(args: string[], flag: string): string {
  const value = valueFor(args, flag);
  if (!value) throw new Error(`Missing required option: ${flag}`);
  return value;
}

function valueFor(args: string[], flag: string): string | undefined {
  const inline = args.find((argument) => argument.startsWith(`${flag}=`));
  if (inline) return inline.slice(flag.length + 1);
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === currentFile) await runWeeklyBriefCli();
