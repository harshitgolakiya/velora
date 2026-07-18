import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

type Severity = "info" | "low" | "moderate" | "high" | "critical";
type AdvisoryStatus = "pass" | "warn" | "fail";

type AuditAdvisory = {
  source?: number | string;
  name?: string;
  title?: string;
  severity?: Severity;
  url?: string;
};

type AuditVulnerability = {
  name?: string;
  severity?: Severity;
  via?: Array<string | AuditAdvisory>;
  effects?: string[];
  range?: string;
  nodes?: string[];
  fixAvailable?: boolean | Record<string, unknown>;
};

export type AuditReport = {
  vulnerabilities?: Record<string, AuditVulnerability>;
  metadata?: unknown;
};

type AdvisoryEntry = {
  package: string;
  severity: Severity;
  range?: string;
  via: string[];
  reason?: string;
};

export type AdvisoryAnalysis = {
  status: AdvisoryStatus;
  checkedAt: string;
  summary: {
    total: number;
    allowed: number;
    unexpected: number;
    highOrCritical: number;
  };
  allowed: AdvisoryEntry[];
  unexpected: AdvisoryEntry[];
};

const severityRank: Record<Severity, number> = {
  info: 0,
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4,
};

const knownOpenTelemetryAdvisorySource = "1120821";
const knownOpenTelemetryAdvisoryTitle = "OpenTelemetry Core: Unbounded memory allocation in W3C Baggage propagation";

function advisoryLabel(advisory: string | AuditAdvisory): string {
  if (typeof advisory === "string") return advisory;
  return [
    advisory.source ? String(advisory.source) : "",
    advisory.name ?? "",
    advisory.title ?? "",
  ].filter(Boolean).join(":") || "unknown advisory";
}

function directAdvisories(vulnerability: AuditVulnerability): AuditAdvisory[] {
  return (vulnerability.via ?? []).filter((advisory): advisory is AuditAdvisory => typeof advisory !== "string");
}

function viaPackages(vulnerability: AuditVulnerability): string[] {
  return (vulnerability.via ?? []).filter((advisory): advisory is string => typeof advisory === "string");
}

function isAllowedPackage(name: string): boolean {
  return name === "lighthouse" || name === "@sentry/node" || name.startsWith("@opentelemetry/");
}

function isKnownOpenTelemetryAdvisory(advisory: AuditAdvisory): boolean {
  return (
    String(advisory.source ?? "") === knownOpenTelemetryAdvisorySource ||
    advisory.title === knownOpenTelemetryAdvisoryTitle ||
    advisory.url?.includes("GHSA-8988-4f7v-96qf") === true
  );
}

function hasKnownOpenTelemetryRoot(vulnerabilities: Record<string, AuditVulnerability>): boolean {
  const core = vulnerabilities["@opentelemetry/core"];
  if (!core) return false;
  return directAdvisories(core).some(isKnownOpenTelemetryAdvisory);
}

function isAllowedKnownModerate(
  name: string,
  vulnerability: AuditVulnerability,
  vulnerabilities: Record<string, AuditVulnerability>,
): boolean {
  if (vulnerability.severity !== "moderate") return false;
  if (!isAllowedPackage(name)) return false;

  const direct = directAdvisories(vulnerability);
  if (direct.length > 0) return direct.every(isKnownOpenTelemetryAdvisory);

  const chain = viaPackages(vulnerability);
  return hasKnownOpenTelemetryRoot(vulnerabilities) && chain.length > 0 && chain.every(isAllowedPackage);
}

export function analyzeAuditReport(audit: AuditReport, checkedAt = new Date().toISOString()): AdvisoryAnalysis {
  const vulnerabilities = audit.vulnerabilities ?? {};
  const allowed: AdvisoryEntry[] = [];
  const unexpected: AdvisoryEntry[] = [];

  for (const [name, vulnerability] of Object.entries(vulnerabilities)) {
    const severity = vulnerability.severity ?? "low";
    const entry: AdvisoryEntry = {
      package: name,
      severity,
      range: vulnerability.range,
      via: (vulnerability.via ?? []).map(advisoryLabel),
    };

    if (severityRank[severity] >= severityRank.high) {
      unexpected.push({
        ...entry,
        reason: "High or critical dependency advisories must be resolved before release.",
      });
      continue;
    }

    if (isAllowedKnownModerate(name, vulnerability, vulnerabilities)) {
      allowed.push({
        ...entry,
        reason: "Known Lighthouse/Sentry/OpenTelemetry dev-tooling chain blocked by the Node >=22.19 Lighthouse 13 upgrade.",
      });
      continue;
    }

    if (severityRank[severity] >= severityRank.moderate) {
      unexpected.push({
        ...entry,
        reason: "Moderate advisory is not in the current documented allowlist.",
      });
    }
  }

  const highOrCritical = unexpected.filter((entry) => severityRank[entry.severity] >= severityRank.high).length;
  const status: AdvisoryStatus = unexpected.length > 0 ? "fail" : allowed.length > 0 ? "warn" : "pass";

  return {
    status,
    checkedAt,
    summary: {
      total: Object.keys(vulnerabilities).length,
      allowed: allowed.length,
      unexpected: unexpected.length,
      highOrCritical,
    },
    allowed,
    unexpected,
  };
}

function runNpmAudit(): AuditReport {
  const result = spawnSync("npm", ["audit", "--audit-level=moderate", "--json"], {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: process.platform === "win32",
  });

  if (result.error) throw result.error;
  const stdout = String(result.stdout ?? "").trim();
  if (!stdout) {
    throw new Error(String(result.stderr ?? "npm audit did not return JSON output").trim());
  }

  return JSON.parse(stdout) as AuditReport;
}

function main() {
  const audit = runNpmAudit();
  const analysis = analyzeAuditReport(audit);
  const outputDir = path.join(process.cwd(), ".launch-readiness");
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(path.join(outputDir, "advisory-report.json"), `${JSON.stringify(analysis, null, 2)}\n`);

  console.table([
    ...analysis.unexpected.map((entry) => ({
      package: entry.package,
      severity: entry.severity,
      status: "fail",
      via: entry.via.join(", "),
    })),
    ...analysis.allowed.map((entry) => ({
      package: entry.package,
      severity: entry.severity,
      status: "allowed",
      via: entry.via.join(", "),
    })),
  ]);
  console.log(`Dependency advisory status: ${analysis.status}`);

  if (analysis.status === "fail") process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
