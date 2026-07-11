import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Kysely } from "kysely";
import type { AppConfig } from "../config/env.js";
import { parseJson, Repository } from "../db/repository.js";
import type { DatabaseSchema } from "../db/types.js";

export async function exportStaticSite(db: Kysely<DatabaseSchema>, config: AppConfig) {
  const repository = new Repository(db);
  const [events, tracks, actors, resources, view] = await Promise.all([
    repository.publicEvents(),
    repository.listTracks(),
    repository.listActors(),
    repository.listResources(),
    repository.getDefaultView(),
  ]);

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
    generatedAt,
  };
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
