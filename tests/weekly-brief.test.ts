import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  renderAiWeeklyBrief,
  renderWeeklyBrief,
  weeklyBriefMarker,
} from "../src/cli/render-weekly-brief.js";

describe("weekly GitHub Issue brief", () => {
  it("groups the Shanghai ISO week and keeps public markdown safe", () => {
    const body = renderWeeklyBrief(
      {
        timeline: {
          generatedAt: "2026-07-19T13:20:00.000Z",
          events: [
            {
              slug: "weekly-event",
              title: "A | weekly <event>",
              happenedAt: "2026-07-13T03:00:00.000Z",
              category: "product",
              factSummary: "A verified fact",
              industryInsight: "This changes the workflow control point.",
              futureOutlook: "Watch retention and failure recovery.",
              impactScore: 88,
              valueScore: 84,
              evidence: [{ source: "Official Lab", publishedAt: "2026-07-13T03:00:00.000Z" }],
              tracks: [{ slug: "agi-progress", name: "Agent 与软件重构" }],
            },
            {
              slug: "old-event",
              title: "Old",
              happenedAt: "2026-07-05T03:00:00.000Z",
              category: "product",
              factSummary: "Old fact",
              industryInsight: "Old impact",
              futureOutlook: "Old watch",
            },
          ],
        },
        scout: {
          insights: [
            {
              title: "把「A weekly event」沉淀成一个可复用的数据或工具资产",
              hypothesis: "The task can be delegated safely.",
              suggestedAction: "Measure accepted outcomes for seven days.",
              counterSignals: "Manual takeover does not decline.",
              confidenceScore: 82,
              publishedAt: "2026-07-17T08:00:00.000Z",
            },
            {
              title: "围绕「A weekly event」发起一个 7 天内部验证",
              hypothesis: "A real workflow can expose the boundary.",
              suggestedAction: "Run one real workflow with a stop condition.",
              confidenceScore: 81,
              publishedAt: "2026-07-17T08:00:00.000Z",
            },
            {
              title: "从「A second event」验证一个窄而深的创业入口",
              hypothesis: "A narrow customer segment may pay for the result.",
              suggestedAction: "Interview five target users before building.",
              confidenceScore: 80,
              publishedAt: "2026-07-17T08:00:00.000Z",
            },
            {
              title: "围绕「A weekly event」建立一条可持续验证的公开观点",
              hypothesis: "Public correction can improve the claim.",
              suggestedAction: "Publish one evidence and counter-signal card.",
              confidenceScore: 79,
              publishedAt: "2026-07-17T08:00:00.000Z",
            },
          ],
        },
        product: {
          version: "0.8.1",
          evaluation: { overallScore: 83, evidenceCoverage: 91 },
          sourceCoverage: { total: 284, active: 18, observing: 31 },
        },
      },
      "2026-07-19",
    );

    expect(body).toContain(weeklyBriefMarker("2026-W29"));
    expect(body).toContain("A weekly event");
    expect(body).not.toContain("<event>");
    expect(body).not.toContain("Old fact");
    expect(body).toContain("Measure accepted outcomes for seven days.");
    expect(body).toContain("来源目录：284 个");
    expect(body).toContain("## 本周关键变化");
    expect(body).toContain("## 下周三件事");
    expect(body).toContain("<summary>数据与覆盖</summary>");
    expect(body).not.toContain("## 本周最值得深读");
    expect(body).not.toContain("· 0 个节点");
    expect(body.match(/^\d\. \*\*/gm)).toHaveLength(3);
    expect(body.split("## 下周三件事")[0]?.match(/A weekly event/g)).toHaveLength(1);
    expect(body.split("\n").length).toBeLessThan(70);
  });

  it("keeps the workflow idempotent and Sunday-gated", async () => {
    const workflow = await readFile(".github/workflows/data-refresh.yml", "utf8");
    expect(workflow).toContain('cron: "17 12 * * *"');
    expect(workflow).toContain("agent-pulse-weekly-brief");
    expect(workflow).toContain("weekly:issue");
    expect(workflow).toContain("--ai");
    expect(workflow).toContain("weekly-brief");
    expect(workflow).toContain('"$PUBLISH_WEEKLY" == "true"');
    expect(workflow).toContain('"$weekday" == "7"');
    expect(workflow).toContain('"$hour" -ge 20');
    expect(workflow).toContain('[[ -s "$RUNNER_TEMP/weekly-brief.md" ]]');
    expect(workflow).toContain("skipping the weekly Issue");
    expect(workflow).toContain("gh issue edit");
    expect(workflow).not.toContain("daily:issue");
    expect(workflow).not.toContain("agent-pulse-daily-brief");
  });

  it("renders a validated AI decision brief without trusting model Markdown", async () => {
    let completionCalls = 0;
    const result = await renderAiWeeklyBrief(
      {
        timeline: {
          generatedAt: "2026-07-19T13:20:00.000Z",
          events: [
            {
              slug: "weekly-event",
              title: "Official agent platform release",
              happenedAt: "2026-07-13T03:00:00.000Z",
              category: "agent-platform",
              factSummary: "The vendor released an agent platform with a public product page.",
              technicalInsight: "The platform joins tool execution and long-running task state.",
              industryInsight: "The control point is moving from model access to task execution.",
              futureOutlook: "Watch completion rate, cost and permission governance.",
              businessValue: "Teams should test one bounded workflow before changing their stack.",
              impactScore: 88,
              valueScore: 84,
              evidence: [
                {
                  title: "Official release",
                  source: "Official Lab",
                  role: "primary",
                  url: "https://example.com/release",
                  publishedAt: "2026-07-13T03:00:00.000Z",
                },
              ],
              tracks: [{ slug: "agi-progress", name: "Agent 与软件重构" }],
            },
          ],
        },
        scout: { insights: [] },
        product: {
          version: "0.10.0",
          evaluation: { overallScore: 60, evidenceCoverage: 70 },
          sourceCoverage: { total: 400, active: 10, observing: 100 },
        },
      },
      "2026-07-19",
      {
        async completeJson() {
          completionCalls += 1;
          const response = {
            model: "deepseek-v4-flash",
            usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
            value: {
              headline: "Agent 竞争正在从模型调用转向任务执行控制点，产品团队需要验证真实完成率。",
              executiveSummary:
                "本周的一手发布显示，厂商开始把工具调用、任务状态和工作流入口组合为统一平台。当前证据只能证明产品方向，尚不能证明采用率或成本优势。",
              thesisChanges: [
                {
                  eventSlug: "weekly-event",
                  whatChanged: "厂商发布了具备任务执行入口的 Agent 平台，并提供公开产品资料。",
                  whyItMatters:
                    "竞争边界可能从单次模型能力转向任务状态、权限和分发入口的组合控制。",
                  affected: "企业软件团队、自动化工具和垂直 Agent 产品。",
                  decisionImplication: "短期应比较端到端任务结果，而不是只比较模型榜单。",
                  nextSignal: "观察真实完成率、人工接管次数、权限事故和单任务总成本。",
                },
              ],
              decisionCards: [
                {
                  audience: "CEO / 业务负责人",
                  action: "选择一个高频但可回滚的流程进行结果验证。",
                  rationale: "目前只能确认产品方向，不能确认规模化业务回报。",
                  firstStep: "48 小时内定义成功率、成本和人工接管三个指标。",
                  stopCondition: "如果两轮测试后完成率没有提升或人工成本反而增加，则停止扩面。",
                  eventSlugs: ["weekly-event"],
                },
                {
                  audience: "技术负责人",
                  action: "建立权限、状态恢复和失败隔离的最小技术基线。",
                  rationale: "长任务能力会把可靠性和权限风险放大到完整流程。",
                  firstStep: "48 小时内完成一次断点恢复和越权失败演练。",
                  stopCondition: "完成一次演练后整理结论，并安排下一轮范围扩展。",
                  eventSlugs: ["weekly-event"],
                },
              ],
              uncertainties: [
                {
                  question: "平台是否真的提高复杂任务的端到端完成率？",
                  evidenceBoundary: "当前只有发布方产品说明，没有独立采用与成本数据。",
                  nextSignal: "等待客户案例、失败率、人工接管和单位任务成本数据。",
                  eventSlugs: ["weekly-event"],
                },
              ],
              watchlist: [
                {
                  item: "复杂任务完成率",
                  trigger: "出现可复现的独立任务集和连续运行结果。",
                  eventSlugs: ["weekly-event"],
                },
                {
                  item: "权限与恢复能力",
                  trigger: "出现企业权限模型、审计日志和失败恢复证据。",
                  eventSlugs: ["weekly-event"],
                },
              ],
            },
          };
          const firstChange = response.value.thesisChanges[0];
          if (completionCalls === 1 && firstChange) firstChange.eventSlug = "unknown-weekly-event";
          return response;
        },
      },
    );

    expect(result.body).toContain("## 给决策者的行动卡");
    expect(result.body).toContain("48 小时第一步");
    expect(result.body).toContain("停止条件");
    expect(result.body).toContain(
      "如果 7 天内无法观察到可量化改善，或风险与人工接管未下降，则停止扩面。",
    );
    expect(result.body).toContain("https://barretlee.github.io/agent-pulse/events/weekly-event/");
    expect(result.body).not.toContain("```json");
    expect(completionCalls).toBe(2);
    expect(result.repairAttempts).toBe(1);
    expect(result.usage.totalTokens).toBe(600);
  });

  it("does not render a weekly Issue when no public Event clears the gate", () => {
    const body = renderWeeklyBrief(
      {
        timeline: { events: [] },
        scout: { insights: [] },
        product: { sourceCoverage: { total: 284, active: 18, observing: 31 } },
      },
      "2026-07-19",
    );

    expect(body).toBe("");
  });

  it("bounds schema repair to one retry and still rejects an invalid draft", async () => {
    let completionCalls = 0;
    const render = renderAiWeeklyBrief(
      {
        timeline: {
          events: [
            {
              slug: "weekly-event",
              title: "Official release",
              happenedAt: "2026-07-13T03:00:00.000Z",
              category: "product",
              factSummary: "The vendor published a documented product release.",
              industryInsight: "The release may change the workflow control point.",
              futureOutlook: "Watch independent adoption and failure recovery.",
            },
          ],
        },
        scout: { insights: [] },
        product: {},
      },
      "2026-07-19",
      {
        async completeJson() {
          completionCalls += 1;
          return {
            model: "deepseek-v4-flash",
            usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
            value: {},
          };
        },
      },
    );

    await expect(render).rejects.toThrow("invalid_ai_weekly_schema_headline_invalid_type");
    expect(completionCalls).toBe(2);
  });
});
