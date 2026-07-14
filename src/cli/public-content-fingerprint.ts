import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const volatileKeys = new Set(["generatedAt", "finishedAt", "lastCheckedAt", "latestItemAt"]);
export const PUBLIC_CONTENT_FILES = [
  "timeline.json",
  "signals.json",
  "scout.json",
  "narratives.json",
  "product.json",
] as const;

export function fingerprintPublicContent(payloads: unknown[]): string {
  const canonical = payloads.map((payload) => normalize(payload));
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

export async function runPublicContentFingerprintCli(args = process.argv.slice(2)): Promise<void> {
  const dataDir = resolve(valueFor(args, "--dir") ?? "dist/data");
  const files: string[] = [...PUBLIC_CONTENT_FILES];
  if (args.includes("--include-sources")) files.push("sources.json");
  const payloads = await Promise.all(
    files.map(async (file) => JSON.parse(await readFile(resolve(dataDir, file), "utf8"))),
  );
  process.stdout.write(`${fingerprintPublicContent(payloads)}\n`);
}

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => normalize(item));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !volatileKeys.has(key))
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, normalize(item)]),
  );
}

function valueFor(args: string[], flag: string): string | undefined {
  const inline = args.find((argument) => argument.startsWith(`${flag}=`));
  if (inline) return inline.slice(flag.length + 1);
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === currentFile) {
  await runPublicContentFingerprintCli();
}
