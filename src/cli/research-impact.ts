import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { researchImpactOverrides } from "../catalog/research-impact-overrides.js";
import { loadConfig } from "../config/env.js";
import { createDatabase } from "../db/database.js";
import { migrateToLatest } from "../db/migrate.js";
import { Repository } from "../db/repository.js";
import { seedDatabase } from "../db/seed.js";
import {
  arxivIdForEvent,
  assessResearchImpact,
  type OpenAlexWorkMetrics,
  RESEARCH_IMPACT_POLICY_VERSION,
  type ResearchImpactReport,
  reportIsStale,
  researchCoverageForCompletedMonths,
} from "../pipeline/research-impact.js";

const config = loadConfig();
const reportPath = resolve(
  config.rootDir,
  valueFor("--output") ?? "data/reports/research-impact.json",
);
const db = createDatabase(config);

try {
  await migrateToLatest(db, config);
  if (!process.argv.includes("--skip-seed")) await seedDatabase(db);
  const repository = new Repository(db);
  const rows = await repository.listEvents();
  const events = (await Promise.all(rows.map((event) => repository.toPublicEvent(event)))).filter(
    (event) => {
      const category = event.category.toLowerCase();
      return (
        category.includes("research") || category.includes("paper") || !!arxivIdForEvent(event)
      );
    },
  );
  const ids = [...new Set(events.map(arxivIdForEvent).filter((id): id is string => !!id))];
  const referenceAt = new Date().toISOString();
  const previous = await readPrevious(reportPath);
  let sourceStatus: "fresh" | "cached-fallback" = "fresh";
  let works: Map<string, OpenAlexWorkMetrics>;
  try {
    works = await fetchOpenAlex(ids);
  } catch (error) {
    sourceStatus = "cached-fallback";
    const cacheIsCurrent =
      previous?.policyVersion === RESEARCH_IMPACT_POLICY_VERSION &&
      !reportIsStale(previous, referenceAt);
    works = worksFromPrevious(cacheIsCurrent ? previous : null);
    process.stderr.write(
      `[research-impact] OpenAlex unavailable; using ${works.size} current cached identities while audited direct-source reviews remain active: ${message(error)}\n`,
    );
  }
  const assessments = events
    .map((event) =>
      assessResearchImpact(
        event,
        works.get(arxivIdForEvent(event) ?? "") ?? null,
        referenceAt,
        researchImpactOverrides[event.slug],
      ),
    )
    .sort((left, right) => left.eventSlug.localeCompare(right.eventSlug));
  const coverage = researchCoverageForCompletedMonths(events, assessments, referenceAt);
  const next: ResearchImpactReport = {
    schemaVersion: 1,
    policyVersion: RESEARCH_IMPACT_POLICY_VERSION,
    generatedAt: referenceAt,
    source: { name: "OpenAlex", url: "https://developers.openalex.org/", status: sourceStatus },
    coverage,
    assessments,
  };
  const changed =
    comparable(previous) !== comparable(next) || freshnessRefreshDue(previous, referenceAt);
  if (changed) {
    await mkdir(dirname(reportPath), { recursive: true });
    await writeFile(reportPath, `${JSON.stringify(next, null, 2)}\n`);
  }
  process.stdout.write(
    `${JSON.stringify({
      reportPath,
      changed,
      candidates: assessments.length,
      qualified: assessments.filter((item) => item.qualified).length,
      rejected: assessments.filter((item) => item.route === "rejected").length,
      watch: assessments.filter((item) => item.route === "watch").length,
      sourceStatus,
      coverage,
    })}\n`,
  );
  if (coverage.maxConsecutiveEmptyMonths >= 2) {
    throw new Error(
      `Research coverage gap: ${coverage.maxConsecutiveEmptyMonths} consecutive completed months have no qualified research`,
    );
  }
} finally {
  await db.destroy();
}

function worksFromPrevious(report: ResearchImpactReport | null): Map<string, OpenAlexWorkMetrics> {
  const works = new Map<string, OpenAlexWorkMetrics>();
  if (!report) return works;
  for (const assessment of report.assessments) {
    if (!assessment.arxivId || !assessment.openAlexId || !assessment.publicationDate) continue;
    works.set(assessment.arxivId, {
      id: assessment.openAlexId,
      doi: `https://doi.org/10.48550/arxiv.${assessment.arxivId}`,
      title: assessment.paperTitle,
      publicationDate: assessment.publicationDate,
      citedByCount: assessment.citedByCount,
      recentCitations: assessment.recentCitations,
    });
  }
  return works;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function fetchOpenAlex(ids: string[]): Promise<Map<string, OpenAlexWorkMetrics>> {
  const works = new Map<string, OpenAlexWorkMetrics>();
  for (let offset = 0; offset < ids.length; offset += 100) {
    const batch = ids.slice(offset, offset + 100);
    const url = new URL("https://api.openalex.org/works");
    url.searchParams.set("filter", `doi:${batch.map((id) => `10.48550/arxiv.${id}`).join("|")}`);
    url.searchParams.set("per_page", "100");
    url.searchParams.set("select", "id,doi,title,publication_date,cited_by_count,counts_by_year");
    const apiKey = process.env.OPENALEX_API_KEY?.trim();
    if (apiKey) url.searchParams.set("api_key", apiKey);
    const response = await fetchWithRetry(url);
    const payload = (await response.json()) as {
      results?: Array<{
        id?: string;
        doi?: string | null;
        title?: string;
        publication_date?: string;
        cited_by_count?: number;
        counts_by_year?: Array<{ year?: number; cited_by_count?: number }>;
      }>;
    };
    for (const work of payload.results ?? []) {
      const id = work.doi?.match(/arxiv\.(\d{4}\.\d{4,5})/i)?.[1];
      if (!id || !work.id || !work.title || !work.publication_date) continue;
      works.set(id, {
        id: work.id,
        doi: work.doi ?? null,
        title: work.title,
        publicationDate: work.publication_date,
        citedByCount: work.cited_by_count ?? 0,
        recentCitations: (work.counts_by_year ?? [])
          .filter((item) => (item.year ?? 0) >= new Date().getUTCFullYear() - 1)
          .reduce((count, item) => count + (item.cited_by_count ?? 0), 0),
      });
    }
  }
  return works;
}

async function fetchWithRetry(url: URL): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          accept: "application/json",
          "user-agent":
            "agent-pulse-research-impact/0.10 (+https://github.com/barretlee/agent-pulse)",
        },
        signal: AbortSignal.timeout(20_000),
      });
      if (response.ok) return response;
      lastError = new Error(`OpenAlex request failed: ${response.status}`);
      if (![429, 500, 502, 503, 504].includes(response.status)) break;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
    await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
  }
  throw lastError ?? new Error("OpenAlex request failed");
}

async function readPrevious(path: string): Promise<ResearchImpactReport | null> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as ResearchImpactReport;
  } catch {
    return null;
  }
}

function comparable(report: ResearchImpactReport | null): string {
  if (!report) return "";
  return JSON.stringify({
    schemaVersion: report.schemaVersion,
    policyVersion: report.policyVersion,
    source: report.source,
    coverage: report.coverage,
    assessments: report.assessments,
  });
}

function freshnessRefreshDue(report: ResearchImpactReport | null, referenceAt: string): boolean {
  if (!report) return true;
  const age = Date.parse(referenceAt) - Date.parse(report.generatedAt);
  return !Number.isFinite(age) || age < 0 || age >= 7 * 86_400_000;
}

function valueFor(name: string): string | undefined {
  const inline = process.argv.find((argument) => argument.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
