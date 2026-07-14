import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  validatePublicSite,
  writePublicSiteIntegrityReport,
} from "../pipeline/public-site-integrity.js";

export async function runValidatePublicSiteCli(args = process.argv.slice(2)): Promise<void> {
  const distDir = resolve(readOption(args, "--dist") ?? "dist");
  const output = readOption(args, "--output");
  const report = await validatePublicSite(distDir);
  if (output) await writePublicSiteIntegrityReport(resolve(output), report);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.ok) process.exitCode = 1;
}

function readOption(args: string[], name: string): string | undefined {
  const inline = args.find((argument) => argument.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === currentFile) await runValidatePublicSiteCli();
