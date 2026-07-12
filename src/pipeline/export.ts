import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Kysely } from "kysely";
import { industryNarratives } from "../catalog/history.js";
import { capabilities, productVersion, releases, roadmap } from "../catalog/product.js";
import type { AppConfig } from "../config/env.js";
import { parseJson, Repository } from "../db/repository.js";
import type { DatabaseSchema } from "../db/types.js";
import { evaluateSystem } from "./evaluate.js";

export async function exportStaticSite(db: Kysely<DatabaseSchema>, config: AppConfig) {
  const repository = new Repository(db);
  const evaluation = await evaluateSystem(db);
  const [events, tracks, actors, resources, view, scout] = await Promise.all([
    repository.publicEvents(),
    repository.listTracks(),
    repository.listActors(),
    repository.listResources(),
    repository.getDefaultView(),
    repository.publicScoutInsights(),
  ]);
  const sources = (await repository.listSources()).filter(
    (source) => source.lifecycle_status !== "retired",
  );

  const enrichedEvents = await Promise.all(
    events.map(async (event) => ({
      ...event,
      tracks: await repository.eventTracks(event.id),
      actors: await repository.eventActors(event.id),
    })),
  );
  const generatedAt = new Date().toISOString();

  await rm(config.distDir, { recursive: true, force: true });
  await mkdir(join(config.distDir, "data"), { recursive: true });
  await cp(join(config.rootDir, "web/public"), config.distDir, { recursive: true });

  await Promise.all([
    writeJson(join(config.distDir, "data/timeline.json"), {
      schemaVersion: 1,
      generatedAt,
      siteUrl: config.PUBLIC_SITE_URL,
      events: enrichedEvents,
    }),
    writeJson(
      join(config.distDir, "data/tracks.json"),
      tracks.map((track) => ({
        slug: track.slug,
        name: track.name,
        description: track.description,
        kind: track.kind,
        perspective: track.perspective,
        color: track.color,
        icon: track.icon,
      })),
    ),
    writeJson(join(config.distDir, "data/scout.json"), {
      schemaVersion: 1,
      generatedAt,
      insights: scout,
    }),
    writeJson(join(config.distDir, "data/narratives.json"), {
      schemaVersion: 1,
      generatedAt,
      ...industryNarratives,
    }),
    writeJson(join(config.distDir, "data/product.json"), {
      schemaVersion: 1,
      version: productVersion,
      generatedAt,
      capabilities,
      roadmap,
      releases,
      evaluation: evaluation
        ? {
            status: evaluation.status,
            overallScore: evaluation.overallScore,
            rawWeightedScore: evaluation.rawWeightedScore,
            evidenceCoverage: evaluation.evidenceCoverage,
            dimensions: evaluation.dimensions,
            finishedAt: evaluation.finishedAt,
          }
        : null,
      sourceCoverage: {
        total: sources.length,
        active: sources.filter((source) => source.lifecycle_status === "active").length,
        observing: sources.filter((source) => source.observation_enabled === 1).length,
        candidate: sources.filter((source) => source.maintenance_status === "candidate").length,
        regions: [...new Set(sources.map((source) => source.region))],
        categories: [...new Set(sources.map((source) => source.source_category))],
      },
    }),
    writeJson(
      join(config.distDir, "data/sources.json"),
      sources.map((source) => ({
        slug: source.slug,
        name: source.name,
        homepageUrl: source.homepage_url,
        category: source.source_category,
        region: source.region,
        tier: source.tier,
        role: source.role,
        acquisition: source.acquisition,
        topics: parseJson(source.topics_json, []),
        maintenanceStatus: source.maintenance_status,
        lifecycle: source.lifecycle_status,
        observationEnabled: source.observation_enabled === 1,
        qualityScore: source.quality_score,
        cadence: source.cadence,
      })),
    ),
    writeJson(
      join(config.distDir, "data/actors.json"),
      actors.map((actor) => ({
        slug: actor.slug,
        name: actor.name,
        type: actor.actor_type,
        region: actor.region,
        scale: actor.scale,
        domains: parseJson(actor.domains_json, []),
        tableScore: actor.table_score,
        websiteUrl: actor.website_url,
      })),
    ),
    writeJson(
      join(config.distDir, "data/resources.json"),
      resources.map((resource) => ({
        slug: resource.slug,
        provider: resource.provider,
        model: resource.model,
        type: resource.resource_type,
        audience: resource.audience,
        region: resource.region,
        currency: resource.currency,
        inputPrice: resource.input_price,
        outputPrice: resource.output_price,
        unit: resource.unit,
        planName: resource.plan_name,
        purchaseUrl: resource.purchase_url,
        sourceUrl: resource.source_url,
        comparisonUrl: resource.external_comparison_url,
        riskLevel: resource.risk_level,
        verifiedAt: resource.verified_at,
      })),
    ),
    writeJson(
      join(config.distDir, "data/view.json"),
      view
        ? {
            slug: view.slug,
            name: view.name,
            description: view.description,
            filters: parseJson(view.filters_json, {}),
            layout: parseJson(view.layout_json, {}),
            theme: parseJson(view.theme_json, {}),
          }
        : {},
    ),
  ]);

  const index = await readFile(join(config.distDir, "index.html"), "utf8");
  await writeFile(join(config.distDir, "404.html"), index, "utf8");

  return {
    events: enrichedEvents.length,
    tracks: tracks.length,
    actors: actors.length,
    resources: resources.length,
    scout: scout.length,
    sources: sources.length,
    version: productVersion,
    generatedAt,
  };
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
