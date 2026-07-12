/**
 * Guarded source activation.
 *
 * Activation is deliberately explicit and evidence based. A source must have a
 * healthy latest check, at least 20 healthy checks across seven days, and an
 * operator must pass --confirm. Use `npm run sources:audit` to build evidence.
 */

import { loadConfig } from "../config/env.js";
import { createDatabase } from "../db/database.js";
import { migrateToLatest } from "../db/migrate.js";
import { Repository } from "../db/repository.js";
import { transitionSource } from "../domain/source-lifecycle.js";
import { releaseObservationTriage } from "../pipeline/observation.js";

const sourceSlug = process.argv.find((argument) => argument.startsWith("--source="))?.split("=")[1];
if (!sourceSlug) throw new Error("Usage: npm run activate -- --source=<slug> [--confirm]");

const config = loadConfig();
const db = createDatabase(config);
try {
  await migrateToLatest(db, config);
  const repository = new Repository(db);
  const source = (await repository.listSources()).find((item) => item.slug === sourceSlug);
  if (!source) throw new Error(`Source not found: ${sourceSlug}`);
  const checks = await repository.listSourceChecks(source.id, 100);
  const healthyChecks = checks.filter((check) => check.status === "healthy");
  const oldestHealthy = healthyChecks.at(-1);
  const observationDays = oldestHealthy
    ? (Date.now() - new Date(oldestHealthy.finished_at).getTime()) / 86_400_000
    : 0;
  const evidence = {
    source: source.slug,
    lifecycle: source.lifecycle_status,
    latestStatus: checks[0]?.status ?? null,
    healthyChecks: healthyChecks.length,
    observationDays: Math.floor(observationDays * 10) / 10,
    latestQuality: checks[0]?.quality_score ?? null,
    latestItems: checks[0]?.item_count ?? null,
  };
  const eligible =
    checks[0]?.status === "healthy" &&
    healthyChecks.length >= 20 &&
    observationDays >= 7 &&
    ["shadow", "degraded"].includes(source.lifecycle_status);
  if (!eligible) {
    console.log(JSON.stringify({ activated: false, eligible: false, evidence }, null, 2));
    process.exitCode = 2;
  } else if (!process.argv.includes("--confirm")) {
    console.log(
      JSON.stringify(
        {
          activated: false,
          eligible: true,
          evidence,
          next: `npm run activate -- --source=${source.slug} --confirm`,
        },
        null,
        2,
      ),
    );
  } else {
    const lifecycle = transitionSource(source.lifecycle_status, "activate");
    await repository.updateSource(source.id, {
      lifecycle_status: lifecycle,
      enabled: 1,
      observation_enabled: 0,
      last_verified_at: checks[0]?.finished_at ?? new Date().toISOString(),
      maintenance_status: "ready",
      retired_at: null,
    });
    const releasedSignals = await releaseObservationTriage(db, source.id);
    console.log(JSON.stringify({ activated: true, lifecycle, evidence, releasedSignals }, null, 2));
  }
} finally {
  await db.destroy();
}
