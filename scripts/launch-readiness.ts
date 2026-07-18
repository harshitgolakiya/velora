import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  envProblems,
  envValue,
  loadDotEnv,
  recommendedProductionEnv,
  requiredProductionEnv,
} from "./readiness-env";
import { buildEvidenceReport, writeEvidenceReport, type EvidenceReport } from "./launch-evidence";

type CheckStatus = "pass" | "warn" | "fail";

type Check = {
  name: string;
  status: CheckStatus;
  detail: string;
};

type RestoreReport = {
  status?: string;
  checkedAt?: string;
  integrity?: string;
  counts?: Record<string, number>;
  localAdminMediaFiles?: number;
};

type AdvisoryReport = {
  status?: CheckStatus;
  checkedAt?: string;
  summary?: {
    allowed?: number;
    unexpected?: number;
    highOrCritical?: number;
  };
};

function checkLaunchEvidence(report: EvidenceReport): Check {
  const failed = report.checks.filter((check) => check.status === "fail");
  const warned = report.checks.filter((check) => check.status === "warn");

  if (failed.length) {
    return {
      name: "local launch evidence files",
      status: "fail",
      detail: `${failed.length} evidence file check(s) failed. Run npm run launch:evidence for missing fields.`,
    };
  }

  if (warned.length) {
    return {
      name: "local launch evidence files",
      status: "warn",
      detail: `${warned.length} evidence path(s) are not configured. Set PROVIDER_RESTORE_EVIDENCE_PATH, ASSISTIVE_TECH_SIGNOFF_PATH, and GO_LIVE_DECISION_RECORD_PATH before final launch.`,
    };
  }

  return {
    name: "local launch evidence files",
    status: "pass",
    detail: "Provider restore, assistive-tech, and go-live decision evidence files are filled.",
  };
}

function checkEnv(names: readonly string[], severity: "required" | "recommended"): Check {
  const problems = envProblems(names);

  if (!problems.length) {
    return {
      name: `${severity} production env`,
      status: "pass",
      detail: `${names.length} variables present without obvious placeholders.`,
    };
  }

  return {
    name: `${severity} production env`,
    status: severity === "required" ? "fail" : "warn",
    detail: problems.join(", "),
  };
}

function readLatestRestoreReport(): RestoreReport | null {
  const reportPath = path.join(process.cwd(), ".restore-drill", "latest-report.json");
  if (!existsSync(reportPath)) return null;
  return JSON.parse(readFileSync(reportPath, "utf8")) as RestoreReport;
}

function checkRestoreDrill(): Check {
  const report = readLatestRestoreReport();
  if (!report) {
    return {
      name: "local backup restore drill",
      status: "fail",
      detail: "No .restore-drill/latest-report.json found. Run npm run backup:restore-drill.",
    };
  }

  const checkedAt = report.checkedAt ? new Date(report.checkedAt) : null;
  const ageHours = checkedAt ? (Date.now() - checkedAt.getTime()) / 3_600_000 : Number.POSITIVE_INFINITY;
  const fresh = Number.isFinite(ageHours) && ageHours <= 168;
  const passed = report.status === "passed" && report.integrity === "ok";
  if (passed && fresh) {
    return {
      name: "local backup restore drill",
      status: "pass",
      detail: `Passed ${ageHours.toFixed(1)}h ago; products=${report.counts?.products ?? "n/a"}, variants=${report.counts?.variants ?? "n/a"}, mediaFiles=${report.localAdminMediaFiles ?? "n/a"}.`,
    };
  }

  return {
    name: "local backup restore drill",
    status: passed ? "warn" : "fail",
    detail: passed
      ? `Latest report is older than 7 days (${ageHours.toFixed(1)}h). Re-run npm run backup:restore-drill before launch.`
      : `Latest report did not pass cleanly: status=${report.status ?? "unknown"}, integrity=${report.integrity ?? "unknown"}.`,
  };
}

function checkProviderEvidence(): Check {
  const evidenceUrl = envValue("BACKUP_RESTORE_RUNBOOK_URL");
  if (evidenceUrl) {
    return {
      name: "provider backup restore evidence",
      status: "pass",
      detail: "BACKUP_RESTORE_RUNBOOK_URL is configured; verify it points to the latest staging restore evidence.",
    };
  }
  return {
    name: "provider backup restore evidence",
    status: "warn",
    detail: "Real provider backup and staging restore evidence still require production/staging access.",
  };
}

function checkAssistiveTechEvidence(): Check {
  const evidenceUrl = envValue("ASSISTIVE_TECH_SIGNOFF_URL");
  if (evidenceUrl) {
    return {
      name: "manual assistive-tech signoff",
      status: "pass",
      detail: "ASSISTIVE_TECH_SIGNOFF_URL is configured; verify it links to the final WCAG review notes.",
    };
  }
  return {
    name: "manual assistive-tech signoff",
    status: "warn",
    detail: "Manual screen-reader/keyboard review remains external. Use docs/ASSISTIVE_TECH_SIGNOFF.md.",
  };
}

function checkDependencyAdvisories(): Check {
  const reportPath = path.join(process.cwd(), ".launch-readiness", "advisory-report.json");
  if (!existsSync(reportPath)) {
    return {
      name: "moderate dependency advisories",
      status: "warn",
      detail: "No advisory report found. Run npm run security:moderates before the final launch decision.",
    };
  }

  const report = JSON.parse(readFileSync(reportPath, "utf8")) as AdvisoryReport;
  const checkedAt = report.checkedAt ? new Date(report.checkedAt) : null;
  const ageHours = checkedAt ? (Date.now() - checkedAt.getTime()) / 3_600_000 : Number.POSITIVE_INFINITY;
  const fresh = Number.isFinite(ageHours) && ageHours <= 168;
  const ageDetail = fresh ? `checked ${ageHours.toFixed(1)}h ago` : "report is older than 7 days or missing a timestamp";

  if (report.status === "fail") {
    return {
      name: "moderate dependency advisories",
      status: "fail",
      detail: `Unexpected advisories found (${ageDetail}); unexpected=${report.summary?.unexpected ?? "n/a"}, highOrCritical=${report.summary?.highOrCritical ?? "n/a"}. Run npm run security:moderates.`,
    };
  }

  if (report.status === "pass") {
    return {
      name: "moderate dependency advisories",
      status: fresh ? "pass" : "warn",
      detail: fresh
        ? "No moderate, high, or critical dependency advisories found."
        : `Last advisory report passed but ${ageDetail}. Re-run npm run security:moderates.`,
    };
  }

  return {
    name: "moderate dependency advisories",
    status: "warn",
    detail: fresh
      ? `Known Lighthouse -> Sentry/OpenTelemetry moderate chain only (${report.summary?.allowed ?? "n/a"} allowed; ${ageDetail}). Lighthouse 13.x requires Node >=22.19.`
      : `Known advisory report exists but ${ageDetail}. Re-run npm run security:moderates.`,
  };
}

function main() {
  loadDotEnv();
  const evidenceReport = buildEvidenceReport();
  writeEvidenceReport(evidenceReport);

  const checks = [
    checkEnv(requiredProductionEnv, "required"),
    checkEnv(recommendedProductionEnv, "recommended"),
    checkRestoreDrill(),
    checkProviderEvidence(),
    checkAssistiveTechEvidence(),
    checkLaunchEvidence(evidenceReport),
    checkDependencyAdvisories(),
  ];
  const status: CheckStatus = checks.some((check) => check.status === "fail")
    ? "fail"
    : checks.some((check) => check.status === "warn")
      ? "warn"
      : "pass";
  const report = {
    status,
    checkedAt: new Date().toISOString(),
    checks,
  };

  const outputDir = path.join(process.cwd(), ".launch-readiness");
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(path.join(outputDir, "latest-report.json"), `${JSON.stringify(report, null, 2)}\n`);

  console.table(checks.map((check) => ({
    check: check.name,
    status: check.status,
    detail: check.detail,
  })));
  console.log(`Launch readiness status: ${status}`);

  if (status === "fail" || (status === "warn" && process.env.LAUNCH_READINESS_STRICT === "true")) {
    process.exitCode = 1;
  }
}

main();
