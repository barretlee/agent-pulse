import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { sourceCatalog } from "../catalog/sources.js";
import {
  formatProposalValidation,
  type ProposalIdentity,
  parseSourceProposalIssue,
  type SourceProposalValidation,
  validateAndNormalizeSourceProposal,
} from "../domain/source-proposal.js";

interface GitHubIssueDocument {
  number: number;
  body: string;
  labels: string[];
  createdAt?: string;
}

export interface ValidateProposalOptions {
  issueJsonPath: string;
  format: "json" | "markdown";
}

export function parseValidateProposalArgs(args: string[]): ValidateProposalOptions {
  let issueJsonPath = process.env.GITHUB_EVENT_PATH ?? "";
  let format: ValidateProposalOptions["format"] = "json";
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (!argument) continue;
    const [flag, inline] = argument.split("=", 2);
    if (flag !== "--issue-json" && flag !== "--format") throw new Error(`Unknown option: ${flag}`);
    const value = inline ?? args[++index];
    if (!value) throw new Error(`${flag} requires a value`);
    if (flag === "--issue-json") issueJsonPath = value;
    else if (value === "json" || value === "markdown") format = value;
    else throw new Error("--format must be json or markdown");
  }
  if (!issueJsonPath) throw new Error("--issue-json or GITHUB_EVENT_PATH is required");
  return { issueJsonPath, format };
}

export async function validateProposalDocument(
  rawDocument: unknown,
  importedAt?: string,
): Promise<{ issue: GitHubIssueDocument; validation: SourceProposalValidation }> {
  const issue = githubIssueDocument(rawDocument);
  try {
    const input = parseSourceProposalIssue(issue.body);
    const validation = validateAndNormalizeSourceProposal(
      input,
      issue.number,
      catalogIdentities(),
      importedAt ?? issue.createdAt,
    );
    return { issue, validation };
  } catch (error) {
    return {
      issue,
      validation: {
        valid: false,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
        proposal: null,
      },
    };
  }
}

export async function runValidateSourceProposal(args = process.argv.slice(2)): Promise<void> {
  const options = parseValidateProposalArgs(args);
  const raw = JSON.parse(await readFile(resolve(options.issueJsonPath), "utf8")) as unknown;
  const { validation } = await validateProposalDocument(raw);
  process.stdout.write(
    options.format === "markdown"
      ? formatProposalValidation(validation)
      : `${JSON.stringify(validation, null, 2)}\n`,
  );
  if (!validation.valid) process.exitCode = 2;
}

function githubIssueDocument(raw: unknown): GitHubIssueDocument {
  if (!raw || typeof raw !== "object") throw new Error("Issue JSON must be an object");
  const event = raw as Record<string, unknown>;
  const value =
    event.issue && typeof event.issue === "object"
      ? (event.issue as Record<string, unknown>)
      : event;
  if (!Number.isSafeInteger(value.number) || Number(value.number) < 1) {
    throw new Error("Issue JSON is missing a valid number");
  }
  if (typeof value.body !== "string") throw new Error("Issue JSON is missing a text body");
  const labels = Array.isArray(value.labels)
    ? value.labels
        .map((label) =>
          typeof label === "string"
            ? label
            : label &&
                typeof label === "object" &&
                typeof (label as { name?: unknown }).name === "string"
              ? String((label as { name: string }).name)
              : "",
        )
        .filter(Boolean)
    : [];
  const createdAt =
    typeof value.created_at === "string" && !Number.isNaN(Date.parse(value.created_at))
      ? value.created_at
      : undefined;
  return {
    number: Number(value.number),
    body: value.body,
    labels,
    ...(createdAt ? { createdAt } : {}),
  };
}

function catalogIdentities(): ProposalIdentity[] {
  return sourceCatalog.map((source) => ({
    slug: source.slug,
    homepageUrl: source.homepageUrl,
    endpoint: source.endpoint,
    ...(source.identityHosts ? { identityHosts: source.identityHosts } : {}),
    ...(source.proposalIssueNumber ? { proposalIssueNumber: source.proposalIssueNumber } : {}),
  }));
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === currentFile) await runValidateSourceProposal();
