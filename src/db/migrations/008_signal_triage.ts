import type { Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("signal_triage")
    .ifNotExists()
    .addColumn("signal_id", "varchar(36)", (column) =>
      column.primaryKey().references("signals.id").onDelete("cascade"),
    )
    .addColumn("status", "varchar(30)", (column) => column.notNull())
    .addColumn("reason", "varchar(120)", (column) => column.notNull())
    .addColumn("eventability_score", "integer", (column) => column.notNull())
    .addColumn("details_json", "text", (column) => column.notNull())
    .addColumn("created_at", "varchar(40)", (column) => column.notNull())
    .addColumn("updated_at", "varchar(40)", (column) => column.notNull())
    .execute();
  await db.schema
    .createIndex("signal_triage_status_idx")
    .ifNotExists()
    .on("signal_triage")
    .columns(["status", "updated_at"])
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("signal_triage").ifExists().execute();
}
