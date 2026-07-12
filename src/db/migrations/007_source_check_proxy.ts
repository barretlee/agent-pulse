import type { Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("source_checks")
    .addColumn("proxy_used", "integer", (column) => column.notNull().defaultTo(0))
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable("source_checks").dropColumn("proxy_used").execute();
}
