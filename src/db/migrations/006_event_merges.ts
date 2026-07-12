import type { Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("event_merges")
    .ifNotExists()
    .addColumn("id", "varchar(36)", (column) => column.primaryKey())
    .addColumn("target_event_id", "varchar(36)", (column) => column.notNull())
    .addColumn("source_event_id", "varchar(36)", (column) => column.notNull())
    .addColumn("source_snapshot_json", "text", (column) => column.notNull())
    .addColumn("reason", "varchar(80)", (column) => column.notNull())
    .addColumn("merged_by", "varchar(80)", (column) => column.notNull())
    .addColumn("created_at", "varchar(40)", (column) => column.notNull())
    .execute();
  await db.schema
    .createIndex("event_merges_target_idx")
    .ifNotExists()
    .on("event_merges")
    .column("target_event_id")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("event_merges").ifExists().execute();
}
