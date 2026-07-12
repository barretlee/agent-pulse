import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "../src/config/env.js";
import { createDatabase } from "../src/db/database.js";
import { migrateToLatest } from "../src/db/migrate.js";
import { Repository } from "../src/db/repository.js";
import { seedDatabase } from "../src/db/seed.js";
import { observationEligibility, setObservationMode } from "../src/pipeline/observation.js";
import { auditSources } from "../src/pipeline/source-audit.js";

const databases: ReturnType<typeof createDatabase>[] = [];

afterEach(async () => {
  while (databases.length) await databases.pop()?.destroy();
});

describe("shadow observation mode", () => {
  it("enables scheduled collection only after a healthy content-bearing check", async () => {
    const config = loadConfig({ NODE_ENV: "test", DATABASE_URL: "sqlite::memory:" });
    const db = createDatabase(config);
    databases.push(db);
    await migrateToLatest(db, config);
    await seedDatabase(db);
    const repository = new Repository(db);
    const source = (await repository.listSources()).find((item) => item.slug === "apple-ml");
    expect(source?.lifecycle_status).toBe("shadow");

    await expect(setObservationMode(db, source?.id ?? "missing", true)).rejects.toThrow(
      "missing_check",
    );
    await auditSources(
      db,
      config,
      { sourceId: source?.id ?? "missing" },
      {
        adapterFor: () => ({
          kind: "fixture",
          collect: async () => [
            {
              url: "https://machinelearning.apple.com/research/fixture",
              title: "Apple releases a verified fixture model",
              summary:
                "A detailed official research release used to prove shadow observation eligibility.",
              language: "en",
              publishedAt: "2026-07-12T00:00:00.000Z",
              category: "model-release",
              tags: ["model", "release", "research"],
              metrics: {},
              rawMeta: {},
            },
          ],
        }),
      },
    );

    const eligible = (await observationEligibility(db)).find(
      (item) => item.sourceId === source?.id,
    );
    expect(eligible).toMatchObject({ eligible: true, latestStatus: "healthy", itemCount: 1 });
    await setObservationMode(db, source?.id ?? "missing", true);
    expect((await repository.getSource(source?.id ?? "missing"))?.observation_enabled).toBe(1);
    expect((await repository.getEnabledSources()).some((item) => item.id === source?.id)).toBe(
      true,
    );
  });
});
