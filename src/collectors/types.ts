import type { AppConfig } from "../config/env.js";
import type { CollectedSignal, SourceDescriptor } from "../domain/types.js";

export interface CollectContext {
  config: AppConfig;
  fetchText: (url: string, headers?: Record<string, string>) => Promise<FetchResult>;
}

export interface FetchResult {
  body: string;
  status: number;
  headers: Headers;
  attemptCount: number;
  responseBytes: number;
  finalUrl: string;
  transport?: "direct" | "env-proxy";
}

export interface SourceAdapter {
  kind: string;
  collect(source: SourceDescriptor, context: CollectContext): Promise<CollectedSignal[]>;
}
