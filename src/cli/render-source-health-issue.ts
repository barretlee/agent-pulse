import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const SOURCE_HEALTH_SUMMARY_MARKER = "<!-- agent-pulse-source-health-summary:v1 -->";

interface HealthResult {
  slug: string;
  status: string;
  errorCode: string | null;
  repairAction: string;
}

interface HealthReport {
  startedAt: string;
  finishedAt: string;
  total: number;
  healthy: number;
  degraded: number;
  failed: number;
  skipped: number;
  accessible: number;
  withContent: number;
  results: HealthResult[];
}

export function renderSourceHealthIssue(raw: unknown): string {
  const report = healthReport(raw);
  const attention = report.results
    .filter((result) => result.status === "failed" || result.status === "degraded")
    .sort(
      (left, right) =>
        statusOrder(left.status) - statusOrder(right.status) || left.slug.localeCompare(right.slug),
    )
    .slice(0, 20);
  const lines = [
    SOURCE_HEALTH_SUMMARY_MARKER,
    "# Automated source health summary",
    "",
    `Last audit: ${safe(report.finishedAt, 40)}`,
    "",
    "| Metric | Count |",
    "| --- | ---: |",
    `| Configured | ${report.total} |`,
    `| Healthy | ${report.healthy} |`,
    `| Degraded | ${report.degraded} |`,
    `| Failed | ${report.failed} |`,
    `| Policy/manual skipped | ${report.skipped} |`,
    `| Accessible | ${report.accessible} |`,
    `| With content | ${report.withContent} |`,
    "",
    "## Highest-priority exceptions",
    "",
  ];
  if (!attention.length) lines.push("No failed or degraded automated source was reported.");
  else {
    lines.push("| Source | Status | Error | Suggested repair |", "| --- | --- | --- | --- |");
    for (const result of attention) {
      lines.push(
        `| \`${safe(result.slug, 80)}\` | ${safe(result.status, 20)} | ${safe(result.errorCode ?? "—", 80)} | ${safe(result.repairAction, 100)} |`,
      );
    }
    if (report.failed + report.degraded > attention.length) {
      lines.push("", `Showing 20 of ${report.failed + report.degraded} exceptions.`);
    }
  }
  lines.push(
    "",
    "This issue is updated in place by GitHub Actions. Detailed per-source diagnostics remain in the repository health report; a source is never activated from this issue.",
  );
  return `${lines.join("\n")}\n`;
}

export async function runRenderSourceHealthIssue(args = process.argv.slice(2)): Promise<void> {
  const reportPath = valueFor(args, "--report");
  if (!reportPath) throw new Error("Usage: --report <data/reports/source-health.json>");
  const unknown = args.filter(
    (argument, index) =>
      !argument.startsWith("--report=") &&
      argument !== "--report" &&
      args[index - 1] !== "--report",
  );
  if (unknown.length) throw new Error(`Unknown option: ${unknown[0]}`);
  const raw = JSON.parse(await readFile(resolve(reportPath), "utf8")) as unknown;
  process.stdout.write(renderSourceHealthIssue(raw));
}

function healthReport(raw: unknown): HealthReport {
  if (!raw || typeof raw !== "object") throw new Error("Source health report must be an object");
  const value = raw as Record<string, unknown>;
  const number = (key: string): number => {
    const item = value[key];
    if (!Number.isSafeInteger(item) || Number(item) < 0)
      throw new Error(`Invalid report field: ${key}`);
    return Number(item);
  };
  const string = (key: string): string => {
    const item = value[key];
    if (typeof item !== "string") throw new Error(`Invalid report field: ${key}`);
    return item;
  };
  if (!Array.isArray(value.results)) throw new Error("Invalid report field: results");
  const results = value.results.map((item) => {
    if (!item || typeof item !== "object") throw new Error("Invalid source health result");
    const result = item as Record<string, unknown>;
    if (
      typeof result.slug !== "string" ||
      typeof result.status !== "string" ||
      typeof result.repairAction !== "string"
    ) {
      throw new Error("Invalid source health result fields");
    }
    return {
      slug: result.slug,
      status: result.status,
      errorCode: typeof result.errorCode === "string" ? result.errorCode : null,
      repairAction: result.repairAction,
    };
  });
  return {
    startedAt: string("startedAt"),
    finishedAt: string("finishedAt"),
    total: number("total"),
    healthy: number("healthy"),
    degraded: number("degraded"),
    failed: number("failed"),
    skipped: number("skipped"),
    accessible: number("accessible"),
    withContent: number("withContent"),
    results,
  };
}

function safe(value: string, max: number): string {
  return value
    .replace(/[\r\n|`<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function statusOrder(status: string): number {
  return status === "failed" ? 0 : status === "degraded" ? 1 : 2;
}

function valueFor(args: string[], flag: string): string | undefined {
  const inline = args.find((argument) => argument.startsWith(`${flag}=`));
  if (inline) return inline.slice(flag.length + 1);
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === currentFile) await runRenderSourceHealthIssue();
