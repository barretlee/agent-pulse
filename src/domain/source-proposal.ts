import { isIP } from "node:net";
import { z } from "zod";

export const SOURCE_PROPOSAL_MARKER = "<!-- agent-pulse-source-proposal:v1 -->";

const sourceCategories = [
  "frontier-lab",
  "china-lab",
  "research-eval",
  "open-source",
  "agent-devtool",
  "robotics",
  "infra-chip-cloud",
  "capital-business",
  "model-economics",
  "policy",
  "expert",
  "media",
  "community-heat",
] as const;

const sourceRoles = ["primary", "research", "expert", "media", "heat", "policy"] as const;
const acquisitionKinds = ["rss", "github", "arxiv", "api", "html", "manual"] as const;
const SHARED_IDENTITY_HOSTS = new Set([
  "github.com",
  "github.io",
  "x.com",
  "twitter.com",
  "youtube.com",
  "medium.com",
  "linkedin.com",
  "reddit.com",
  "bilibili.com",
  "weibo.com",
  "zhihu.com",
  "arxiv.org",
  "substack.com",
  "mp.weixin.qq.com",
]);

export const SourceProposalCatalogEntrySchema = z
  .object({
    issueNumber: z.number().int().positive(),
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(80),
    name: z.string().min(2).max(120),
    owner: z.string().min(2).max(120),
    homepageUrl: z.string().url().max(500),
    endpoint: z.string().url().max(500),
    region: z.string().min(2).max(20),
    language: z.string().min(2).max(20),
    category: z.enum(sourceCategories),
    role: z.enum(sourceRoles),
    acquisition: z.enum(acquisitionKinds),
    topics: z.array(z.string().min(1).max(40)).min(1).max(12),
    cadence: z.enum(["6h", "12h", "24h", "weekly", "manual"]),
    licenseNote: z.string().min(20).max(1_000),
    evidenceUrls: z.array(z.string().url().max(500)).min(1).max(5),
    importedAt: z.string().datetime(),
  })
  .strict();

export const SourceProposalCatalogSchema = z.array(SourceProposalCatalogEntrySchema).max(500);
export type SourceProposalCatalogEntry = z.infer<typeof SourceProposalCatalogEntrySchema>;

export interface SourceProposalInput {
  name: string;
  owner: string;
  homepageUrl: string;
  endpointUrl: string | null;
  region: string;
  language: string;
  category: (typeof sourceCategories)[number];
  role: (typeof sourceRoles)[number];
  acquisition: (typeof acquisitionKinds)[number];
  topics: string[];
  cadence: SourceProposalCatalogEntry["cadence"];
  licenseNote: string;
  evidenceUrls: string[];
  rationale: string;
}

export interface ProposalIdentity {
  slug: string;
  homepageUrl: string;
  endpoint: string;
  identityHosts?: string[];
  proposalIssueNumber?: number;
}

export interface SourceProposalValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  proposal: SourceProposalCatalogEntry | null;
}

const HEADINGS = {
  name: "Source name",
  owner: "Canonical owner",
  homepageUrl: "Official homepage URL",
  endpointUrl: "Feed, API, or GitHub Releases URL",
  region: "Region",
  language: "Language",
  category: "Coverage category",
  role: "Source role",
  acquisition: "Acquisition surface",
  topics: "Topics",
  cadence: "Expected cadence",
  licenseNote: "License, robots, and attribution",
  evidenceUrls: "First-party evidence URLs",
  rationale: "Why should Agent Pulse track it?",
} as const;

export function parseSourceProposalIssue(body: string): SourceProposalInput {
  if (!body.includes(SOURCE_PROPOSAL_MARKER)) {
    throw new Error("Missing source proposal schema marker");
  }
  const sections = parseIssueSections(body);
  const required = <T extends keyof typeof HEADINGS>(key: T): string => {
    const value = cleanIssueValue(sections.get(HEADINGS[key]));
    if (!value) throw new Error(`Missing required field: ${HEADINGS[key]}`);
    return value;
  };
  const optional = <T extends keyof typeof HEADINGS>(key: T): string | null =>
    cleanIssueValue(sections.get(HEADINGS[key]));

  return {
    name: required("name"),
    owner: required("owner"),
    homepageUrl: required("homepageUrl"),
    endpointUrl: optional("endpointUrl"),
    region: required("region"),
    language: required("language"),
    category: z.enum(sourceCategories).parse(required("category")),
    role: z.enum(sourceRoles).parse(required("role")),
    acquisition: z.enum(acquisitionKinds).parse(required("acquisition")),
    topics: splitList(required("topics")),
    cadence: z.enum(["6h", "12h", "24h", "weekly", "manual"]).parse(required("cadence")),
    licenseNote: required("licenseNote"),
    evidenceUrls: splitLines(required("evidenceUrls")),
    rationale: required("rationale"),
  };
}

export function validateAndNormalizeSourceProposal(
  input: SourceProposalInput,
  issueNumber: number,
  existing: ProposalIdentity[],
  importedAt = new Date().toISOString(),
): SourceProposalValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!Number.isSafeInteger(issueNumber) || issueNumber < 1) errors.push("Issue number is invalid");
  const homepage = validatePublicHttpsUrl(input.homepageUrl, "Homepage", errors);
  const endpointRaw =
    input.endpointUrl ?? (input.acquisition === "manual" ? input.homepageUrl : "");
  if (!endpointRaw) errors.push("An endpoint is required for automated acquisition");
  const endpoint = endpointRaw ? validatePublicHttpsUrl(endpointRaw, "Endpoint", errors) : null;
  const evidence = input.evidenceUrls
    .slice(0, 5)
    .map((url, index) => validatePublicHttpsUrl(url, `Evidence URL ${index + 1}`, errors))
    .filter((url): url is URL => Boolean(url));
  const slug = slugify(input.name) || (homepage ? slugFromUrl(homepage) : "");
  if (!slug) errors.push("Source name cannot produce a stable slug");
  if (input.name.length > 120 || input.owner.length > 120) errors.push("Name or owner is too long");
  if (input.rationale.length > 2_000) errors.push("Rationale exceeds 2,000 characters");
  if (input.licenseNote.length < 20 || input.licenseNote.length > 1_000) {
    errors.push("License/robots note must contain 20-1,000 characters");
  }
  if (input.topics.length < 1 || input.topics.length > 12) errors.push("Provide 1-12 topics");
  if (evidence.length < 1) errors.push("At least one valid first-party evidence URL is required");

  if (endpoint && input.acquisition === "github" && !isGitHubReleaseFeed(endpoint)) {
    errors.push("GitHub acquisition requires an exact repository releases.atom URL");
  }
  if (endpoint && input.acquisition === "rss" && !looksLikeFeed(endpoint)) {
    warnings.push("The endpoint does not look like a conventional RSS/Atom feed");
  }
  if (input.acquisition === "manual" && input.cadence !== "manual") {
    warnings.push("Manual sources normally use manual cadence");
  }

  if (homepage && endpoint && slug) {
    const identities = new Set([...identityKeys(homepage), ...identityKeys(endpoint)]);
    for (const source of existing) {
      if (source.proposalIssueNumber === issueNumber) continue;
      const candidates = [source.homepageUrl, source.endpoint, ...(source.identityHosts ?? [])];
      const existingIdentities = new Set(candidates.flatMap(identityKeysFromValue));
      if (source.slug === slug) errors.push(`Duplicate slug: ${slug}`);
      if ([...identities].some((identity) => existingIdentities.has(identity))) {
        errors.push(`Duplicate source identity/root domain: ${source.slug}`);
      }
    }
  }

  if (errors.length || !homepage || !endpoint || !slug) {
    return { valid: false, errors: [...new Set(errors)], warnings, proposal: null };
  }
  const proposal = SourceProposalCatalogEntrySchema.parse({
    issueNumber,
    slug,
    name: compact(input.name, 120),
    owner: compact(input.owner, 120),
    homepageUrl: canonicalUrl(homepage),
    endpoint: canonicalUrl(endpoint),
    region: compact(input.region, 20),
    language: compact(input.language, 20),
    category: input.category,
    role: input.role,
    acquisition: input.acquisition,
    topics: [...new Set(input.topics.map((topic) => compact(topic, 40)).filter(Boolean))],
    cadence: input.cadence,
    licenseNote: compact(input.licenseNote, 1_000),
    evidenceUrls: [...new Set(evidence.map(canonicalUrl))],
    importedAt,
  });
  return { valid: true, errors: [], warnings, proposal };
}

export function upsertSourceProposal(
  entries: SourceProposalCatalogEntry[],
  proposal: SourceProposalCatalogEntry,
): { entries: SourceProposalCatalogEntry[]; changed: boolean } {
  const current = entries.find((entry) => entry.issueNumber === proposal.issueNumber);
  const next = [
    ...entries.filter((entry) => entry.issueNumber !== proposal.issueNumber),
    proposal,
  ].sort((left, right) => left.slug.localeCompare(right.slug));
  return {
    entries: SourceProposalCatalogSchema.parse(next),
    changed: !current || !same(current, proposal),
  };
}

export function formatProposalValidation(result: SourceProposalValidation): string {
  const lines = [
    "<!-- agent-pulse-source-proposal-validation:v1 -->",
    result.valid
      ? "## Source proposal validation: passed"
      : "## Source proposal validation: blocked",
    "",
  ];
  if (result.proposal) {
    lines.push(`- Draft slug: \`${result.proposal.slug}\``);
    lines.push(`- Acquisition: \`${result.proposal.acquisition}\``);
    lines.push("- Import result: disabled `draft`; never active automatically");
  }
  if (result.errors.length) {
    lines.push("", "### Errors", ...result.errors.map((error) => `- ${error}`));
  }
  if (result.warnings.length) {
    lines.push("", "### Warnings", ...result.warnings.map((warning) => `- ${warning}`));
  }
  lines.push("", "A maintainer must apply `source:import-ready` before a draft PR can be created.");
  return `${lines.join("\n")}\n`;
}

function parseIssueSections(body: string): Map<string, string> {
  const sections = new Map<string, string>();
  const headings = [...body.matchAll(/^###\s+(.+?)\s*$/gm)];
  for (const [index, heading] of headings.entries()) {
    const start = (heading.index ?? 0) + heading[0].length;
    const end = headings[index + 1]?.index ?? body.length;
    sections.set(heading[1]?.trim() ?? "", body.slice(start, end).trim());
  }
  return sections;
}

function cleanIssueValue(value: string | undefined): string | null {
  const cleaned = value?.trim();
  if (!cleaned || cleaned === "_No response_" || cleaned === "None") return null;
  return cleaned;
}

function splitList(value: string): string[] {
  return value
    .split(/[\n,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((item) => item.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
}

function validatePublicHttpsUrl(value: string, label: string, errors: string[]): URL | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    errors.push(`${label} is not a valid URL`);
    return null;
  }
  if (url.protocol !== "https:") errors.push(`${label} must use HTTPS`);
  if (url.username || url.password) errors.push(`${label} must not contain credentials`);
  if (url.port && url.port !== "443") errors.push(`${label} uses a non-standard port`);
  if (url.search) errors.push(`${label} must not contain query parameters`);
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!host || isUnsafeHost(host)) errors.push(`${label} points to a private or unsafe host`);
  return url;
}

function isUnsafeHost(host: string): boolean {
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return true;
  const literal = host.replace(/^\[|\]$/g, "");
  return isIP(literal) !== 0;
}

function canonicalUrl(url: URL): string {
  const value = new URL(url);
  value.hash = "";
  value.hostname = value.hostname.toLowerCase().replace(/\.$/, "");
  return value.toString();
}

function parseUrl(value: string): URL | null {
  try {
    return new URL(value.includes("://") ? value : `https://${value}`);
  } catch {
    return null;
  }
}

function identityKeysFromValue(value: string): string[] {
  const url = parseUrl(value);
  return url ? identityKeys(url) : [];
}

function identityKeys(url: URL): string[] {
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!SHARED_IDENTITY_HOSTS.has(host)) return [`root:${rootDomain(host)}`];
  if (host === "github.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length >= 2) return [`github:${parts[0]?.toLowerCase()}/${parts[1]?.toLowerCase()}`];
    return [];
  }
  const path = url.pathname.replace(/\/+$/, "") || "/";
  return path === "/" ? [] : [`shared:${host}${path.toLowerCase()}`];
}

function rootDomain(host: string): string {
  const parts = host.toLowerCase().split(".").filter(Boolean);
  return parts.length > 2 ? parts.slice(-2).join(".") : parts.join(".");
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function slugFromUrl(url: URL): string {
  if (url.hostname.toLowerCase() === "github.com") {
    const parts = url.pathname.split("/").filter(Boolean).slice(0, 2);
    if (parts.length === 2) return slugify(parts.join("-"));
  }
  return slugify(url.hostname.split(".")[0] ?? "");
}

function compact(value: string, max: number): string {
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function isGitHubReleaseFeed(url: URL): boolean {
  return (
    /^github\.com$/i.test(url.hostname) && /^\/[^/]+\/[^/]+\/releases\.atom$/i.test(url.pathname)
  );
}

function looksLikeFeed(url: URL): boolean {
  return /(?:feed|rss|atom|\.xml)(?:\/|$)/i.test(url.pathname);
}

function same(left: SourceProposalCatalogEntry, right: SourceProposalCatalogEntry): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
