import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "../../src/config/env.js";
import { createDatabase } from "../../src/db/database.js";
import { migrateToLatest } from "../../src/db/migrate.js";
import { Repository } from "../../src/db/repository.js";
import type { SourceRow } from "../../src/db/types.js";
import { discoverNewSources, saveDiscoveredSources } from "../../src/pipeline/discovery.js";

const databases: ReturnType<typeof createDatabase>[] = [];

afterEach(async () => {
  while (databases.length) await databases.pop()?.destroy();
});

async function setup() {
  const config = loadConfig({ NODE_ENV: "test", DATABASE_URL: "sqlite::memory:" });
  const db = createDatabase(config);
  databases.push(db);
  await migrateToLatest(db, config);
  return { db, repository: new Repository(db) };
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
    tier: patch.tier ?? 2,
    role: patch.role ?? "primary",
    region: patch.region ?? "GLOBAL",
    language: patch.language ?? "en",
    authority_score: patch.authority_score ?? 80,
    enabled: patch.enabled ?? 1,
    config_json: patch.config_json ?? JSON.stringify({ url: patch.homepage_url }),
    state_json: "{}",
    last_collected_at: null,
    last_success_at: null,
    last_error: null,
    lifecycle_status: patch.lifecycle_status ?? "active",
    source_category: patch.source_category ?? "frontier-lab",
  });
  return (await repository.getSource(id)) as SourceRow;
}

describe("source proposal discovery", () => {
  it("builds proposals from first-party hints and removes aggregator-owned URLs", async () => {
    const { db, repository } = await setup();
    const aihot = await addSource(repository, {
      slug: "aihot-test",
      name: "AI HOT",
      homepage_url: "https://aihot.virxact.com",
      role: "aggregator",
      source_category: "aggregator",
    });
    const huggingnews = await addSource(repository, {
      slug: "huggingnews-test",
      name: "HuggingNews",
      homepage_url: "https://huggingnews.com",
      role: "aggregator",
      source_category: "aggregator",
    });
    await addSource(repository, {
      slug: "known-lab",
      name: "Known Lab",
      homepage_url: "https://known.ai",
      config_json: JSON.stringify({
        url: "https://known.ai/feed",
        identityHosts: ["identity-known.ai"],
      }),
    });
    const before = await sourceCount(db);
    const now = new Date().toISOString();

    await addDiscovery(db, aihot.id, {
      discoveryUrl: "https://aihot.virxact.com/p/launch-one",
      originUrl: "https://newlab.ai/blog/launch-one?utm_source=aihot",
      originKind: "official",
      originName: "New Lab",
      title: "New Lab launches its first reasoning model",
      publishedAt: now,
    });
    await addDiscovery(db, huggingnews.id, {
      discoveryUrl: "https://huggingnews.com/story/new-lab",
      originUrl: "https://newlab.ai/research/reasoning-two",
      originKind: "official",
      originName: "New Lab",
      title: "New Lab publishes a reasoning system card",
      publishedAt: now,
    });
    await addDiscovery(db, aihot.id, {
      discoveryUrl: "https://aihot.virxact.com/p/self-link",
      originUrl: "https://aihot.virxact.com/p/self-link",
      originKind: "media",
    });
    await addDiscovery(db, aihot.id, {
      discoveryUrl: "https://aihot.virxact.com/p/social-link",
      originUrl: "https://x.com/newlab/status/1",
      originKind: "social",
    });
    await addDiscovery(db, aihot.id, {
      discoveryUrl: "https://aihot.virxact.com/p/known-link",
      originUrl: "https://identity-known.ai/releases/one",
      originKind: "official",
    });
    await addDiscovery(db, huggingnews.id, {
      discoveryUrl: "https://huggingnews.com/story/no-first-party-link",
      originUrl: null,
      originKind: "aggregator_story",
    });

    const report = await discoverNewSources(db);

    expect(await sourceCount(db)).toBe(before);
    expect(report).toMatchObject({
      newCandidates: 1,
      existingSourceMatches: 1,
      policyRejected: 2,
    });
    expect(report.candidates).toHaveLength(1);
    expect(report.candidates[0]).toMatchObject({
      slug: "newlab",
      name: "New Lab",
      homepageUrl: "https://newlab.ai",
      signalCount: 2,
      uniqueEvidenceCount: 2,
      aggregatorCount: 2,
      confidence: "medium",
      suggestedTier: 3,
    });
    expect(report.candidates[0]?.originalTitles).toEqual([
      "New Lab launches its first reasoning model",
      "New Lab publishes a reasoning system card",
    ]);
    expect(report.candidates[0]?.evidenceUrls).toEqual([
      "https://newlab.ai/blog/launch-one",
      "https://newlab.ai/research/reasoning-two",
    ]);
    expect(JSON.stringify(report.candidates[0])).not.toContain("aihot.virxact.com/p/");
    expect(JSON.stringify(report.candidates[0])).not.toContain("huggingnews.com/story/");
  });

  it("only creates a disabled draft after an explicit save and skips duplicates", async () => {
    const { db, repository } = await setup();
    const aggregator = await addSource(repository, {
      slug: "aggregator",
      name: "Aggregator",
      homepage_url: "https://aggregator.example",
      role: "aggregator",
      source_category: "aggregator",
    });
    const now = new Date().toISOString();
    await addDiscovery(db, aggregator.id, {
      discoveryUrl: "https://aggregator.example/story/one",
      originUrl: "https://proposal.ai/releases/one",
      originKind: "official",
      originName: "Proposal AI",
      publishedAt: now,
    });

    const report = await discoverNewSources(db, { minSignals: 1 });
    expect(report.candidates).toHaveLength(1);
    expect(
      await db.selectFrom("sources").select("slug").where("slug", "=", "proposal").execute(),
    ).toHaveLength(0);

    await expect(saveDiscoveredSources(db, report.candidates)).resolves.toEqual({
      created: 1,
      skipped: 0,
    });
    const saved = await db
      .selectFrom("sources")
      .selectAll()
      .where("slug", "=", "proposal")
      .executeTakeFirstOrThrow();
    expect(saved).toMatchObject({
      enabled: 0,
      lifecycle_status: "draft",
      maintenance_status: "proposal",
      source_category: "company",
    });
    expect(JSON.parse(saved.state_json)).toMatchObject({
      proposal: true,
      proposalScore: report.candidates[0]?.score,
    });
    await expect(saveDiscoveredSources(db, report.candidates)).resolves.toEqual({
      created: 0,
      skipped: 1,
    });
  });
});

async function addDiscovery(
  db: ReturnType<typeof createDatabase>,
  aggregatorSourceId: string,
  patch: {
    discoveryUrl: string;
    originUrl: string | null;
    originKind: string;
    originName?: string;
    title?: string;
    publishedAt?: string;
  },
) {
  const id = randomUUID();
  const timestamp = patch.publishedAt ?? new Date().toISOString();
  await db
    .insertInto("source_discoveries")
    .values({
      id,
      identity_hash: `identity-${id}`,
      aggregator_source_id: aggregatorSourceId,
      external_id: id,
      discovery_url: patch.discoveryUrl,
      discovery_url_hash: `discovery-${id}`,
      origin_url: patch.originUrl,
      origin_url_hash: patch.originUrl ? `origin-${id}` : null,
      origin_kind: patch.originKind,
      origin_name: patch.originName ?? null,
      handles_json: "[]",
      title: patch.title ?? "Discovery title",
      summary: "Discovery summary",
      language: "en",
      published_at: timestamp,
      category: "model",
      tags_json: "[]",
      metrics_json: "{}",
      raw_meta_json: "{}",
      matched_source_id: null,
      candidate_source_ids_json: "[]",
      matched_signal_id: null,
      status: "pending",
      first_seen_at: timestamp,
      last_seen_at: timestamp,
      created_at: timestamp,
      updated_at: timestamp,
    })
    .execute();
}

async function sourceCount(db: ReturnType<typeof createDatabase>): Promise<number> {
  const row = await db
    .selectFrom("sources")
    .select(({ fn }) => fn.countAll<number>().as("count"))
    .executeTakeFirstOrThrow();
  return Number(row.count);
}
