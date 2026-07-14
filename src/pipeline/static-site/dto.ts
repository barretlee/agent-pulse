import type { PublicEvent } from "../../domain/types.js";
import type { ResearchImpactAssessment } from "../research-impact.js";

export interface PublicTrack {
  slug: string;
  name: string;
  description: string;
  kind: string;
  perspective: string;
  color: string;
  icon: string;
}

export interface EventTrack {
  slug: string;
  name: string;
  color: string;
  icon: string;
  role: string;
  narrative: string;
  stage: string;
  orderIndex: number;
}

export interface EventActor {
  slug: string;
  name: string;
  region: string;
  actorType: string;
  tableScore: number;
  role: string;
  progressStage: string;
}

export interface EnrichedEvent extends PublicEvent {
  tracks: EventTrack[];
  actors: EventActor[];
  researchImpact?: ResearchImpactAssessment | null;
}

export interface PublicActor {
  slug: string;
  name: string;
  type: string;
  region: string;
  scale: string;
  domains: string[];
  tableScore: number;
  websiteUrl: string;
}

export interface PublicResource {
  slug: string;
  provider: string;
  model: string;
  type: string;
  audience: string;
  region: string;
  currency: string;
  inputPrice: number | null;
  outputPrice: number | null;
  unit: string;
  planName: string;
  purchaseUrl: string;
  sourceUrl: string;
  comparisonUrl: string | null;
  riskLevel: string;
  verifiedAt: string;
}

export interface PublicSource {
  slug: string;
  name: string;
  homepageUrl: string;
  category: string;
  region: string;
  tier: number;
  role: string;
  acquisition: string;
  topics: string[];
  maintenanceStatus: string;
  lifecycle: string;
  observationEnabled: boolean;
  qualityScore: number;
  cadence: string;
  healthStatus: "healthy" | "degraded" | "failed" | "skipped" | "unchecked";
  lastCheckedAt: string | null;
  latestItemAt: string | null;
  healthErrorCode: string | null;
}

export interface PublicSignal {
  title: string;
  description: string;
  url: string;
  sourceSlug: string;
  sourceName: string;
  sourceTier: number;
  sourceRole: string;
  sourceRegion: string;
  publishedAt: string;
  collectedAt: string;
  category: string;
  tags: string[];
  language: string;
}

export interface PublicInfluencer {
  slug: string;
  name: string;
  region: "CN" | "GLOBAL";
  focus: string[];
  feedSourceSlug: string | null;
  profiles: Array<{
    platform: "website" | "x" | "linkedin" | "weibo" | "jike" | "github";
    handle: string;
    url: string;
    access: "automatic" | "restricted";
  }>;
}

export type CoverageStatus = "covered" | "watch" | "gap" | "unchecked";

export interface TechnologyCoverage {
  slug: string;
  name: string;
  description: string;
  status: CoverageStatus;
  sources: PublicSource[];
  healthySources: number;
  activeSources: number;
  observingSources: number;
  channels: string[];
  missingChannels: string[];
  nextAction: string;
}

export interface ScoutEvidence {
  slug: string;
  title: string;
  factSummary: string;
}

export interface PublicScoutInsight {
  slug: string;
  kind: string;
  title: string;
  observation: string;
  hypothesis: string;
  whyNow: string;
  targetAudience: string;
  suggestedAction: string;
  artifactIdea: string;
  counterSignals: string;
  horizon: string;
  confidenceScore: number;
  evidenceScore: number;
  noveltyScore: number;
  leverageScore: number;
  totalScore: number;
  publishedAt: string;
  evidence: ScoutEvidence[];
}

export interface NarrativeStage {
  start: string;
  end: string;
  period: string;
  label: string;
  summary: string;
  interpretation: string;
  chinaPosition: string;
  nextSignal: string;
}

export interface DecisionLens {
  role: "ceo" | "investor" | "cto" | "product";
  question: string;
  answer: string;
  implications: string[];
  actions: string[];
  watch: string[];
  evidenceSlugs: string[];
}

export interface TrackNarrative {
  slug: string;
  thesis: string;
  now: string;
  next: string;
  stages: NarrativeStage[];
  lenses: DecisionLens[];
}

export interface IndustryNarratives {
  horizon: { start: string; end: string; label: string };
  eras: Array<{
    slug: string;
    label: string;
    period: string;
    summary: string;
    projects: Array<{
      name: string;
      status: "active" | "pivoted" | "acquired" | "sunset";
      note: string;
      url: string;
    }>;
  }>;
  tracks: TrackNarrative[];
}

export interface Capability {
  slug: string;
  name: string;
  domain: string;
  status: string;
  maturity: number;
  release: string;
  evidence: string;
}

export interface RoadmapStage {
  state: number;
  name: string;
  promise: string;
  status: string;
  milestones: string[];
}

export interface Release {
  status?: "unreleased" | "released";
  version: string;
  date: string;
  name: string;
  summary: string;
  capabilities: string[];
  changes: string[];
}

export interface EvaluationDimension {
  slug: string;
  name: string;
  score: number;
  rawScore: number;
  scoreCap: number;
  weight: number;
  status: string;
  sampleSize: number;
  sampleTarget: number;
  summary: string;
  penalties: string[];
  nextAction: string;
}

export interface ProductData {
  version: string;
  generatedAt: string;
  capabilities: Capability[];
  roadmap: RoadmapStage[];
  releases: Release[];
  evaluation: {
    status: string;
    overallScore: number;
    rawWeightedScore: number;
    evidenceCoverage: number;
    dimensions: EvaluationDimension[];
    finishedAt: string;
  } | null;
  sourceCoverage: {
    total: number;
    active: number;
    observing: number;
    candidate: number;
    regions: string[];
    categories: string[];
  };
}

export interface GithubData {
  repositoryUrl: string;
  stars: number | null;
  forks: number | null;
  openIssues: number | null;
  latestRelease: string;
  fetchedAt: string | null;
}

export interface StaticSiteModel {
  siteUrl: string;
  generatedAt: string;
  events: EnrichedEvent[];
  tracks: PublicTrack[];
  actors: PublicActor[];
  resources: PublicResource[];
  sources: PublicSource[];
  signals: PublicSignal[];
  influencers: PublicInfluencer[];
  scout: PublicScoutInsight[];
  narratives: IndustryNarratives;
  product: ProductData;
  github: GithubData;
}
