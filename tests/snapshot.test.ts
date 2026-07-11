import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "../src/config/env.js";
import { createDatabase } from "../src/db/database.js";
import { migrateToLatest } from "../src/db/migrate.js";
import { Repository } from "../src/db/repository.js";
import { seedDatabase } from "../src/db/seed.js";
import { restoreRepositorySnapshot, writeRepositorySnapshot } from "../src/pipeline/snapshot.js";

const databases: ReturnType<typeof createDatabase>[] = [];

afterEach(async () => {
  while (databases.length) await databases.pop()?.destroy();
});

describe("repository data snapshot", () => {
  it("is deterministic, strips sensitive URL parameters and restores into a fresh database", async () => {
    const config = loadConfig({ NODE_ENV: "test", DATABASE_URL: "sqlite::memory:" });
    const sourceDb = createDatabase(config);
    databases.push(sourceDb);
    await migrateToLatest(sourceDb, config);
    await seedDatabase(sourceDb);
    const repository = new Repository(sourceDb);
    const openai = (await repository.listSources()).find((source) => source.slug === "openai");
    expect(openai).toBeDefined();
    await repository.insertSignal(openai?.id ?? "", {
      externalId: "snapshot-sensitive-url",
      url: "https://openai.com/index/snapshot-test?api_key=must-not-leak&utm_source=test",
      title: "Snapshot persistence test signal",
      summary: "A stable signal used to validate repository snapshot restore.",
      language: "en",
      publishedAt: "2026-07-11T08:00:00.000Z",
      category: "test",
      tags: ["snapshot"],
      metrics: { platforms: ["official"] },
      rawMeta: { ignored: true },
    });

    const root = await mkdtemp(join(tmpdir(), "agent-pulse-snapshot-"));
    const first = await writeRepositorySnapshot(sourceDb, root);
    const second = await writeRepositorySnapshot(sourceDb, root);
    expect(first.changed).toBe(true);
    expect(second).toMatchObject({ changed: false, sha256: first.sha256 });
    const serialized = await readFile(join(root, "data/snapshot/v1.json"), "utf8");
    expect(serialized).not.toContain("must-not-leak");
    expect(serialized).not.toContain("raw_meta_json");
    expect(serialized).not.toContain("/Users/");

    const targetDb = createDatabase(config);
    databases.push(targetDb);
    await migrateToLatest(targetDb, config);
    await seedDatabase(targetDb);
    const targetRepository = new Repository(targetDb);
    const targetOpenai = (await targetRepository.listSources()).find(
      (source) => source.slug === "openai",
    );
    const catalogSignal = await targetRepository.insertSignal(targetOpenai?.id ?? "", {
      externalId: "new-catalog-signal",
      url: "https://openai.com/index/new-catalog-signal",
      title: "New catalog signal added after the snapshot",
      summary: "Restore must merge rather than delete newer catalog evidence.",
      language: "en",
      publishedAt: "2026-07-12T08:00:00.000Z",
      category: "test",
      tags: ["catalog"],
      metrics: {},
      rawMeta: {},
    });
    const catalogEvent = (await targetRepository.listEvents())[0];
    expect(catalogEvent).toBeDefined();
    await targetRepository.attachSignal(
      catalogEvent?.id ?? "",
      catalogSignal?.id ?? "",
      "primary",
      100,
    );
    const restored = await restoreRepositorySnapshot(targetDb, root);
    expect(restored).toMatchObject({ restored: true, counts: first.counts });
    const restoredSignal = await targetDb
      .selectFrom("signals")
      .selectAll()
      .where("title", "=", "Snapshot persistence test signal")
      .executeTakeFirst();
    expect(restoredSignal?.canonical_url).toBe("https://openai.com/index/snapshot-test");
    expect(restoredSignal?.raw_meta_json).toBe("{}");
    expect(
      await targetDb
        .selectFrom("event_signals")
        .select("signal_id")
        .where("signal_id", "=", catalogSignal?.id ?? "")
        .executeTakeFirst(),
    ).toBeDefined();
  });
});
