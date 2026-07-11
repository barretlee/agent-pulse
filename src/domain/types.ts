import { z } from "zod";

export const SourceConfigSchema = z.object({
  url: z.string().url(),
  category: z.string().optional(),
  take: z.number().int().min(1).max(100).optional(),
  mode: z.enum(["selected", "all"]).optional(),
  homepageOnly: z.boolean().optional(),
});

export type SourceConfig = z.infer<typeof SourceConfigSchema>;

export interface SignalMetrics {
  likes?: number;
  comments?: number;
  reposts?: number;
  tweets?: number;
  authors?: number;
  independentSources?: number;
  platforms?: string[];
  regions?: string[];
}

export interface CollectedSignal {
  externalId?: string;
  url: string;
  title: string;
  summary: string;
  author?: string;
  language: string;
  publishedAt: string;
  category: string;
  tags: string[];
  metrics: SignalMetrics;
  rawMeta: Record<string, unknown>;
}

export interface SourceDescriptor {
  id: string;
  slug: string;
  name: string;
  homepageUrl: string;
  adapter: string;
  tier: number;
  role: string;
  region: string;
  language: string;
  authorityScore: number;
  config: SourceConfig;
  state: Record<string, unknown>;
}

export interface ScoreFactors {
  authority: number;
  corroboration: number;
  primaryEvidence: number;
  uniqueAuthors: number;
  independentSources: number;
  platformBreadth: number;
  regionBreadth: number;
  velocity: number;
  freshness: number;
  crossRegion: boolean;
}

export interface ScoreResult {
  confidence: number;
  heat: number;
  impact: number;
  value: number;
  factors: ScoreFactors;
}

export type EventStatus = "draft" | "review" | "published" | "hidden";

export interface PublicEvidence {
  title: string;
  source: string;
  role: string;
  url: string;
  publishedAt: string;
}

export interface PublicEvent {
  id: string;
  slug: string;
  title: string;
  factSummary: string;
  summary: string;
  technicalInsight: string;
  industryInsight: string;
  futureOutlook: string;
  businessValue: string;
  category: string;
  company: string;
  keywords: string[];
  confidenceScore: number;
  heatScore: number;
  impactScore: number;
  valueScore: number;
  scoreFactors: ScoreFactors;
  featured: boolean;
  happenedAt: string;
  publishedAt: string | null;
  evidence: PublicEvidence[];
}
