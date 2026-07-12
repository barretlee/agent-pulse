import type { Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("sources")
    .addColumn("observation_enabled", "integer", (column) => column.notNull().defaultTo(0))
    .execute();
  await db.schema
    .createIndex("sources_observation_idx")
    .ifNotExists()
    .on("sources")
    .columns(["observation_enabled", "lifecycle_status"])
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropIndex("sources_observation_idx").ifExists().execute();
  await db.schema.alterTable("sources").dropColumn("observation_enabled").execute();
}
