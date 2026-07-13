export function extractReleaseNotes(changelog: string, version: string): string {
  const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const heading = new RegExp(`^## \\[${escaped}\\](?:\\s+-\\s+[^\\n]+)?\\s*$`, "m");
  const match = heading.exec(changelog);
  if (!match) throw new Error(`CHANGELOG.md does not contain a [${version}] release section`);
  const start = (match.index ?? 0) + match[0].length;
  const remainder = changelog.slice(start);
  const nextHeading = /^## \[/m.exec(remainder);
  const body = remainder.slice(0, nextHeading?.index ?? remainder.length).trim();
  if (!body) throw new Error(`CHANGELOG.md [${version}] release section is empty`);
  return body;
}

export function assertReleaseContract(input: {
  packageVersion: string;
  productVersion: string;
  changelog: string;
  websiteVersions: readonly string[];
}): void {
  if (input.packageVersion !== input.productVersion) {
    throw new Error(
      `Release version mismatch: package=${input.packageVersion}, product=${input.productVersion}`,
    );
  }
  extractReleaseNotes(input.changelog, input.packageVersion);
  if (!input.websiteVersions.includes(input.packageVersion)) {
    throw new Error(`Website Changelog does not contain version ${input.packageVersion}`);
  }
}
