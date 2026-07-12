import type { Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("source_checks")
    .addColumn("id", "varchar(36)", (column) => column.primaryKey())
    .addColumn("source_id", "varchar(36)", (column) =>
      column.notNull().references("sources.id").onDelete("cascade"),
    )
    .addColumn("job_id", "varchar(36)")
    .addColumn("status", "varchar(30)", (column) => column.notNull())
    .addColumn("adapter", "varchar(50)", (column) => column.notNull())
    .addColumn("adapter_version", "varchar(30)", (column) => column.notNull())
    .addColumn("access_status", "varchar(30)", (column) => column.notNull())
    .addColumn("fetch_status", "varchar(30)", (column) => column.notNull())
    .addColumn("parse_status", "varchar(30)", (column) => column.notNull())
    .addColumn("schema_status", "varchar(30)", (column) => column.notNull())
    .addColumn("policy_status", "varchar(30)", (column) => column.notNull())
    .addColumn("http_status", "integer")
    .addColumn("final_url", "text")
    .addColumn("content_type", "varchar(255)")
    .addColumn("response_bytes", "integer", (column) => column.notNull())
    .addColumn("item_count", "integer", (column) => column.notNull())
    .addColumn("duplicate_count", "integer", (column) => column.notNull())
    .addColumn("duplicate_ratio_bps", "integer", (column) => column.notNull())
    .addColumn("quality_score", "integer", (column) => column.notNull())
    .addColumn("latest_item_at", "varchar(40)")
    .addColumn("freshness_hours", "integer")
    .addColumn("error_type", "varchar(40)")
    .addColumn("error_code", "varchar(100)")
    .addColumn("error_summary", "text")
    .addColumn("repair_action", "varchar(80)", (column) => column.notNull())
    .addColumn("proxy_hint", "varchar(30)", (column) => column.notNull())
    .addColumn("retention_decision", "varchar(30)", (column) => column.notNull())
    .addColumn("recommended_lifecycle", "varchar(30)", (column) => column.notNull())
    .addColumn("sample_json", "text", (column) => column.notNull())
    .addColumn("started_at", "varchar(40)", (column) => column.notNull())
    .addColumn("finished_at", "varchar(40)", (column) => column.notNull())
    .addColumn("duration_ms", "integer", (column) => column.notNull())
    .execute();

  await db.schema
    .createIndex("source_checks_source_finished_idx")
    .on("source_checks")
    .columns(["source_id", "finished_at"])
    .execute();
  await db.schema
    .createIndex("source_checks_status_finished_idx")
    .on("source_checks")
    .columns(["status", "finished_at"])
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("source_checks").ifExists().execute();
}
