import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "../src/config/env.js";
import { createDatabase } from "../src/db/database.js";
import { migrateToLatest } from "../src/db/migrate.js";
import { seedDatabase } from "../src/db/seed.js";
import { autoAdvanceScout, autoPublishReadyEvents } from "../src/pipeline/auto-publish.js";

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

describe("autonomous publication", () => {
  it("publishes ready events but leaves blocked events isolated", async () => {
    const db = await database();
    const ready = await db
      .selectFrom("events")
      .select("id")
      .where("slug", "=", "gemma-4-open-model-efficiency")
      .executeTakeFirstOrThrow();
    const blocked = await db
      .selectFrom("events")
      .select("id")
      .where("slug", "=", "gpt-5-6-agent-platform-shift")
      .executeTakeFirstOrThrow();
    await db
      .updateTable("events")
      .set({ status: "review", published_at: null })
      .where("id", "=", ready.id)
      .execute();
    await db
      .updateTable("events")
      .set({ status: "review", published_at: null, technical_insight: "待编辑：补充技术判断" })
      .where("id", "=", blocked.id)
      .execute();

    const result = await autoPublishReadyEvents(db);

    expect(result.published).toBeGreaterThanOrEqual(1);
    expect(
      await db.selectFrom("events").select("status").where("id", "=", ready.id).executeTakeFirst(),
    ).toEqual({ status: "published" });
    expect(
      await db
        .selectFrom("events")
        .select("status")
        .where("id", "=", blocked.id)
        .executeTakeFirst(),
    ).toEqual({ status: "review" });
  });

  it("publishes or archives old Scout inbox items without a human queue", async () => {
    const db = await database();
    const insight = await db.selectFrom("scout_insights").select("id").executeTakeFirstOrThrow();
    await db
      .updateTable("scout_insights")
      .set({ status: "inbox", published_at: null })
      .where("id", "=", insight.id)
      .execute();
    expect(await autoAdvanceScout(db)).toMatchObject({ published: 1, archived: 0 });

    await db
      .updateTable("scout_insights")
      .set({ status: "inbox", published_at: null, total_score: 20 })
      .where("id", "=", insight.id)
      .execute();
    expect(await autoAdvanceScout(db)).toMatchObject({ published: 0, archived: 1 });
  });

  it("keeps the Control Room free of manual publication decisions", async () => {
    const content = `${await readFile("web/admin/index.html", "utf8")}\n${await readFile("web/admin/admin.js", "utf8")}`;
    for (const forbidden of ["细看", "接受", "忽略", "编辑 / 发布", "确认继续", "window.confirm"]) {
      expect(content).not.toContain(forbidden);
    }
  });
});
