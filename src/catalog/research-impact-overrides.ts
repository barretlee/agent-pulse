import type { ResearchImpactOverride } from "../pipeline/research-impact.js";

/**
 * Audited exceptions for impact that citation indexes alone cannot represent.
 * Every entry must bind multiple first-party or publisher sources and a falsifiable reason.
 */
export const researchImpactOverrides: Readonly<Record<string, ResearchImpactOverride>> = {
  "graphcast-weather-forecasting": {
    route: "peer-recognition",
    reason: "science_publication_and_official_method_evidence",
    evidenceUrls: [
      "https://www.science.org/doi/10.1126/science.adi2336",
      "https://deepmind.google/discover/blog/graphcast-ai-model-for-faster-and-more-accurate-global-weather-forecasting/",
    ],
  },
  "autogen-framework-for-llm-agent-applications": {
    route: "industry-adoption",
    reason: "official_microsoft_project_and_sustained_open_source_adoption",
    evidenceUrls: [
      "https://www.microsoft.com/en-us/research/project/autogen/",
      "https://github.com/microsoft/autogen",
    ],
  },
};
