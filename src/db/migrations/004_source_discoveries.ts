import type { Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("source_discoveries")
    .addColumn("id", "varchar(36)", (column) => column.primaryKey())
    .addColumn("identity_hash", "varchar(64)", (column) => column.notNull().unique())
    .addColumn("aggregator_source_id", "varchar(36)", (column) =>
      column.notNull().references("sources.id").onDelete("restrict"),
    )
    .addColumn("external_id", "varchar(255)")
    .addColumn("discovery_url", "varchar(2000)", (column) => column.notNull())
    .addColumn("discovery_url_hash", "varchar(64)", (column) => column.notNull())
    .addColumn("origin_url", "varchar(2000)")
    .addColumn("origin_url_hash", "varchar(64)")
    .addColumn("origin_kind", "varchar(30)", (column) => column.notNull())
    .addColumn("origin_name", "varchar(255)")
    .addColumn("handles_json", "text", (column) => column.notNull())
    .addColumn("title", "text", (column) => column.notNull())
    .addColumn("summary", "text", (column) => column.notNull())
    .addColumn("language", "varchar(20)", (column) => column.notNull())
    .addColumn("published_at", "varchar(40)", (column) => column.notNull())
    .addColumn("category", "varchar(50)", (column) => column.notNull())
    .addColumn("tags_json", "text", (column) => column.notNull())
    .addColumn("metrics_json", "text", (column) => column.notNull())
    .addColumn("raw_meta_json", "text", (column) => column.notNull())
    .addColumn("matched_source_id", "varchar(36)", (column) =>
      column.references("sources.id").onDelete("set null"),
    )
    .addColumn("candidate_source_ids_json", "text", (column) => column.notNull())
    .addColumn("matched_signal_id", "varchar(36)", (column) =>
      column.references("signals.id").onDelete("set null"),
    )
    .addColumn("status", "varchar(24)", (column) => column.notNull())
    .addColumn("first_seen_at", "varchar(40)", (column) => column.notNull())
    .addColumn("last_seen_at", "varchar(40)", (column) => column.notNull())
    .addColumn("created_at", "varchar(40)", (column) => column.notNull())
    .addColumn("updated_at", "varchar(40)", (column) => column.notNull())
    .execute();

  await db.schema
    .createIndex("source_discoveries_origin_status_idx")
    .on("source_discoveries")
    .columns(["origin_url_hash", "status"])
    .execute();
  await db.schema
    .createIndex("source_discoveries_source_status_idx")
    .on("source_discoveries")
    .columns(["matched_source_id", "status"])
    .execute();
  await db.schema
    .createIndex("source_discoveries_aggregator_seen_idx")
    .on("source_discoveries")
    .columns(["aggregator_source_id", "last_seen_at"])
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("source_discoveries").ifExists().execute();
}
