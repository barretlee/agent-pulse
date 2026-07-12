import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import proposalRows from "../catalog/source-proposals.json" with { type: "json" };
import { SourceProposalCatalogSchema, upsertSourceProposal } from "../domain/source-proposal.js";
import { validateProposalDocument } from "./validate-source-proposal.js";

const catalogPath = fileURLToPath(new URL("../catalog/source-proposals.json", import.meta.url));

export async function runImportSourceProposal(args = process.argv.slice(2)): Promise<void> {
  const issueJsonPath = valueFor(args, "--issue-json") ?? process.env.GITHUB_EVENT_PATH;
  if (!issueJsonPath) throw new Error("--issue-json or GITHUB_EVENT_PATH is required");
  if (!args.includes("--confirm")) {
    throw new Error("Import requires --confirm and always creates a disabled draft proposal");
  }
  const unknown = args.filter(
    (argument, index) =>
      argument !== "--confirm" &&
      !argument.startsWith("--issue-json=") &&
      argument !== "--issue-json" &&
      args[index - 1] !== "--issue-json",
  );
  if (unknown.length) throw new Error(`Unknown option: ${unknown[0]}`);

  const raw = JSON.parse(await readFile(resolve(issueJsonPath), "utf8")) as unknown;
  const current = SourceProposalCatalogSchema.parse(proposalRows);
  const directIssue = issueFrom(raw);
  const existing = current.find((entry) => entry.issueNumber === directIssue.number);
  const { issue, validation } = await validateProposalDocument(raw, existing?.importedAt);
  if (!issue.labels.includes("source:import-ready")) {
    throw new Error("Issue is missing the maintainer-controlled source:import-ready label");
  }
  if (!validation.valid || !validation.proposal) {
    throw new Error(`Proposal validation failed: ${validation.errors.join("; ")}`);
  }
  const result = upsertSourceProposal(current, validation.proposal);
  if (result.changed) {
    await writeFile(catalogPath, `${JSON.stringify(result.entries, null, 2)}\n`, "utf8");
  }
  console.log(
    JSON.stringify(
      {
        changed: result.changed,
        issueNumber: issue.number,
        slug: validation.proposal.slug,
        enabled: false,
        lifecycleStatus: "draft",
        output: "src/catalog/source-proposals.json",
      },
      null,
      2,
    ),
  );
}

function valueFor(args: string[], flag: string): string | undefined {
  const inline = args.find((argument) => argument.startsWith(`${flag}=`));
  if (inline) return inline.slice(flag.length + 1);
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function issueFrom(raw: unknown): { number: number } {
  if (!raw || typeof raw !== "object") throw new Error("Issue JSON must be an object");
  const event = raw as Record<string, unknown>;
  const issue = event.issue && typeof event.issue === "object" ? event.issue : event;
  const number = Number((issue as Record<string, unknown>).number);
  if (!Number.isSafeInteger(number) || number < 1) throw new Error("Issue number is invalid");
  return { number };
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === currentFile) await runImportSourceProposal();
