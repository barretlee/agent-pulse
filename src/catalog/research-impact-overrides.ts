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
    reviewedAt: "2026-07-14T00:00:00.000Z",
    validUntil: "2027-07-14T00:00:00.000Z",
    invalidatesWhen: "Science retracts the paper or the official method evidence is withdrawn.",
  },
  "autogen-framework-for-llm-agent-applications": {
    route: "industry-adoption",
    reason: "official_microsoft_project_and_sustained_open_source_adoption",
    evidenceUrls: [
      "https://www.microsoft.com/en-us/research/project/autogen/",
      "https://github.com/microsoft/autogen",
    ],
    reviewedAt: "2026-07-14T00:00:00.000Z",
    validUntil: "2027-01-14T00:00:00.000Z",
    invalidatesWhen:
      "The paper identity cannot be reconciled or the official project is withdrawn.",
  },
  "microsoft-argos-agentic-verifier": {
    route: "direct-source-significance",
    reason: "official_research_page_plus_publication_and_reported_cross_domain_evaluation",
    evidenceUrls: [
      "https://www.microsoft.com/en-us/research/blog/multimodal-reinforcement-learning-with-agentic-verifier-for-ai-agents/",
      "https://www.microsoft.com/en-us/research/publication/multimodal-reinforcement-learning-with-agentic-verifier-for-ai-agents/",
    ],
    reviewedAt: "2026-07-14T00:00:00.000Z",
    validUntil: "2027-01-20T00:00:00.000Z",
    invalidatesWhen:
      "The publication is withdrawn or independent evaluation contradicts the central results.",
  },
  "openai-gabriel-measurement-tool": {
    route: "direct-source-significance",
    reason: "official_publication_plus_validation_paper_and_sustained_open_source_artifact",
    evidenceUrls: [
      "https://openai.com/index/scaling-social-science-research/",
      "https://cdn.openai.com/pdf/7517a586-5bfa-4b87-bd3d-6ea0e9e844c7/GPT-as-a-measurement-tool.pdf",
      "https://github.com/openai/GABRIEL",
    ],
    reviewedAt: "2026-07-14T00:00:00.000Z",
    validUntil: "2027-02-13T00:00:00.000Z",
    invalidatesWhen:
      "The validation paper is withdrawn or the official implementation no longer supports the claimed method.",
  },
  "anthropic-observed-ai-labor-exposure": {
    route: "direct-source-significance",
    reason: "official_empirical_report_plus_public_methodology_and_external_labor_baselines",
    evidenceUrls: [
      "https://www.anthropic.com/research/labor-market-impacts",
      "https://cdn.sanity.io/files/4zrzovbb/website/2b5bbaf2c1eb81dbf6e6fb813c1a24e35a64d376.pdf",
    ],
    reviewedAt: "2026-07-14T00:00:00.000Z",
    validUntil: "2027-03-05T00:00:00.000Z",
    invalidatesWhen:
      "The methodology is withdrawn or later corrections invalidate the observed-exposure results.",
  },
  "google-reasoningbank-agent-memory": {
    route: "direct-source-significance",
    reason: "official_research_release_plus_iclr_paper_and_open_source_implementation",
    evidenceUrls: [
      "https://research.google/blog/reasoningbank-enabling-agents-to-learn-from-experience/",
      "https://arxiv.org/abs/2509.25140",
      "https://github.com/google-research/reasoning-bank",
    ],
    reviewedAt: "2026-07-14T00:00:00.000Z",
    validUntil: "2027-04-21T00:00:00.000Z",
    invalidatesWhen:
      "The conference status or paper identity is incorrect, or the official implementation is withdrawn.",
  },
  "google-era-empirical-research-assistance": {
    route: "direct-source-significance",
    reason: "nature_publication_plus_official_research_release_code_and_controlled_product_trial",
    evidenceUrls: [
      "https://research.google/blog/empirical-research-assistance-era-from-nature-publication-to-catalyzing-computational-discovery/",
      "https://www.nature.com/articles/s41586-026-10658-6",
      "https://github.com/google-research/era/tree/main/era_applications",
    ],
    reviewedAt: "2026-07-14T00:00:00.000Z",
    validUntil: "2027-05-19T00:00:00.000Z",
    invalidatesWhen:
      "Nature retracts the paper or the official code and deployment evidence no longer match the claims.",
  },
  "openai-deployment-simulation": {
    route: "direct-source-significance",
    reason: "official_research_release_plus_full_paper_and_reported_use_in_model_development",
    evidenceUrls: [
      "https://openai.com/index/deployment-simulation/",
      "https://cdn.openai.com/pdf/predicting-llm-safety-before-release-by-simulating-deployment.pdf",
    ],
    reviewedAt: "2026-07-14T00:00:00.000Z",
    validUntil: "2027-06-16T00:00:00.000Z",
    invalidatesWhen:
      "The paper is withdrawn or the stated deployment-validation evidence is materially corrected.",
  },
  "anthropic-global-workspace-language-models": {
    route: "direct-source-significance",
    reason:
      "official_interpretability_release_plus_full_paper_code_and_external_replication_commentary",
    evidenceUrls: [
      "https://www.anthropic.com/research/global-workspace",
      "https://transformer-circuits.pub/2026/workspace/index.html",
      "https://github.com/anthropics/jacobian-lens",
    ],
    reviewedAt: "2026-07-14T00:00:00.000Z",
    validUntil: "2027-07-06T00:00:00.000Z",
    invalidatesWhen:
      "The causal intervention results fail independent replication or the paper is materially withdrawn.",
  },
};
