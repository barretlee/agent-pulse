import type { CuratedEventSeed } from "./history.js";
import researchPapers from "./research-history-2022-2025.json" with { type: "json" };

/**
 * Editorially selected arXiv research history from 2022-11 through 2025-12.
 * Every completed month carries four primary-source papers that pass the public Timeline gate.
 */
export const researchHistory2022To2025 = researchPapers.map(
  (paper): CuratedEventSeed => ({
    slug: paper.slug,
    title: paper.title,
    fact: paper.fact,
    summary: paper.summary,
    technical: paper.technical,
    industry: paper.industry,
    future: paper.future,
    business: paper.business,
    category: "research",
    company: paper.company,
    keywords: paper.keywords,
    scores: [92, 0, paper.impactScore, paper.valueScore],
    date: paper.date,
    source: "arxiv-ai",
    url: paper.url,
    tracks: paper.tracks,
    actors: [],
  }),
);
