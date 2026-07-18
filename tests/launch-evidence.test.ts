import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildEvidenceReport, markdownEvidenceFields } from "../scripts/launch-evidence";

const tempDir = path.join(process.cwd(), ".launch-readiness-test");

afterEach(() => {
  if (existsSync(tempDir)) rmSync(tempDir, { recursive: true, force: true });
});

function writeTempEvidence(filename: string, fields: Record<string, string>) {
  mkdirSync(tempDir, { recursive: true });
  const filePath = path.join(tempDir, filename);
  writeFileSync(filePath, Object.entries(fields).map(([label, value]) => `- ${label}: ${value}`).join("\n"));
  return filePath;
}

describe("launch evidence validation", () => {
  it("parses markdown bullet fields", () => {
    const fields = markdownEvidenceFields("- Reviewer name: Ada\n- Final decision: pass\n");

    expect(fields.get("reviewer name")).toBe("Ada");
    expect(fields.get("final decision")).toBe("pass");
  });

  it("warns when evidence paths are not configured", () => {
    const report = buildEvidenceReport({ env: {}, checkedAt: "2026-07-08T00:00:00.000Z" });

    expect(report.status).toBe("warn");
    expect(report.checks).toHaveLength(3);
    expect(report.checks.every((check) => check.status === "warn")).toBe(true);
  });

  it("fails when configured evidence still has blank or choice-placeholder fields", () => {
    const providerFile = writeTempEvidence("provider.md", {
      "Production provider": "Turso",
      "Database name / project": "velora-prod",
      "Backup identifier": "backup-20260708",
      "Backup completed at": "2026-07-08 14:00 UTC",
      "Backup storage location": "provider vault",
      "Staging provider": "Turso",
      "Staging database name / project": "velora-staging-restore",
      "Restore completed at": "2026-07-08 14:30 UTC",
      "Restored application URL": "https://staging.velora.ae",
      "Migration version after restore": "20260708143000",
      "`prisma migrate deploy` result": "pass",
      "`/api/health` result": "200 ok",
      "`/api/admin/ops/health` result": "pass",
      "`npm run release:check` result or CI URL": "",
      "Restore drill status": "pass / conditional pass / failed",
      "Evidence URL for `BACKUP_RESTORE_RUNBOOK_URL`": "https://ops.velora.ae/evidence/restore-2026-07-08",
    });

    const report = buildEvidenceReport({
      env: { PROVIDER_RESTORE_EVIDENCE_PATH: providerFile },
      checkedAt: "2026-07-08T00:00:00.000Z",
    });

    expect(report.status).toBe("fail");
    expect(report.checks[0].missingFields).toEqual([
      "`npm run release:check` result or CI URL",
      "Restore drill status",
    ]);
  });
});
