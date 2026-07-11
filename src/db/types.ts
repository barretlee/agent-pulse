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
  created_at: string;
  updated_at: string;
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
}

export type SourceRow = Selectable<SourceTable>;
export type NewSourceRow = Insertable<SourceTable>;
export type SourceUpdate = Updateable<SourceTable>;
export type SignalRow = Selectable<SignalTable>;
export type NewSignalRow = Insertable<SignalTable>;
export type EventRow = Selectable<EventTable>;
export type NewEventRow = Insertable<EventTable>;

export type IgnoreGenerated = Generated<never>;
