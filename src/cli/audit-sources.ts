import { mkdir, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "../config/env.js";
import { createDatabase } from "../db/database.js";
import { migrateToLatest } from "../db/migrate.js";
import { seedDatabase } from "../db/seed.js";
import { auditSources } from "../pipeline/source-audit.js";

export interface AuditCliOptions {
  sourceSlug?: string;
  concurrency?: number;
  reportPath?: string;
  help: boolean;
}

export function parseAuditArgs(args: string[]): AuditCliOptions {
  const options: AuditCliOptions = { help: false };
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (!argument) continue;
    const equals = argument.indexOf("=");
    const flag = equals >= 0 ? argument.slice(0, equals) : argument;
    const inlineValue = equals >= 0 ? argument.slice(equals + 1) : undefined;

    if (flag === "--help" || flag === "-h") {
      options.help = true;
      continue;
    }
    if (!["--source", "--concurrency", "--report", "--output"].includes(flag)) {
      throw new Error(`Unknown option: ${flag}`);
    }
    const value = inlineValue ?? args[++index];
    if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value`);

    if (flag === "--source") options.sourceSlug = value;
    if (flag === "--report" || flag === "--output") options.reportPath = value;
    if (flag === "--concurrency") {
      const concurrency = Number(value);
      if (!Number.isSafeInteger(concurrency) || concurrency < 1 || concurrency > 32) {
        throw new Error("--concurrency must be an integer between 1 and 32");
      }
      options.concurrency = concurrency;
    }
  }
  return options;
}

export async function runAuditCli(args = process.argv.slice(2)): Promise<void> {
  const options = parseAuditArgs(args);
  if (options.help) {
    console.log(`Usage: npm run sources:audit -- [options]

  --source <slug>       Audit one configured source
  --concurrency <1-32>  Override bounded audit concurrency
  --report <path>       Write a privacy-safe report below data/reports
  --output <path>       Alias for --report
  --help                Show this help`);
    return;
  }

  const config = loadConfig();
  const db = createDatabase(config);
  try {
    await migrateToLatest(db, config);
    const sourceCount = await db
      .selectFrom("sources")
      .select(({ fn }) => fn.countAll<number>().as("count"))
      .executeTakeFirstOrThrow();
    if (Number(sourceCount.count) === 0) await seedDatabase(db);

    const sourceId = options.sourceSlug
      ? (
          await db
            .selectFrom("sources")
            .select("id")
            .where("slug", "=", options.sourceSlug)
            .executeTakeFirst()
        )?.id
      : undefined;
    if (options.sourceSlug && !sourceId) throw new Error(`Source not found: ${options.sourceSlug}`);

    const report = await auditSources(db, config, {
      ...(sourceId ? { sourceId } : {}),
      ...(options.concurrency ? { concurrency: options.concurrency } : {}),
    });
    if (options.reportPath) await writePublicReport(config.rootDir, options.reportPath, report);
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await db.destroy();
  }
}

async function writePublicReport(
  rootDir: string,
  reportArgument: string,
  report: Awaited<ReturnType<typeof auditSources>>,
): Promise<void> {
  const reportsRoot = resolve(rootDir, "data/reports");
  const reportPath = resolve(rootDir, reportArgument);
  const pathWithinReports = relative(reportsRoot, reportPath);
  if (
    !pathWithinReports ||
    pathWithinReports.startsWith("..") ||
    pathWithinReports.includes("../")
  ) {
    throw new Error("Audit reports must be written below data/reports");
  }
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(
    reportPath,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        ...report,
        results: report.results.map(({ sourceId: _sourceId, ...result }) => result),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === currentFile) {
  await runAuditCli();
}
