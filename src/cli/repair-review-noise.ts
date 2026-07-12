import { loadConfig } from "../config/env.js";
import { createDatabase } from "../db/database.js";
import { migrateToLatest } from "../db/migrate.js";
import { findReviewNoiseCandidates, reconcileReviewNoise } from "../pipeline/review-noise.js";

const config = loadConfig(process.env);
const db = createDatabase(config);

try {
  await migrateToLatest(db, config);
  const candidates = await findReviewNoiseCandidates(db);
  const preview = {
    count: candidates.length,
    sourceCounts: candidates.reduce<Record<string, number>>((counts, candidate) => {
      counts[candidate.sourceSlug] = (counts[candidate.sourceSlug] ?? 0) + 1;
      return counts;
    }, {}),
    sample: candidates.slice(0, 20),
  };
  if (!process.argv.includes("--confirm")) {
    console.log(JSON.stringify({ mode: "preview", preview }, null, 2));
    process.exitCode = candidates.length ? 2 : 0;
  } else {
    const action = await reconcileReviewNoise(db);
    console.log(JSON.stringify({ mode: "confirmed", preview, action }, null, 2));
  }
} finally {
  await db.destroy();
}
