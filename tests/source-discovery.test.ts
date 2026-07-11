import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadConfig } from "../src/config/env.js";
import { createDatabase } from "../src/db/database.js";
import { migrateToLatest } from "../src/db/migrate.js";
import { Repository } from "../src/db/repository.js";
import type { SourceRow } from "../src/db/types.js";
import type { CollectedSignal } from "../src/domain/types.js";
import { collectSources } from "../src/pipeline/collect.js";

const databases: ReturnType<typeof createDatabase>[] = [];

afterEach(async () => {
  vi.unstubAllGlobals();
  while (databases.length) await databases.pop()?.destroy();
});

async function setup() {
  const config = loadConfig({ NODE_ENV: "test", DATABASE_URL: "sqlite::memory:" });
  const db = createDatabase(config);
  databases.push(db);
  await migrateToLatest(db, config);
  return { config, db, repository: new Repository(db) };
}

async function addSource(
  repository: Repository,
  patch: Partial<SourceRow> & Pick<SourceRow, "slug" | "name" | "homepage_url">,
) {
  const id = patch.id ?? randomUUID();
  await repository.saveSource({
    id,
    slug: patch.slug,
    name: patch.name,
    homepage_url: patch.homepage_url,
    adapter: patch.adapter ?? "rss",
    tier: patch.tier ?? 1,
    role: patch.role ?? "primary",
    region: patch.region ?? "GLOBAL",
    language: patch.language ?? "en",
    authority_score: patch.authority_score ?? 90,
    enabled: patch.enabled ?? 1,
    config_json: patch.config_json ?? JSON.stringify({ url: "https://example.com/feed", take: 10 }),
    state_json: "{}",
    last_collected_at: null,
    last_success_at: null,
    last_error: null,
    lifecycle_status: patch.lifecycle_status ?? "active",
    source_category: patch.source_category ?? "frontier-lab",
  });
  return (await repository.getSource(id)) as SourceRow;
}

function signal(patch: Partial<CollectedSignal> = {}): CollectedSignal {
  return {
    externalId: "release-1",
    url: "https://openai.com/index/release-1",
    title: "OpenAI launches Release One",
    summary: "A direct release announcement.",
    language: "en",
    publishedAt: "2026-07-11T08:00:00.000Z",
    category: "model",
    tags: ["model"],
    metrics: {},
    rawMeta: {},
    ...patch,
  };
}

describe("aggregator discovery persistence", () => {
  it("routes aggregator collection into discoveries and never creates a factual signal", async () => {
    const { config, db, repository } = await setup();
    const aggregator = await addSource(repository, {
      slug: "test-aggregator",
      name: "Test Aggregator",
      homepage_url: "https://example.com",
      adapter: "json-api",
      role: "aggregator",
      source_category: "aggregator",
      config_json: JSON.stringify({ url: "https://example.com/feed", take: 10 }),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(
          JSON.stringify([
            {
              id: "aggregated-1",
              url: "https://example.net/story",
              title: "Aggregated launch story",
              publishedAt: "2026-07-11T08:00:00.000Z",
            },
          ]),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    const result = await collectSources(db, config, aggregator.id);

    expect(result).toMatchObject({ collected: 1, created: 1 });
    expect(
      Number(
        (
          await db
            .selectFrom("signals")
            .select(({ fn }) => fn.countAll<number>().as("count"))
            .executeTakeFirstOrThrow()
        ).count,
      ),
    ).toBe(0);
    expect((await repository.listSourceDiscoveries())[0]).toMatchObject({
      aggregator: { slug: "test-aggregator" },
      status: "pending",
    });
    await expect(repository.insertSignal(aggregator.id, signal())).rejects.toThrow(
      "Aggregator sources cannot create factual signals",
    );
  });

  it("merges prior aggregator heat when the direct source publishes the canonical URL", async () => {
    const { db, repository } = await setup();
    const aggregator = await addSource(repository, {
      slug: "aihot-test",
      name: "AI HOT Test",
      homepage_url: "https://aggregator.example",
      role: "aggregator",
      source_category: "aggregator",
    });
    const direct = await addSource(repository, {
      slug: "openai",
      name: "OpenAI",
      homepage_url: "https://openai.com",
    });
    const item = signal({
      url: "https://aggregator.example/items/release-1",
      metrics: {
        tweets: 320,
        authors: 74,
        independentSources: 99,
        platforms: ["x"],
        regions: ["GLOBAL"],
      },
      origin: {
        url: "https://openai.com/index/release-1?utm_source=aggregator",
        discoveryUrl: "https://aggregator.example/items/release-1",
        name: "OpenAI",
        kind: "official",
      },
    });
    const saved = await repository.saveSourceDiscovery(aggregator.id, item);
    expect(saved.discovery).toMatchObject({
      status: "matched_source",
      matched_source_id: direct.id,
    });
    expect(await db.selectFrom("signals").selectAll().execute()).toHaveLength(0);

    const inserted = await repository.insertSignal(direct.id, signal());

    const metrics = JSON.parse(inserted?.metrics_json ?? "{}") as Record<string, unknown>;
    expect(metrics).toMatchObject({
      tweets: 320,
      authors: 74,
      platforms: ["x"],
      aggregatorHeat: { discoveryCount: 1, aggregatorSourceCount: 1 },
    });
    expect(metrics).not.toHaveProperty("independentSources");
    expect((await repository.listSourceDiscoveries())[0]).toMatchObject({
      status: "merged_signal",
      matchedSignalId: inserted?.id,
      matchedPrimarySource: { slug: "openai" },
    });
  });

  it("keeps ambiguous HuggingNews handles as candidates and excludes historical aggregator signals", async () => {
    const { db, repository } = await setup();
    const aggregator = await addSource(repository, {
      slug: "huggingnews-test",
      name: "HuggingNews Test",
      homepage_url: "https://huggingnews.com",
      role: "aggregator",
      source_category: "aggregator",
    });
    await addSource(repository, {
      slug: "lab-one",
      name: "Lab One",
      homepage_url: "https://x.com/lab_one",
      config_json: JSON.stringify({
        url: "https://x.com/lab_one",
        socialHandles: ["shared_lab"],
      }),
    });
    await addSource(repository, {
      slug: "lab-two",
      name: "Lab Two",
      homepage_url: "https://x.com/lab_two",
      config_json: JSON.stringify({
        url: "https://x.com/lab_two",
        socialHandles: ["@SHARED_LAB"],
      }),
    });
    const discovery = await repository.saveSourceDiscovery(
      aggregator.id,
      signal({
        url: "https://huggingnews.com/story/shared-lab",
        origin: {
          discoveryUrl: "https://huggingnews.com/story/shared-lab",
          kind: "aggregator_story",
          handles: [{ handle: "@Shared_Lab", role: "source" }],
        },
      }),
    );
    expect(discovery.discovery.status).toBe("candidate");
    expect(JSON.parse(discovery.discovery.candidate_source_ids_json)).toHaveLength(2);

    const timestamp = "2026-07-11T08:00:00.000Z";
    await db
      .insertInto("signals")
      .values({
        id: randomUUID(),
        source_id: aggregator.id,
        external_id: "legacy-aggregator-signal",
        canonical_url: "https://huggingnews.com/story/legacy",
        url_hash: "a".repeat(64),
        title: "Legacy aggregator row",
        summary: "Must never enter factual clustering.",
        author: null,
        language: "en",
        published_at: timestamp,
        collected_at: timestamp,
        category: "industry",
        tags_json: "[]",
        metrics_json: "{}",
        raw_meta_json: "{}",
        content_hash: "b".repeat(64),
        created_at: timestamp,
        updated_at: timestamp,
      })
      .execute();
    expect(await repository.listUnclusteredSignals()).toHaveLength(0);
  });

  it("never treats a shared social host as a unique publisher identity", async () => {
    const { repository } = await setup();
    const aggregator = await addSource(repository, {
      slug: "social-aggregator",
      name: "Social Aggregator",
      homepage_url: "https://aggregator.example",
      role: "aggregator",
      source_category: "aggregator",
    });
    await addSource(repository, {
      slug: "x-ai",
      name: "X AI Signal",
      homepage_url: "https://x.com/i/topics/ai",
      role: "heat",
      source_category: "community-heat",
    });

    await repository.saveSourceDiscovery(
      aggregator.id,
      signal({
        origin: {
          url: "https://x.com/unregistered_expert/status/1",
          discoveryUrl: "https://aggregator.example/story/1",
          kind: "social",
          handle: "unregistered_expert",
        },
      }),
    );

    expect((await repository.listSourceDiscoveries())[0]).toMatchObject({
      status: "pending",
      rawDomainOrHandle: "@unregistered_expert",
      matchedPrimarySource: null,
    });
  });
});
