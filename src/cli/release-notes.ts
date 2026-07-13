import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { productVersion, releases } from "../catalog/product.js";
import { assertReleaseContract, extractReleaseNotes } from "../release/changelog.js";

export async function runReleaseNotesCli(args = process.argv.slice(2)): Promise<void> {
  const [argument] = args;
  const [manifestText, changelog] = await Promise.all([
    readFile(resolve("package.json"), "utf8"),
    readFile(resolve("CHANGELOG.md"), "utf8"),
  ]);
  const manifest = JSON.parse(manifestText) as { version: string };
  assertReleaseContract({
    packageVersion: manifest.version,
    productVersion,
    changelog,
    websiteVersions: releases.map((release) => release.version),
  });
  if (argument === "--check" || argument === undefined) {
    console.log(
      JSON.stringify({
        ok: true,
        version: manifest.version,
        websiteRelease: releases.find((release) => release.version === manifest.version)?.name,
      }),
    );
    return;
  }
  if (argument !== manifest.version) {
    throw new Error(`Requested release ${argument} does not match package ${manifest.version}`);
  }
  console.log(extractReleaseNotes(changelog, argument));
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === currentFile) await runReleaseNotesCli();
