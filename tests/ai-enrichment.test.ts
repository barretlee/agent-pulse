import { afterEach, describe, expect, it } from "vitest";
import type { JsonModelClient } from "../src/ai/deepseek.js";
import { loadConfig } from "../src/config/env.js";
import { createDatabase } from "../src/db/database.js";
import { migrateToLatest } from "../src/db/migrate.js";
import { seedDatabase } from "../src/db/seed.js";
import { enrichReviewEvents } from "../src/pipeline/ai-enrichment.js";
import { evaluateEventReadiness } from "../src/pipeline/readiness.js";

const databases: ReturnType<typeof createDatabase>[] = [];

afterEach(async () => {
  while (databases.length) await databases.pop()?.destroy();
});

async function database() {
  const config = loadConfig({ NODE_ENV: "test", DATABASE_URL: "sqlite::memory:" });
  const db = createDatabase(config);
  databases.push(db);
  await migrateToLatest(db, config);
  await seedDatabase(db);
  return db;
}

function validClient(): JsonModelClient {
  return {
    async completeJson(request) {
      const input = JSON.parse(request.user);
      return {
        model: "deepseek-v4-flash",
        usage: { promptTokens: 120, completionTokens: 180, totalTokens: 300 },
        value: {
          factSummary:
            "OpenAI published an official model update and documented the supported product workflow.",
          summary:
            "The official release connects the model update with a bounded product workflow and public technical documentation.",
          technicalInsight:
            "The release moves more task state into the model workflow while keeping tool execution behind explicit product controls.",
          industryInsight:
            "Competition may shift from isolated model access toward reliable task execution, distribution and governance.",
          futureOutlook:
            "Verify independent completion rates, task cost, permission controls and recovery from interrupted runs.",
          businessValue:
            "Teams should test one reversible workflow with explicit success, cost and human takeover thresholds before expanding.",
          company: "OpenAI",
          category: "model-release",
          keywords: ["OpenAI", "model release", "agent workflow"],
          trackSlugs: [input.availableTracks[0].slug],
          usedEvidenceUrls: [input.evidence[0].url],
        },
      };
    },
  };
}

describe("AI event enrichment", () => {
  it("updates an evidence-ready review Event and lets deterministic readiness decide", async () => {
    const db = await database();
    const event = await db
      .selectFrom("events")
      .selectAll()
      .where("slug", "=", "gemma-4-open-model-efficiency")
      .executeTakeFirstOrThrow();
    await db
      .updateTable("events")
      .set({
        status: "review",
        published_at: null,
        manual_override: 0,
        technical_insight: "待编辑：技术判断",
        industry_insight: "待编辑：行业判断",
        future_outlook: "待编辑：未来判断",
        business_value: "待编辑：业务判断",
      })
      .where("id", "=", event.id)
      .execute();

    const report = await enrichReviewEvents(db, validClient(), { maxEvents: 1 });

    expect(report).toMatchObject({ candidates: 1, attempted: 1, succeeded: 1, readyAfter: 1 });
    expect(report.usage.totalTokens).toBe(300);
    const updated = await db
      .selectFrom("events")
      .select(["status", "company", "category", "technical_insight"])
      .where("id", "=", event.id)
      .executeTakeFirstOrThrow();
    expect(updated).toMatchObject({
      status: "review",
      company: "OpenAI",
      category: "model-release",
    });
    expect(updated.technical_insight).not.toContain("待编辑");
    expect((await evaluateEventReadiness(db, event.id)).status).toBe("ready");
  });

  it("does not send low-confidence or evidence-ineligible Events to the model", async () => {
    const db = await database();
    const event = await db
      .selectFrom("events")
      .select("id")
      .where("slug", "=", "gemma-4-open-model-efficiency")
      .executeTakeFirstOrThrow();
    await db
      .updateTable("events")
      .set({
        status: "review",
        published_at: null,
        manual_override: 0,
        confidence_score: 10,
        technical_insight: "待编辑：技术判断",
      })
      .where("id", "=", event.id)
      .execute();
    let called = false;

    const report = await enrichReviewEvents(
      db,
      {
        async completeJson() {
          called = true;
          throw new Error("must_not_call");
        },
      },
      { maxEvents: 1 },
    );

    expect(report.candidates).toBe(0);
    expect(called).toBe(false);
  });

  it("rejects unknown Evidence URLs without partially updating the Event", async () => {
    const db = await database();
    const event = await db
      .selectFrom("events")
      .selectAll()
      .where("slug", "=", "gemma-4-open-model-efficiency")
      .executeTakeFirstOrThrow();
    await db
      .updateTable("events")
      .set({
        status: "review",
        published_at: null,
        manual_override: 0,
        technical_insight: "待编辑：技术判断",
      })
      .where("id", "=", event.id)
      .execute();
    const client = validClient();
    const invalid: JsonModelClient = {
      async completeJson(request) {
        const result = await client.completeJson(request);
        return {
          ...result,
          value: { ...(result.value as object), usedEvidenceUrls: ["https://invalid.example/"] },
        };
      },
    };

    const report = await enrichReviewEvents(db, invalid, { maxEvents: 1 });

    expect(report).toMatchObject({ candidates: 1, succeeded: 0 });
    expect(report.failures[0]?.code).toBe("unknown_evidence_url");
    const updated = await db
      .selectFrom("events")
      .select("technical_insight")
      .where("id", "=", event.id)
      .executeTakeFirstOrThrow();
    expect(updated.technical_insight).toContain("待编辑");
  });
});
