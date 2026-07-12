import type { GithubData } from "./dto.js";

const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function githubDataFromEnvironment(version: string, now = new Date()): GithubData {
  const fetchedAt = validDate(process.env.GITHUB_METADATA_FETCHED_AT);
  const fresh = fetchedAt !== null && now.getTime() - fetchedAt.getTime() <= MAX_AGE_MS;

  return {
    repositoryUrl: process.env.GITHUB_REPOSITORY_URL || "https://github.com/barretlee/agent-pulse",
    stars: fresh ? nullableNumber(process.env.GITHUB_STARS) : null,
    forks: fresh ? nullableNumber(process.env.GITHUB_FORKS) : null,
    openIssues: fresh ? nullableNumber(process.env.GITHUB_OPEN_ISSUES) : null,
    latestRelease: process.env.GITHUB_LATEST_RELEASE || `v${version}`,
    fetchedAt: fresh && fetchedAt ? fetchedAt.toISOString() : null,
  };
}

function nullableNumber(value: string | undefined): number | null {
  if (value === undefined || value.trim() === "") return null;
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : null;
}

function validDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
