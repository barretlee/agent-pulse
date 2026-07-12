import { describe, expect, it } from "vitest";
import { parseAuditArgs } from "../../src/cli/audit-sources.js";

describe("source audit CLI", () => {
  it("accepts separated and inline values plus the output alias", () => {
    expect(
      parseAuditArgs([
        "--source",
        "openai",
        "--concurrency=6",
        "--output",
        "data/reports/source-health.json",
      ]),
    ).toEqual({
      sourceSlug: "openai",
      concurrency: 6,
      reportPath: "data/reports/source-health.json",
      help: false,
    });
  });

  it("rejects unknown, missing and unsafe concurrency arguments", () => {
    expect(() => parseAuditArgs(["--unknown"])).toThrow("Unknown option");
    expect(() => parseAuditArgs(["--source"])).toThrow("requires a value");
    expect(() => parseAuditArgs(["--concurrency=0"])).toThrow("between 1 and 32");
  });
});
