import type { PublicEvidence } from "../../domain/types.js";
import type { EnrichedEvent, PublicSource, TechnologyCoverage } from "./dto.js";

export interface EventDevelopment {
  kind: "origin" | "official" | "discussion" | "response";
  evidence: PublicEvidence;
}

export interface EventYearGroup {
  year: number;
  months: Array<{
    key: string;
    year: number;
    month: number;
    events: EnrichedEvent[];
  }>;
}

export type TimelineMonthItem =
  | { kind: "event"; event: EnrichedEvent }
  | { kind: "research-day"; key: string; events: EnrichedEvent[] };

export interface MonthlyEventDensity {
  key: string;
  count: number;
  target: number;
  status: "balanced" | "gap" | "in-progress";
}

export interface ResearchBatchDay {
  day: string;
  count: number;
  status: "published" | "weekend" | "waiting";
}

interface CoverageDefinition {
  slug: string;
  name: string;
  description: string;
  terms: string[];
  expectedChannels: string[];
  nextAction: string;
}

export const coverageDefinitions: CoverageDefinition[] = [
  {
    slug: "claude-code",
    name: "Claude Code",
    description: "产品更新、Hooks、Sub Agents、SDK、Memory、Context Compression 与企业实践",
    terms: ["claude code", "claude-code", "anthropic"],
    expectedChannels: ["official", "releases", "sdk", "research", "community"],
    nextAction: "补强 Anthropic 官方工程内容、Claude Code 文档变更与高质量社区实践。",
  },
  {
    slug: "openai-codex",
    name: "OpenAI / Codex",
    description: "模型、Codex、SDK、Agent 平台、企业能力与开发者生态",
    terms: ["openai", "codex"],
    expectedChannels: ["official", "releases", "sdk", "research", "enterprise"],
    nextAction: "持续核验 Codex、Agents SDK、模型与企业产品是否形成独立更新链路。",
  },
  {
    slug: "google-deepmind",
    name: "Google DeepMind",
    description: "前沿研究、Gemini 能力、Agent 开发栈与产品落地",
    terms: ["deepmind", "google ai", "google research", "google developers", "gemini"],
    expectedChannels: ["official", "research", "sdk", "enterprise"],
    nextAction: "补齐 Gemini 产品、Google ADK 与研究成果之间的事件关联。",
  },
  {
    slug: "cursor",
    name: "Cursor",
    description: "编辑器能力、Agent 工作流、企业功能与产品迭代",
    terms: ["cursor"],
    expectedChannels: ["official", "community", "enterprise"],
    nextAction: "修复 Changelog 解析，并补充可验证的官方发布或稳定 feed。",
  },
  {
    slug: "windsurf",
    name: "Windsurf",
    description: "编辑器、Agent 能力、企业功能与生态变化",
    terms: ["windsurf"],
    expectedChannels: ["official", "community", "enterprise"],
    nextAction: "修复官方更新页解析，避免只保留目录而没有持续信号。",
  },
  {
    slug: "lovable",
    name: "Lovable",
    description: "AI 应用构建、Agent 能力、平台集成、商业化与企业治理",
    terms: ["lovable"],
    expectedChannels: ["official", "community", "enterprise"],
    nextAction: "观察官方 Changelog 的稳定性，并补充独立社区与企业采用信号。",
  },
  {
    slug: "vercel-ai",
    name: "Vercel AI",
    description: "AI SDK、前端 Agent 体验、流式交互与应用基础设施",
    terms: ["vercel ai", "vercel-ai", "vercel ai sdk"],
    expectedChannels: ["releases", "sdk", "community"],
    nextAction: "补充 Vercel 官方工程文章和生产实践，而不只追踪 SDK release。",
  },
  {
    slug: "cloudflare-ai",
    name: "Cloudflare AI",
    description: "Workers AI、边缘推理、AI Gateway、Browser 与 Agent 基础设施",
    terms: ["cloudflare ai", "cloudflare-ai", "workers ai"],
    expectedChannels: ["official", "enterprise", "community"],
    nextAction: "持续区分 Cloudflare 通用更新与真正改变 AI 工程边界的变化。",
  },
  {
    slug: "mcp",
    name: "MCP",
    description: "规范、SDK、生态集成、安全边界与企业采用",
    terms: ["model context protocol", "mcp-", "mcp ", "mcp,"],
    expectedChannels: ["releases", "sdk", "community", "enterprise"],
    nextAction: "补齐规范变更、生态采用与安全事件，不把 SDK patch 当成全部生态。",
  },
  {
    slug: "a2a",
    name: "A2A",
    description: "Agent2Agent 规范、SDK、互操作性与企业采用",
    terms: ["agent2agent", "a2aproject", "a2a protocol", "a2a-"],
    expectedChannels: ["releases", "sdk", "community", "enterprise"],
    nextAction: "从规范 release 起步，继续补充 SDK 兼容性和真实互操作案例。",
  },
  {
    slug: "browser-use",
    name: "Browser Use",
    description: "浏览器 Agent、可靠性、安全、评测与生产部署",
    terms: ["browser use", "browser-use"],
    expectedChannels: ["releases", "community", "enterprise"],
    nextAction: "补充浏览器 Agent 评测、安全和真实生产反馈。",
  },
  {
    slug: "ai-coding",
    name: "AI Coding",
    description: "编码 Agent、IDE、代码审查、长任务、记忆与工程工作流",
    terms: ["coding", "code agent", "coding-agent", "developer tool", "copilot"],
    expectedChannels: ["official", "releases", "research", "community", "enterprise"],
    nextAction: "提高产品更新、真实工程实践和独立评测之间的交叉验证。",
  },
  {
    slug: "ai-infra",
    name: "AI Infra",
    description: "训练、推理、芯片、编译、可观测性与云基础设施",
    terms: ["infra", "inference", "serving", "gpu", "observability", "cloud"],
    expectedChannels: ["official", "releases", "research", "enterprise"],
    nextAction: "减少 release 数量造成的虚假宽度，补充成本、采用与性能证据。",
  },
  {
    slug: "ai-agent",
    name: "AI Agent",
    description: "Agent 框架、长期运行、记忆、工具调用、评测与商业落地",
    terms: ["agent", "multi-agent", "workflow"],
    expectedChannels: ["official", "releases", "sdk", "research", "community", "enterprise"],
    nextAction: "把框架 release、研究突破、生产采用和商业结果收敛到同一证据链。",
  },
];

export function sortEventsByLatestDevelopment(events: EnrichedEvent[]): EnrichedEvent[] {
  return [...events].sort(
    (left, right) => latestDevelopmentTime(right) - latestDevelopmentTime(left),
  );
}

export function latestDevelopmentAt(event: EnrichedEvent): string {
  return new Date(latestDevelopmentTime(event)).toISOString();
}

export function isRecentEvent(
  event: EnrichedEvent,
  referenceAt = new Date().toISOString(),
  windowDays = 7,
): boolean {
  const delta = Date.parse(referenceAt) - Date.parse(latestDevelopmentAt(event));
  return Number.isFinite(delta) && delta >= 0 && delta <= windowDays * 86_400_000;
}

export function recentMonthlyDensity(
  events: EnrichedEvent[],
  referenceAt: string,
  months = 3,
  target = 6,
): MonthlyEventDensity[] {
  const reference = new Date(referenceAt);
  return Array.from({ length: months }, (_, offset) => {
    const date = new Date(
      Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() - offset, 1),
    );
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    const count = events.filter((event) => latestDevelopmentAt(event).startsWith(key)).length;
    return {
      key,
      count,
      target,
      status: offset === 0 ? "in-progress" : count >= target ? "balanced" : "gap",
    };
  });
}

export function recentResearchBatches(
  events: EnrichedEvent[],
  referenceAt: string,
  days = 3,
): ResearchBatchDay[] {
  const arxivEvents = events.filter(
    (event) =>
      isResearch(event) &&
      event.evidence.some((evidence) => {
        try {
          return new URL(evidence.url).hostname === "arxiv.org";
        } catch {
          return false;
        }
      }),
  );
  const reference = new Date(referenceAt);
  return Array.from({ length: days }, (_, offset) => {
    const date = new Date(reference.getTime() - offset * 86_400_000);
    const day = date.toISOString().slice(0, 10);
    const count = arxivEvents.filter((event) => latestDevelopmentAt(event).startsWith(day)).length;
    const weekday = date.getUTCDay();
    return {
      day,
      count,
      status: count > 0 ? "published" : weekday === 0 || weekday === 6 ? "weekend" : "waiting",
    };
  });
}

export function groupEventsByYearMonth(events: EnrichedEvent[]): EventYearGroup[] {
  const years = new Map<number, Map<number, EnrichedEvent[]>>();
  for (const event of sortEventsByLatestDevelopment(events)) {
    const date = new Date(latestDevelopmentAt(event));
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const months = years.get(year) ?? new Map<number, EnrichedEvent[]>();
    const items = months.get(month) ?? [];
    items.push(event);
    months.set(month, items);
    years.set(year, months);
  }
  return [...years.entries()]
    .sort(([left], [right]) => right - left)
    .map(([year, months]) => ({
      year,
      months: [...months.entries()]
        .sort(([left], [right]) => right - left)
        .map(([month, items]) => ({
          key: `${year}-${String(month).padStart(2, "0")}`,
          year,
          month,
          events: items,
        })),
    }));
}

export function groupTimelineMonthItems(
  events: EnrichedEvent[],
  researchThreshold = 4,
): TimelineMonthItem[] {
  const researchByDay = new Map<string, EnrichedEvent[]>();
  for (const event of events) {
    if (!["research", "paper"].includes(event.category.toLowerCase())) continue;
    const day = latestDevelopmentAt(event).slice(0, 10);
    const items = researchByDay.get(day) ?? [];
    items.push(event);
    researchByDay.set(day, items);
  }

  const emittedDays = new Set<string>();
  const items: TimelineMonthItem[] = [];
  for (const event of events) {
    const isResearch = ["research", "paper"].includes(event.category.toLowerCase());
    const day = latestDevelopmentAt(event).slice(0, 10);
    const research = researchByDay.get(day) ?? [];
    if (isResearch && research.length >= researchThreshold) {
      if (emittedDays.has(day)) continue;
      emittedDays.add(day);
      items.push({ kind: "research-day", key: day, events: research });
    } else {
      items.push({ kind: "event", event });
    }
  }
  return items;
}

function isResearch(event: EnrichedEvent): boolean {
  return ["research", "paper"].includes(event.category.toLowerCase());
}

export function eventDevelopments(event: EnrichedEvent): EventDevelopment[] {
  const seen = new Set<string>();
  return [...event.evidence]
    .filter((evidence) => {
      const key = `${evidence.url.trim().toLowerCase()}|${evidence.title.trim().toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((left, right) => toTime(left.publishedAt) - toTime(right.publishedAt))
    .map((evidence, index) => ({
      kind:
        index === 0
          ? "origin"
          : evidence.role === "primary"
            ? "official"
            : evidence.role === "amplification"
              ? "discussion"
              : "response",
      evidence,
    }));
}

export function analyzeTechnologyCoverage(sources: PublicSource[]): TechnologyCoverage[] {
  return coverageDefinitions.map((definition) => {
    const matches = sources.filter((source) => sourceMatches(source, definition.terms));
    const healthySources = matches.filter((source) => source.healthStatus === "healthy").length;
    const checked = matches.filter((source) => source.healthStatus !== "unchecked");
    const channels = [...new Set(matches.flatMap(sourceChannels))];
    const missingChannels = definition.expectedChannels.filter(
      (channel) => !channels.includes(channel),
    );
    const status = coverageStatus(
      matches,
      healthySources,
      checked.length,
      channels.length,
      missingChannels.length,
    );
    return {
      slug: definition.slug,
      name: definition.name,
      description: definition.description,
      status,
      sources: matches,
      healthySources,
      activeSources: matches.filter((source) => source.lifecycle === "active").length,
      observingSources: matches.filter((source) => source.observationEnabled).length,
      channels,
      missingChannels,
      nextAction: definition.nextAction,
    };
  });
}

function latestDevelopmentTime(event: EnrichedEvent): number {
  return Math.max(
    toTime(event.happenedAt),
    ...event.evidence.map((evidence) => toTime(evidence.publishedAt)),
  );
}

function toTime(value: string): number {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function sourceMatches(source: PublicSource, terms: string[]): boolean {
  const haystack = [source.slug, source.name, source.category, ...source.topics]
    .join(" ")
    .toLowerCase();
  return terms.some((term) => haystack.includes(term));
}

function sourceChannels(source: PublicSource): string[] {
  const channels: string[] = [];
  if (source.role === "primary" && source.acquisition !== "github") channels.push("official");
  if (source.acquisition === "github") channels.push("releases");
  if (source.role === "research" || source.category === "research-eval") channels.push("research");
  if (["expert", "media", "heat"].includes(source.role) || source.category === "community-heat")
    channels.push("community");
  if (source.topics.some((topic) => ["sdk", "protocol", "developer"].includes(topic)))
    channels.push("sdk");
  if (source.topics.includes("enterprise")) channels.push("enterprise");
  return channels;
}

function coverageStatus(
  matches: PublicSource[],
  healthy: number,
  checked: number,
  channels: number,
  missingChannels: number,
): TechnologyCoverage["status"] {
  if (!matches.length) return "gap";
  if (!checked) return "unchecked";
  if (!healthy) return "gap";
  if (healthy >= 2 && channels >= 2 && missingChannels === 0) return "covered";
  return "watch";
}
