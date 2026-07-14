import { describe, expect, it, vi } from "vitest";
import type { JsonModelClient } from "../src/ai/deepseek.js";
import type { ScoreFactors } from "../src/domain/types.js";
import {
  applyStagePromotion,
  evaluateStagePromotion,
  mergeStagePromotions,
  parseStagePromotionCandidate,
  renderStagePromotionIssue,
  STAGE_PROMOTION_MODEL,
  type StagePromotionFile,
  type StagePromotionInput,
  selectStagePromotionCandidate,
} from "../src/pipeline/stage-promotion.js";
import type {
  EnrichedEvent,
  IndustryNarratives,
  TrackNarrative,
} from "../src/pipeline/static-site/dto.js";

const EMPTY_FILE: StagePromotionFile = { schemaVersion: 1, promotions: [] };

describe("major narrative stage promotion", () => {
  it("does not nominate an ordinary or single-source Event", () => {
    const ordinary = event({ impactScore: 97 });
    const singleSource = event({
      slug: "single-source",
      evidence: [evidence("Lab A", "https://lab-a.example/release")],
    });

    expect(
      selectStagePromotionCandidate(
        [ordinary, singleSource],
        sources(),
        narratives(),
        EMPTY_FILE,
        "2026-07-14T12:00:00.000Z",
      ),
    ).toBeNull();
  });

  it("selects one recent high-impact milestone with independent Tier 1 evidence", () => {
    const lowerPriority = event({ slug: "lower", impactScore: 98, confidenceScore: 92 });
    const anchor = event({ slug: "anchor", impactScore: 100, confidenceScore: 99 });

    const selected = selectStagePromotionCandidate(
      [lowerPriority, anchor],
      sources(),
      narratives(),
      EMPTY_FILE,
      "2026-07-14T12:00:00.000Z",
    );

    expect(selected?.anchor.slug).toBe("anchor");
    expect(selected?.track).toMatchObject({ slug: "agi-progress", name: "Agent 与软件重构" });
    expect(new Set(selected?.evidence.map((item) => item.sourceSlug))).toEqual(
      new Set(["lab-a", "research-b"]),
    );
  });

  it("does not call V4 Pro when the deterministic gate has no candidate", async () => {
    const completeJson = vi.fn();
    const input = selectStagePromotionCandidate(
      [event({ impactScore: 70 })],
      sources(),
      narratives(),
      EMPTY_FILE,
      "2026-07-14T12:00:00.000Z",
    );

    if (input) await evaluateStagePromotion({ completeJson }, input);

    expect(input).toBeNull();
    expect(completeJson).not.toHaveBeenCalled();
  });

  it("uses V4 Pro high-effort thinking and honors a hold verdict", async () => {
    const input = promotionInput();
    const completeJson = vi.fn(async (_request) => ({
      model: STAGE_PROMOTION_MODEL,
      usage: { promptTokens: 100, completionTokens: 40, totalTokens: 140 },
      value: {
        decision: "hold",
        reason:
          "The event is important but the existing stage still explains the observed capability and market response.",
        counterSignals: [
          "Independent production evidence has not yet shown a durable change in task completion.",
        ],
      },
    }));

    const result = await evaluateStagePromotion({ completeJson }, input);

    expect(completeJson).toHaveBeenCalledWith(
      expect.objectContaining({
        thinking: true,
        reasoningEffort: "high",
        temperature: 0,
        maxTokens: 3_200,
      }),
    );
    expect(result).toMatchObject({ report: { status: "held" }, candidate: null });
  });

  it("accepts a fully grounded promote verdict and rejects unknown evidence", async () => {
    const input = promotionInput();
    const valid = clientWithVerdict(promoteVerdict(input));

    const result = await evaluateStagePromotion(valid, input);

    expect(result.report.status).toBe("candidate");
    expect(result.candidate).toMatchObject({
      trackSlug: "agi-progress",
      anchorEventSlug: "anchor",
      confidence: 97,
      model: STAGE_PROMOTION_MODEL,
    });
    const invalid = promoteVerdict(input);
    invalid.usedEvidenceUrls = ["https://lab-a.example/release", "https://unknown.example/report"];
    await expect(evaluateStagePromotion(clientWithVerdict(invalid), input)).rejects.toThrow(
      "unknown_stage_evidence_url",
    );
  });

  it("requires an Issue backlink, applies idempotently and opens a new timeline stage", async () => {
    const input = promotionInput();
    const candidate = (
      await evaluateStagePromotion(clientWithVerdict(promoteVerdict(input)), input)
    ).candidate;
    if (!candidate) throw new Error("candidate fixture missing");
    expect(() =>
      applyStagePromotion(EMPTY_FILE, candidate, {
        number: 42,
        url: "https://example.com/issues/42",
      }),
    ).toThrow("invalid_stage_issue_url");
    expect(() =>
      applyStagePromotion(EMPTY_FILE, candidate, {
        number: 42,
        url: "https://github.com/another/repository/issues/42",
      }),
    ).toThrow("stage_issue_number_mismatch");

    const applied = applyStagePromotion(
      EMPTY_FILE,
      candidate,
      { number: 42, url: "https://github.com/barretlee/agent-pulse/issues/42" },
      "2026-07-14T12:00:00.000Z",
    );
    expect(applied.changed).toBe(true);
    const repeated = applyStagePromotion(
      applied.file,
      candidate,
      { number: 42, url: "https://github.com/barretlee/agent-pulse/issues/42" },
      "2026-07-14T12:01:00.000Z",
    );
    expect(repeated.changed).toBe(false);

    const merged = mergeStagePromotions(narratives(), applied.file);
    const track = merged.tracks[0];
    expect(track?.stages).toHaveLength(2);
    expect(track?.stages[0]?.end).toBe("2026-07-09");
    expect(track?.stages[1]).toMatchObject({ start: "2026-07-10", end: "9999-12-31" });
    expect(track?.now).toBe(candidate.trackNow);
    expect(merged.horizon.end).toBe("2026-07-10");
  });

  it("rejects a candidate whose marker or evidence-to-Event mapping was tampered with", async () => {
    const input = promotionInput();
    const candidate = (
      await evaluateStagePromotion(clientWithVerdict(promoteVerdict(input)), input)
    ).candidate;
    if (!candidate) throw new Error("candidate fixture missing");

    expect(() =>
      parseStagePromotionCandidate({
        ...candidate,
        marker: "agent-pulse-stage-promotion:0000000000000000",
      }),
    ).toThrow("stage_marker_id_mismatch");
    expect(() =>
      parseStagePromotionCandidate({
        ...candidate,
        id: "0000000000000000",
        marker: "agent-pulse-stage-promotion:0000000000000000",
      }),
    ).toThrow("stage_promotion_id_mismatch");
    expect(() =>
      parseStagePromotionCandidate({
        ...candidate,
        usedEvidence: candidate.usedEvidence.map((item, index) =>
          index === 0 ? { ...item, eventSlug: "unselected-event" } : item,
        ),
      }),
    ).toThrow("stage_evidence_event_not_selected");
    expect(() =>
      parseStagePromotionCandidate({
        ...candidate,
        stage: { ...candidate.stage, label: `${candidate.stage.label}\n# injected heading` },
      }),
    ).toThrow();
  });

  it("renders one detailed and escaped milestone Issue", async () => {
    const input = promotionInput();
    const candidate = (
      await evaluateStagePromotion(clientWithVerdict(promoteVerdict(input)), input)
    ).candidate;
    if (!candidate) throw new Error("candidate fixture missing");
    const issue = renderStagePromotionIssue(
      { ...candidate, anchorEventTitle: "Major [Agent] shift" },
      "https://github.com/barretlee/agent-pulse/actions/runs/123",
    );

    expect(issue.title).toContain("[Stage]");
    expect(issue.body).toContain(`<!-- ${candidate.marker} -->`);
    expect(issue.body).toContain("Major \\[Agent\\] shift");
    expect(issue.body).toContain("为什么需要新阶段");
    expect(issue.body).toContain("Evidence 与 Source");
    expect(issue.body).toContain("中国位置");
    expect(issue.body).toContain("| Event | Evidence | Source | Date | Link |");
    expect(issue.body).toContain("actions/runs/123");
  });
});

function promotionInput(): StagePromotionInput {
  const anchor = event({ slug: "anchor", impactScore: 100, confidenceScore: 99 });
  const selected = selectStagePromotionCandidate(
    [anchor],
    sources(),
    narratives(),
    EMPTY_FILE,
    "2026-07-14T12:00:00.000Z",
  );
  if (!selected) throw new Error("eligible fixture missing");
  return selected;
}

function promoteVerdict(input: StagePromotionInput) {
  return {
    decision: "promote" as const,
    trackSlug: input.track.slug,
    sourceEventSlugs: [input.anchor.slug],
    usedEvidenceUrls: input.evidence.map((item) => item.url),
    stage: {
      start: "2026-07-10",
      end: "9999-12-31" as const,
      period: "2026-07—未来",
      label: "可验证的长期自主执行",
      summary:
        "重大公开事件把 Agent 从受控演示推进到可验证的长期任务执行，并形成新的产品与工程边界。",
      interpretation:
        "旧阶段主要解释工具接入和单次任务，本次变化要求用持续任务完成率、失败恢复能力、权限治理与单位成功任务成本来重新定义竞争边界。",
      chinaPosition: "中国团队需要在开放模型、工程效率和本地工作流中验证同等级的长期执行能力。",
      nextSignal:
        "观察独立评测中的长任务完成率、人工接管频率、单位任务成本和权限事故是否持续改善。",
    },
    trackNow: "Agent 竞争进入可验证的长期自主执行阶段，可靠性、恢复和权限治理成为能力的一部分。",
    trackNext:
      "下一步验证跨天任务、真实组织权限、人工接管率和单位成功任务成本能否稳定达到生产要求。",
    impactStatement:
      "这会改变软件入口、团队分工和 Agent 公司的估值方法，决策者需要从功能演示转向任务结果和治理证据。",
    previousStageGap:
      "现有阶段能够解释工具调用和单流程自动化，但无法解释长期状态、失败恢复和组织级权限开始同时成为产品门槛。",
    counterSignals: ["如果独立测试仍显示长任务成功率低且人工接管没有下降，则该阶段判断失效。"],
    confidence: 97,
  };
}

function clientWithVerdict(value: ReturnType<typeof promoteVerdict>): JsonModelClient {
  return {
    async completeJson() {
      return {
        model: STAGE_PROMOTION_MODEL,
        usage: { promptTokens: 200, completionTokens: 300, totalTokens: 500 },
        value,
      };
    },
  };
}

function narratives(): IndustryNarratives {
  const track: TrackNarrative = {
    slug: "agi-progress",
    thesis: "Agent 从回答问题进入可靠执行。",
    now: "Agent 正在进入受控工具调用和单流程自动化。",
    next: "观察可靠性、治理和真实任务完成。",
    stages: [
      {
        start: "2026-01-01",
        end: "9999-12-31",
        period: "2026 H1",
        label: "工具接入与受控执行",
        summary: "Agent 开始进入浏览器、代码和企业工具，但仍依赖较多人工接管。",
        interpretation: "工具调用形成产品能力，但可靠性不足以支撑长期自治。",
        chinaPosition: "中国团队在编码和企业流程中快速验证 Agent 产品。",
        nextSignal: "观察长任务成功率、恢复能力和权限治理。",
      },
    ],
    lenses: [],
  };
  return {
    horizon: { start: "2022-08-22", end: "2026-01-01", label: "2022—今天" },
    eras: [],
    tracks: [track],
  };
}

function event(overrides: Partial<EnrichedEvent> = {}): EnrichedEvent {
  return {
    id: overrides.slug ?? "anchor-id",
    slug: "anchor",
    title: "A major Agent milestone changes long-running task execution",
    factSummary: "Two independent sources document a major change in long-running task execution.",
    summary: "The release changes how Agent systems execute and recover from long-running tasks.",
    technicalInsight:
      "Long-running state, recovery and permissions become first-class system behavior.",
    industryInsight:
      "Competition shifts from demos toward reliable task completion and governance.",
    futureOutlook:
      "Independent production evidence must validate the claimed reliability improvement.",
    businessValue: "Teams should measure successful task outcomes, takeover frequency and cost.",
    category: "agent-milestone",
    company: "Lab A",
    keywords: ["agent", "long task", "reliability"],
    confidenceScore: 99,
    heatScore: 90,
    impactScore: 100,
    valueScore: 95,
    scoreFactors: scoreFactors(),
    featured: true,
    happenedAt: "2026-07-10T00:00:00.000Z",
    publishedAt: "2026-07-10T02:00:00.000Z",
    evidence: [
      evidence("Lab A", "https://lab-a.example/release"),
      evidence("Research B", "https://research-b.example/report"),
    ],
    tracks: [
      {
        slug: "agi-progress",
        name: "Agent 与软件重构",
        color: "#000000",
        icon: "agent",
        role: "milestone",
        narrative: "Major milestone",
        stage: "current",
        orderIndex: 0,
      },
    ],
    actors: [],
    ...overrides,
  };
}

function evidence(source: string, url: string) {
  return {
    title: `${source} primary evidence`,
    source,
    role: "primary",
    url,
    publishedAt: "2026-07-10T01:00:00.000Z",
  };
}

function sources() {
  return [
    { slug: "lab-a", name: "Lab A", tier: 1, role: "primary" },
    { slug: "research-b", name: "Research B", tier: 2, role: "research" },
  ];
}

function scoreFactors(): ScoreFactors {
  return {
    authority: 100,
    corroboration: 100,
    primaryEvidence: 100,
    uniqueAuthors: 2,
    independentSources: 2,
    platformBreadth: 2,
    regionBreadth: 2,
    velocity: 90,
    freshness: 100,
    crossRegion: true,
  };
}
