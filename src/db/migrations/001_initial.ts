import type { Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("sources")
    .ifNotExists()
    .addColumn("id", "varchar(36)", (column) => column.primaryKey())
    .addColumn("slug", "varchar(100)", (column) => column.notNull().unique())
    .addColumn("name", "varchar(200)", (column) => column.notNull())
    .addColumn("homepage_url", "varchar(1000)", (column) => column.notNull())
    .addColumn("adapter", "varchar(50)", (column) => column.notNull())
    .addColumn("tier", "integer", (column) => column.notNull())
    .addColumn("role", "varchar(50)", (column) => column.notNull())
    .addColumn("region", "varchar(20)", (column) => column.notNull())
    .addColumn("language", "varchar(20)", (column) => column.notNull())
    .addColumn("authority_score", "integer", (column) => column.notNull())
    .addColumn("enabled", "integer", (column) => column.notNull())
    .addColumn("config_json", "text", (column) => column.notNull())
    .addColumn("state_json", "text", (column) => column.notNull())
    .addColumn("last_collected_at", "varchar(40)")
    .addColumn("last_success_at", "varchar(40)")
    .addColumn("last_error", "text")
    .addColumn("created_at", "varchar(40)", (column) => column.notNull())
    .addColumn("updated_at", "varchar(40)", (column) => column.notNull())
    .execute();

  await db.schema
    .createTable("signals")
    .ifNotExists()
    .addColumn("id", "varchar(36)", (column) => column.primaryKey())
    .addColumn("source_id", "varchar(36)", (column) =>
      column.notNull().references("sources.id").onDelete("cascade"),
    )
    .addColumn("external_id", "varchar(255)")
    .addColumn("canonical_url", "varchar(2000)", (column) => column.notNull())
    .addColumn("url_hash", "varchar(64)", (column) => column.notNull().unique())
    .addColumn("title", "text", (column) => column.notNull())
    .addColumn("summary", "text", (column) => column.notNull())
    .addColumn("author", "varchar(255)")
    .addColumn("language", "varchar(20)", (column) => column.notNull())
    .addColumn("published_at", "varchar(40)", (column) => column.notNull())
    .addColumn("collected_at", "varchar(40)", (column) => column.notNull())
    .addColumn("category", "varchar(50)", (column) => column.notNull())
    .addColumn("tags_json", "text", (column) => column.notNull())
    .addColumn("metrics_json", "text", (column) => column.notNull())
    .addColumn("raw_meta_json", "text", (column) => column.notNull())
    .addColumn("content_hash", "varchar(64)", (column) => column.notNull())
    .addColumn("created_at", "varchar(40)", (column) => column.notNull())
    .addColumn("updated_at", "varchar(40)", (column) => column.notNull())
    .execute();

  await db.schema
    .createIndex("signals_source_published_idx")
    .ifNotExists()
    .on("signals")
    .columns(["source_id", "published_at"])
    .execute();

  await db.schema
    .createTable("events")
    .ifNotExists()
    .addColumn("id", "varchar(36)", (column) => column.primaryKey())
    .addColumn("slug", "varchar(255)", (column) => column.notNull().unique())
    .addColumn("title", "text", (column) => column.notNull())
    .addColumn("fact_summary", "text", (column) => column.notNull())
    .addColumn("summary", "text", (column) => column.notNull())
    .addColumn("technical_insight", "text", (column) => column.notNull())
    .addColumn("industry_insight", "text", (column) => column.notNull())
    .addColumn("future_outlook", "text", (column) => column.notNull())
    .addColumn("business_value", "text", (column) => column.notNull())
    .addColumn("category", "varchar(50)", (column) => column.notNull())
    .addColumn("company", "varchar(100)", (column) => column.notNull())
    .addColumn("keywords_json", "text", (column) => column.notNull())
    .addColumn("confidence_score", "integer", (column) => column.notNull())
    .addColumn("heat_score", "integer", (column) => column.notNull())
    .addColumn("impact_score", "integer", (column) => column.notNull())
    .addColumn("value_score", "integer", (column) => column.notNull())
    .addColumn("score_factors_json", "text", (column) => column.notNull())
    .addColumn("status", "varchar(20)", (column) => column.notNull())
    .addColumn("featured", "integer", (column) => column.notNull())
    .addColumn("manual_override", "integer", (column) => column.notNull())
    .addColumn("happened_at", "varchar(40)", (column) => column.notNull())
    .addColumn("published_at", "varchar(40)")
    .addColumn("created_at", "varchar(40)", (column) => column.notNull())
    .addColumn("updated_at", "varchar(40)", (column) => column.notNull())
    .execute();

  await db.schema
    .createIndex("events_status_happened_idx")
    .ifNotExists()
    .on("events")
    .columns(["status", "happened_at"])
    .execute();

  await db.schema
    .createTable("event_signals")
    .ifNotExists()
    .addColumn("event_id", "varchar(36)", (column) =>
      column.notNull().references("events.id").onDelete("cascade"),
    )
    .addColumn("signal_id", "varchar(36)", (column) =>
      column.notNull().references("signals.id").onDelete("cascade"),
    )
    .addColumn("evidence_role", "varchar(30)", (column) => column.notNull())
    .addColumn("relevance_score", "integer", (column) => column.notNull())
    .addColumn("created_at", "varchar(40)", (column) => column.notNull())
    .addPrimaryKeyConstraint("event_signals_pk", ["event_id", "signal_id"])
    .execute();

  await db.schema
    .createTable("jobs")
    .ifNotExists()
    .addColumn("id", "varchar(36)", (column) => column.primaryKey())
    .addColumn("type", "varchar(50)", (column) => column.notNull())
    .addColumn("status", "varchar(20)", (column) => column.notNull())
    .addColumn("source_id", "varchar(36)")
    .addColumn("started_at", "varchar(40)", (column) => column.notNull())
    .addColumn("finished_at", "varchar(40)")
    .addColumn("collected_count", "integer", (column) => column.notNull())
    .addColumn("created_count", "integer", (column) => column.notNull())
    .addColumn("skipped_count", "integer", (column) => column.notNull())
    .addColumn("error_count", "integer", (column) => column.notNull())
    .addColumn("error_summary", "text")
    .addColumn("details_json", "text", (column) => column.notNull())
    .execute();

  await db.schema
    .createTable("settings")
    .ifNotExists()
    .addColumn("key", "varchar(100)", (column) => column.primaryKey())
    .addColumn("value_json", "text", (column) => column.notNull())
    .addColumn("updated_at", "varchar(40)", (column) => column.notNull())
    .execute();

  await db.schema
    .createTable("tracks")
    .ifNotExists()
    .addColumn("id", "varchar(36)", (column) => column.primaryKey())
    .addColumn("slug", "varchar(100)", (column) => column.notNull().unique())
    .addColumn("name", "varchar(200)", (column) => column.notNull())
    .addColumn("description", "text", (column) => column.notNull())
    .addColumn("kind", "varchar(20)", (column) => column.notNull())
    .addColumn("perspective", "varchar(30)", (column) => column.notNull())
    .addColumn("color", "varchar(20)", (column) => column.notNull())
    .addColumn("icon", "varchar(20)", (column) => column.notNull())
    .addColumn("order_index", "integer", (column) => column.notNull())
    .addColumn("enabled", "integer", (column) => column.notNull())
    .addColumn("created_at", "varchar(40)", (column) => column.notNull())
    .addColumn("updated_at", "varchar(40)", (column) => column.notNull())
    .execute();

  await db.schema
    .createTable("event_tracks")
    .ifNotExists()
    .addColumn("event_id", "varchar(36)", (column) =>
      column.notNull().references("events.id").onDelete("cascade"),
    )
    .addColumn("track_id", "varchar(36)", (column) =>
      column.notNull().references("tracks.id").onDelete("cascade"),
    )
    .addColumn("node_role", "varchar(20)", (column) => column.notNull())
    .addColumn("narrative", "text", (column) => column.notNull())
    .addColumn("stage", "varchar(30)", (column) => column.notNull())
    .addColumn("order_index", "integer", (column) => column.notNull())
    .addColumn("created_at", "varchar(40)", (column) => column.notNull())
    .addPrimaryKeyConstraint("event_tracks_pk", ["event_id", "track_id"])
    .execute();

  await db.schema
    .createTable("actors")
    .ifNotExists()
    .addColumn("id", "varchar(36)", (column) => column.primaryKey())
    .addColumn("slug", "varchar(100)", (column) => column.notNull().unique())
    .addColumn("name", "varchar(200)", (column) => column.notNull())
    .addColumn("actor_type", "varchar(30)", (column) => column.notNull())
    .addColumn("region", "varchar(20)", (column) => column.notNull())
    .addColumn("scale", "varchar(30)", (column) => column.notNull())
    .addColumn("domains_json", "text", (column) => column.notNull())
    .addColumn("table_score", "integer", (column) => column.notNull())
    .addColumn("website_url", "varchar(1000)", (column) => column.notNull())
    .addColumn("enabled", "integer", (column) => column.notNull())
    .addColumn("created_at", "varchar(40)", (column) => column.notNull())
    .addColumn("updated_at", "varchar(40)", (column) => column.notNull())
    .execute();

  await db.schema
    .createTable("event_actors")
    .ifNotExists()
    .addColumn("event_id", "varchar(36)", (column) =>
      column.notNull().references("events.id").onDelete("cascade"),
    )
    .addColumn("actor_id", "varchar(36)", (column) =>
      column.notNull().references("actors.id").onDelete("cascade"),
    )
    .addColumn("actor_role", "varchar(30)", (column) => column.notNull())
    .addColumn("progress_stage", "varchar(30)", (column) => column.notNull())
    .addColumn("relevance_score", "integer", (column) => column.notNull())
    .addColumn("created_at", "varchar(40)", (column) => column.notNull())
    .addPrimaryKeyConstraint("event_actors_pk", ["event_id", "actor_id"])
    .execute();

  await db.schema
    .createTable("model_resources")
    .ifNotExists()
    .addColumn("id", "varchar(36)", (column) => column.primaryKey())
    .addColumn("slug", "varchar(150)", (column) => column.notNull().unique())
    .addColumn("provider", "varchar(100)", (column) => column.notNull())
    .addColumn("model", "varchar(150)", (column) => column.notNull())
    .addColumn("resource_type", "varchar(30)", (column) => column.notNull())
    .addColumn("audience", "varchar(20)", (column) => column.notNull())
    .addColumn("region", "varchar(20)", (column) => column.notNull())
    .addColumn("currency", "varchar(10)", (column) => column.notNull())
    .addColumn("input_price", "double precision")
    .addColumn("output_price", "double precision")
    .addColumn("unit", "varchar(100)", (column) => column.notNull())
    .addColumn("plan_name", "varchar(200)", (column) => column.notNull())
    .addColumn("purchase_url", "varchar(1000)", (column) => column.notNull())
    .addColumn("source_url", "varchar(1000)", (column) => column.notNull())
    .addColumn("external_comparison_url", "varchar(1000)")
    .addColumn("risk_level", "varchar(20)", (column) => column.notNull())
    .addColumn("verified_at", "varchar(40)", (column) => column.notNull())
    .addColumn("enabled", "integer", (column) => column.notNull())
    .addColumn("created_at", "varchar(40)", (column) => column.notNull())
    .addColumn("updated_at", "varchar(40)", (column) => column.notNull())
    .execute();

  await db.schema
    .createTable("views")
    .ifNotExists()
    .addColumn("id", "varchar(36)", (column) => column.primaryKey())
    .addColumn("slug", "varchar(100)", (column) => column.notNull().unique())
    .addColumn("name", "varchar(200)", (column) => column.notNull())
    .addColumn("description", "text", (column) => column.notNull())
    .addColumn("filters_json", "text", (column) => column.notNull())
    .addColumn("layout_json", "text", (column) => column.notNull())
    .addColumn("theme_json", "text", (column) => column.notNull())
    .addColumn("is_default", "integer", (column) => column.notNull())
    .addColumn("status", "varchar(20)", (column) => column.notNull())
    .addColumn("created_at", "varchar(40)", (column) => column.notNull())
    .addColumn("updated_at", "varchar(40)", (column) => column.notNull())
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("views").ifExists().execute();
  await db.schema.dropTable("model_resources").ifExists().execute();
  await db.schema.dropTable("event_actors").ifExists().execute();
  await db.schema.dropTable("actors").ifExists().execute();
  await db.schema.dropTable("event_tracks").ifExists().execute();
  await db.schema.dropTable("tracks").ifExists().execute();
  await db.schema.dropTable("settings").ifExists().execute();
  await db.schema.dropTable("jobs").ifExists().execute();
  await db.schema.dropTable("event_signals").ifExists().execute();
  await db.schema.dropTable("events").ifExists().execute();
  await db.schema.dropTable("signals").ifExists().execute();
  await db.schema.dropTable("sources").ifExists().execute();
}
