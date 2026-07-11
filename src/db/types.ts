import type { Generated, Insertable, Selectable, Updateable } from "kysely";

export interface SourceTable {
  id: string;
  slug: string;
  name: string;
  homepage_url: string;
  adapter: string;
  tier: number;
  role: string;
  region: string;
  language: string;
  authority_score: number;
  enabled: number;
  config_json: string;
  state_json: string;
  last_collected_at: string | null;
  last_success_at: string | null;
  last_error: string | null;
  lifecycle_status: Generated<string>;
  health_score: Generated<number>;
  consecutive_failures: Generated<number>;
  success_count: Generated<number>;
  failure_count: Generated<number>;
  priority: Generated<number>;
  timeout_ms: Generated<number>;
  max_retries: Generated<number>;
  base_backoff_ms: Generated<number>;
  rate_limit_per_minute: Generated<number>;
  next_run_at: Generated<string | null>;
  retired_at: Generated<string | null>;
  source_category: Generated<string>;
  acquisition: Generated<string>;
  topics_json: Generated<string>;
  maintenance_status: Generated<string>;
  cadence: Generated<string>;
  license_note: Generated<string>;
  quality_score: Generated<number>;
  last_verified_at: Generated<string | null>;
  created_at: string;
  updated_at: string;
}

export interface SourceRunTable {
  id: string;
  source_id: string;
  job_id: string;
  status: string;
  attempt_count: number;
  duration_ms: number;
  collected_count: number;
  created_count: number;
  skipped_count: number;
  http_status: number | null;
  response_bytes: number;
  error_type: string | null;
  error_code: string | null;
  error_summary: string | null;
  started_at: string;
  finished_at: string | null;
}

export interface SourceDiscoveryTable {
  id: string;
  identity_hash: string;
  aggregator_source_id: string;
  external_id: string | null;
  discovery_url: string;
  discovery_url_hash: string;
  origin_url: string | null;
  origin_url_hash: string | null;
  origin_kind: string;
  origin_name: string | null;
  handles_json: string;
  title: string;
  summary: string;
  language: string;
  published_at: string;
  category: string;
  tags_json: string;
  metrics_json: string;
  raw_meta_json: string;
  matched_source_id: string | null;
  candidate_source_ids_json: string;
  matched_signal_id: string | null;
  status: string;
  first_seen_at: string;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

export interface ScoutInsightTable {
  id: string;
  slug: string;
  kind: string;
  status: string;
  title: string;
  observation: string;
  hypothesis: string;
  why_now: string;
  target_audience: string;
  suggested_action: string;
  artifact_idea: string;
  counter_signals: string;
  horizon: string;
  confidence_score: number;
  evidence_score: number;
  novelty_score: number;
  leverage_score: number;
  total_score: number;
  cooldown_key: string;
  generated_at: string;
  expires_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScoutEvidenceTable {
  insight_id: string;
  event_id: string;
  evidence_role: string;
  weight: number;
  created_at: string;
}

export interface EvaluationRunTable {
  id: string;
  release_version: string;
  status: string;
  overall_score: number;
  dimensions_json: string;
  capability_snapshot_json: string;
  notes: string;
  started_at: string;
  finished_at: string;
}

export interface SignalTable {
  id: string;
  source_id: string;
  external_id: string | null;
  canonical_url: string;
  url_hash: string;
  title: string;
  summary: string;
  author: string | null;
  language: string;
  published_at: string;
  collected_at: string;
  category: string;
  tags_json: string;
  metrics_json: string;
  raw_meta_json: string;
  content_hash: string;
  created_at: string;
  updated_at: string;
}

export interface EventTable {
  id: string;
  slug: string;
  title: string;
  fact_summary: string;
  summary: string;
  technical_insight: string;
  industry_insight: string;
  future_outlook: string;
  business_value: string;
  category: string;
  company: string;
  keywords_json: string;
  confidence_score: number;
  heat_score: number;
  impact_score: number;
  value_score: number;
  score_factors_json: string;
  status: string;
  featured: number;
  manual_override: number;
  happened_at: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventSignalTable {
  event_id: string;
  signal_id: string;
  evidence_role: string;
  relevance_score: number;
  created_at: string;
}

export interface JobTable {
  id: string;
  type: string;
  status: string;
  source_id: string | null;
  started_at: string;
  finished_at: string | null;
  collected_count: number;
  created_count: number;
  skipped_count: number;
  error_count: number;
  error_summary: string | null;
  details_json: string;
}

export interface SettingTable {
  key: string;
  value_json: string;
  updated_at: string;
}

export interface TrackTable {
  id: string;
  slug: string;
  name: string;
  description: string;
  kind: string;
  perspective: string;
  color: string;
  icon: string;
  order_index: number;
  enabled: number;
  created_at: string;
  updated_at: string;
}

export interface EventTrackTable {
  event_id: string;
  track_id: string;
  node_role: string;
  narrative: string;
  stage: string;
  order_index: number;
  created_at: string;
}

export interface ActorTable {
  id: string;
  slug: string;
  name: string;
  actor_type: string;
  region: string;
  scale: string;
  domains_json: string;
  table_score: number;
  website_url: string;
  enabled: number;
  created_at: string;
  updated_at: string;
}

export interface EventActorTable {
  event_id: string;
  actor_id: string;
  actor_role: string;
  progress_stage: string;
  relevance_score: number;
  created_at: string;
}

export interface ModelResourceTable {
  id: string;
  slug: string;
  provider: string;
  model: string;
  resource_type: string;
  audience: string;
  region: string;
  currency: string;
  input_price: number | null;
  output_price: number | null;
  unit: string;
  plan_name: string;
  purchase_url: string;
  source_url: string;
  external_comparison_url: string | null;
  risk_level: string;
  verified_at: string;
  enabled: number;
  created_at: string;
  updated_at: string;
}

export interface ViewTable {
  id: string;
  slug: string;
  name: string;
  description: string;
  filters_json: string;
  layout_json: string;
  theme_json: string;
  is_default: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseSchema {
  sources: SourceTable;
  source_runs: SourceRunTable;
  source_discoveries: SourceDiscoveryTable;
  signals: SignalTable;
  events: EventTable;
  event_signals: EventSignalTable;
  jobs: JobTable;
  settings: SettingTable;
  tracks: TrackTable;
  event_tracks: EventTrackTable;
  actors: ActorTable;
  event_actors: EventActorTable;
  model_resources: ModelResourceTable;
  views: ViewTable;
  scout_insights: ScoutInsightTable;
  scout_evidence: ScoutEvidenceTable;
  evaluation_runs: EvaluationRunTable;
}

export type SourceRow = Selectable<SourceTable>;
export type NewSourceRow = Insertable<SourceTable>;
export type SourceUpdate = Updateable<SourceTable>;
export type SourceRunRow = Selectable<SourceRunTable>;
export type SourceDiscoveryRow = Selectable<SourceDiscoveryTable>;
export type ScoutInsightRow = Selectable<ScoutInsightTable>;
export type SignalRow = Selectable<SignalTable>;
export type NewSignalRow = Insertable<SignalTable>;
export type EventRow = Selectable<EventTable>;
export type NewEventRow = Insertable<EventTable>;

export type IgnoreGenerated = Generated<never>;
