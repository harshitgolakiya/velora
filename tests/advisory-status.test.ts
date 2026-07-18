import { describe, expect, it } from "vitest";
import { analyzeAuditReport, type AuditReport } from "../scripts/advisory-status";

const knownCoreAdvisory = {
  source: 1120821,
  name: "@opentelemetry/core",
  title: "OpenTelemetry Core: Unbounded memory allocation in W3C Baggage propagation",
  severity: "moderate" as const,
};

function knownLighthouseChain(): AuditReport {
  return {
    vulnerabilities: {
      "@opentelemetry/core": {
        severity: "moderate",
        via: [knownCoreAdvisory],
        range: "<2.8.0",
      },
      "@opentelemetry/instrumentation-http": {
        severity: "moderate",
        via: ["@opentelemetry/core"],
      },
      "@sentry/node": {
        severity: "moderate",
        via: ["@opentelemetry/core", "@opentelemetry/instrumentation-http"],
      },
      lighthouse: {
        severity: "moderate",
        via: ["@sentry/node"],
      },
    },
  };
}

describe("dependency advisory status", () => {
  it("allows the documented Lighthouse/Sentry/OpenTelemetry moderate chain", () => {
    const analysis = analyzeAuditReport(knownLighthouseChain(), "2026-07-08T00:00:00.000Z");

    expect(analysis.status).toBe("warn");
    expect(analysis.summary.allowed).toBe(4);
    expect(analysis.summary.unexpected).toBe(0);
  });

  it("fails on a new moderate advisory outside the documented chain", () => {
    const audit = knownLighthouseChain();
    audit.vulnerabilities = {
      ...audit.vulnerabilities,
      "new-package": {
        severity: "moderate",
        via: [{ source: 123, title: "new moderate advisory", severity: "moderate" }],
      },
    };

    const analysis = analyzeAuditReport(audit, "2026-07-08T00:00:00.000Z");

    expect(analysis.status).toBe("fail");
    expect(analysis.unexpected).toContainEqual(expect.objectContaining({ package: "new-package" }));
  });

  it("fails on high and critical advisories even inside allowed package names", () => {
    const analysis = analyzeAuditReport({
      vulnerabilities: {
        "@opentelemetry/core": {
          severity: "high",
          via: [{ source: 456, title: "high advisory", severity: "high" }],
        },
      },
    }, "2026-07-08T00:00:00.000Z");

    expect(analysis.status).toBe("fail");
    expect(analysis.summary.highOrCritical).toBe(1);
  });
});
