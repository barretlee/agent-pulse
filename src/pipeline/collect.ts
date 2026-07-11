import type { Kysely } from "kysely";
import { createSafeFetcher } from "../collectors/fetcher.js";
import { getAdapter } from "../collectors/index.js";
import type { AppConfig } from "../config/env.js";
import { Repository } from "../db/repository.js";
import type { DatabaseSchema, SourceRow } from "../db/types.js";

export interface CollectionSummary {
  collected: number;
  created: number;
  skipped: number;
  errors: string[];
}

export async function collectSources(
  db: Kysely<DatabaseSchema>,
  config: AppConfig,
  sourceId?: string,
): Promise<CollectionSummary> {
  const repository = new Repository(db);
  const sources = sourceId
    ? [await repository.getSource(sourceId)].filter((source): source is SourceRow =>
        Boolean(source),
      )
    : await repository.getEnabledSources();
  const jobId = await repository.startJob("collect", sourceId ?? null);
  const result: CollectionSummary = { collected: 0, created: 0, skipped: 0, errors: [] };
  const fetchText = createSafeFetcher(config);

  for (const row of sources) {
    const source = repository.toSourceDescriptor(row);
    try {
      const items = await getAdapter(source.adapter).collect(source, { config, fetchText });
      result.collected += items.length;
      for (const item of items) {
        try {
          const inserted = await repository.insertSignal(source.id, item);
          if (inserted) result.created += 1;
          else result.skipped += 1;
        } catch (error) {
          result.errors.push(`${source.slug}: ${message(error)}`);
        }
      }
      await repository.updateSource(source.id, {
        last_collected_at: new Date().toISOString(),
        last_success_at: new Date().toISOString(),
        last_error: null,
      });
    } catch (error) {
      const detail = `${source.slug}: ${message(error)}`;
      result.errors.push(detail);
      await repository.updateSource(source.id, {
        last_collected_at: new Date().toISOString(),
        last_error: detail.slice(0, 4_000),
      });
    }
  }

  await repository.finishJob(jobId, result);
  return result;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
