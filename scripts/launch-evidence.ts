import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadDotEnv } from "./readiness-env";

type EvidenceStatus = "pass" | "warn" | "fail";

type EvidenceDefinition = {
  key: string;
  name: string;
  pathEnv: string;
  requiredFields: string[];
};

type EvidenceCheck = {
  name: string;
  status: EvidenceStatus;
  detail: string;
  filePath?: string;
  missingFields?: string[];
};

export type EvidenceReport = {
  status: EvidenceStatus;
  checkedAt: string;
  checks: EvidenceCheck[];
};

const evidenceDefinitions: EvidenceDefinition[] = [
  {
    key: "providerRestore",
    name: "provider backup and staging restore evidence",
    pathEnv: "PROVIDER_RESTORE_EVIDENCE_PATH",
    requiredFields: [
      "Production provider",
      "Database name / project",
      "Backup identifier",
      "Backup completed at",
      "Backup storage location",
      "Staging provider",
      "Staging database name / project",
      "Restore completed at",
      "Restored application URL",
      "Migration version after restore",
      "`prisma migrate deploy` result",
      "`/api/health` result",
      "`/api/admin/ops/health` result",
      "`npm run release:check` result or CI URL",
      "Restore drill status",
      "Evidence URL for `BACKUP_RESTORE_RUNBOOK_URL`",
    ],
  },
  {
    key: "assistiveTech",
    name: "manual assistive-technology signoff evidence",
    pathEnv: "ASSISTIVE_TECH_SIGNOFF_PATH",
    requiredFields: [
      "Reviewer name",
      "Date/time and app build/version",
      "Browser and assistive technology versions",
      "Routes/workflows reviewed",
      "Issues found, severity, owner, and resolution",
      "Final decision",
    ],
  },
  {
    key: "goLiveDecision",
    name: "go-live decision record",
    pathEnv: "GO_LIVE_DECISION_RECORD_PATH",
    requiredFields: [
      "Release version",
      "Commit / artifact",
      "Production URL",
      "Staging URL",
      "Decision time",
      "`npm run deployment:check` result",
      "`npm run security:moderates` result",
      "`npm run launch:readiness` result",
      "`npm run release:check` result",
      "Lighthouse scores",
      "Provider backup evidence URL",
      "Provider restore evidence URL",
      "Assistive-tech signoff URL",
      "Decision",
      "Approvers",
    ],
  },
];

function normalizeFieldName(value: string) {
  return value.replace(/`/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

function isBlankEvidenceValue(value: string) {
  const normalized = value.trim().toLowerCase();
  return (
    !normalized ||
    normalized === "tbd" ||
    normalized === "todo" ||
    normalized === "pending" ||
    normalized === "n/a" ||
    normalized === "none" ||
    normalized.includes("replace-with") ||
    normalized.includes("placeholder") ||
    normalized.includes(" / ")
  );
}

export function markdownEvidenceFields(content: string) {
  const fields = new Map<string, string>();
  for (const line of content.split(/\r?\n/)) {
    const match = /^\s*-\s+([^:]+):\s*(.*)\s*$/.exec(line);
    if (!match) continue;
    fields.set(normalizeFieldName(match[1]), match[2].trim());
  }
  return fields;
}

function validateEvidenceFile(definition: EvidenceDefinition, filePath: string): EvidenceCheck {
  if (!existsSync(filePath)) {
    return {
      name: definition.name,
      status: "fail",
      detail: `${definition.pathEnv} points to a file that does not exist.`,
      filePath,
    };
  }

  const fields = markdownEvidenceFields(readFileSync(filePath, "utf8"));
  const missingFields = definition.requiredFields.filter((field) => {
    const value = fields.get(normalizeFieldName(field));
    return value === undefined || isBlankEvidenceValue(value);
  });

  if (missingFields.length) {
    return {
      name: definition.name,
      status: "fail",
      detail: `${missingFields.length} required evidence fields are missing or still blank.`,
      filePath,
      missingFields,
    };
  }

  return {
    name: definition.name,
    status: "pass",
    detail: `${definition.requiredFields.length} required evidence fields are filled.`,
    filePath,
  };
}

export function buildEvidenceReport(options: {
  cwd?: string;
  env?: Record<string, string | undefined>;
  checkedAt?: string;
} = {}): EvidenceReport {
  const cwd = options.cwd ?? process.cwd();
  const env = options.env ?? process.env;
  const checks = evidenceDefinitions.map((definition): EvidenceCheck => {
    const configuredPath = env[definition.pathEnv]?.trim();
    if (!configuredPath) {
      return {
        name: definition.name,
        status: "warn",
        detail: `${definition.pathEnv} is not configured; use the docs template and set this to the filled evidence file before final launch.`,
      };
    }

    const filePath = path.isAbsolute(configuredPath)
      ? configuredPath
      : path.resolve(cwd, configuredPath);
    return validateEvidenceFile(definition, filePath);
  });

  const status: EvidenceStatus = checks.some((check) => check.status === "fail")
    ? "fail"
    : checks.some((check) => check.status === "warn")
      ? "warn"
      : "pass";

  return {
    status,
    checkedAt: options.checkedAt ?? new Date().toISOString(),
    checks,
  };
}

export function writeEvidenceReport(report: EvidenceReport, cwd = process.cwd()) {
  const outputDir = path.join(cwd, ".launch-readiness");
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(path.join(outputDir, "evidence-report.json"), `${JSON.stringify(report, null, 2)}\n`);
}

function main() {
  loadDotEnv();
  const report = buildEvidenceReport();
  writeEvidenceReport(report);
  console.table(report.checks.map((check) => ({
    check: check.name,
    status: check.status,
    detail: check.detail,
  })));
  console.log(`Launch evidence status: ${report.status}`);
  if (report.status === "fail") process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
