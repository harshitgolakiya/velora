import { existsSync, unlinkSync, writeFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import {
  envProblem,
  envProblems,
  isPlaceholderEnv,
  loadDotEnv,
  recommendedProductionEnv,
  requiredProductionEnv,
} from "../scripts/readiness-env";

const touchedEnv = new Set<string>();
const tempFiles = new Set<string>();

function setEnv(name: string, value: string | undefined) {
  touchedEnv.add(name);
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

afterEach(() => {
  for (const name of touchedEnv) delete process.env[name];
  touchedEnv.clear();
  for (const file of tempFiles) {
    if (existsSync(file)) unlinkSync(file);
  }
  tempFiles.clear();
});

describe("readiness env checks", () => {
  it("flags obvious placeholder and local production values", () => {
    expect(isPlaceholderEnv("NEXTAUTH_URL", "http://localhost:3000")).toBe(true);
    expect(isPlaceholderEnv("NEXTAUTH_SECRET", "replace-with-a-long-random-secret")).toBe(true);
    expect(isPlaceholderEnv("NEXT_PUBLIC_SITE_URL", "https://example.com")).toBe(true);
    expect(isPlaceholderEnv("NEXT_PUBLIC_SITE_URL", "https://velora.test")).toBe(true);
    expect(isPlaceholderEnv("DATABASE_URL", "file:./prisma/dev.db")).toBe(false);
    expect(isPlaceholderEnv("NEXT_PUBLIC_SITE_URL", "https://velora.ae")).toBe(false);
  });

  it("requires production-shaped urls, secrets, sender, and Stripe values", () => {
    setEnv("NEXTAUTH_URL", "http://velora.ae");
    setEnv("NEXTAUTH_SECRET", "short");
    setEnv("STRIPE_SECRET_KEY", "sk_test_12345678901234567890");
    setEnv("STRIPE_WEBHOOK_SECRET", "whsec_short");
    setEnv("EMAIL_FROM", "Velora");

    expect(envProblem("NEXTAUTH_URL")).toBe("NEXTAUTH_URL must be an https URL");
    expect(envProblem("NEXTAUTH_SECRET")).toBe("NEXTAUTH_SECRET must be at least 32 characters");
    expect(envProblem("STRIPE_SECRET_KEY")).toBe("STRIPE_SECRET_KEY must use a live Stripe secret key");
    expect(envProblem("STRIPE_WEBHOOK_SECRET")).toBe("STRIPE_WEBHOOK_SECRET must look like a Stripe webhook signing secret");
    expect(envProblem("EMAIL_FROM")).toBe("EMAIL_FROM must include a valid sender email");
  });

  it("reports missing and placeholder required variables", () => {
    for (const name of requiredProductionEnv) setEnv(name, undefined);
    setEnv("DATABASE_URL", "file:./prisma/dev.db");
    setEnv("NEXTAUTH_SECRET", "replace-with-secret");
    setEnv("NEXTAUTH_URL", "https://velora.ae");
    setEnv("NEXT_PUBLIC_SITE_URL", "https://velora.ae");

    expect(envProblems(requiredProductionEnv)).toEqual([
      "NEXTAUTH_SECRET placeholder/local value",
      "ADMIN_JOB_SECRET missing",
    ]);
  });

  it("accepts production-shaped required and recommended variables", () => {
    const values: Record<string, string> = {
      DATABASE_URL: "file:./prisma/dev.db",
      NEXTAUTH_SECRET: "fixtureprodsecretfixtureprodsecret",
      NEXTAUTH_URL: "https://velora.ae",
      NEXT_PUBLIC_SITE_URL: "https://velora.ae",
      ADMIN_JOB_SECRET: "fixtureprodjobsecretprodjobsecret",
      NEWSLETTER_TOKEN_SECRET: "fixturenewslettersecretnewsletter",
      MONITORING_WEBHOOK_URL: "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX",
      MONITORING_WEBHOOK_SECRET: "fixturemonitorsecretmonitorsecret",
      EMAIL_PROVIDER_WEBHOOK_SECRET: "fixtureemailwebhooksecret",
      BACKUP_RESTORE_RUNBOOK_URL: "https://ops.velora.ae/evidence/restore-2026-07-08",
      ASSISTIVE_TECH_SIGNOFF_URL: "https://ops.velora.ae/evidence/a11y-2026-07-08",
      STRIPE_SECRET_KEY: "sk_live_fixture000000000000000000000000000000000000000000000000000000000000",
      STRIPE_WEBHOOK_SECRET: "whsec_fixture000000000000000000000000",
      EMAIL_FROM: "Velora <orders@velora.ae>",
      SMTP_HOST: "mail.velora.ae",
      SMTP_USER: "orders@velora.ae",
      SMTP_PASSWORD: "fixture-smtp-password",
      SUPPORT_EMAIL: "support@velora.ae",
      ADMIN_NOTIFICATION_EMAIL: "ops@velora.ae",
    };
    for (const [name, value] of Object.entries(values)) setEnv(name, value);

    expect(envProblems(requiredProductionEnv)).toEqual([]);
    expect(envProblems(recommendedProductionEnv)).toEqual([]);
  });

  it("loads dotenv values without overwriting existing process env", () => {
    const filename = `.readiness-env-test-${Date.now()}.env`;
    tempFiles.add(filename);
    writeFileSync(filename, [
      "NEXTAUTH_SECRET=\"from-file\"",
      "NEXTAUTH_URL=https://velora.ae",
      "ADMIN_JOB_SECRET=file-fixture-secret",
    ].join("\n"));
    setEnv("NEXTAUTH_SECRET", "existing-secret");
    touchedEnv.add("NEXTAUTH_URL");
    touchedEnv.add("ADMIN_JOB_SECRET");

    loadDotEnv(filename);

    expect(process.env.NEXTAUTH_SECRET).toBe("existing-secret");
    expect(process.env.NEXTAUTH_URL).toBe("https://velora.ae");
    expect(process.env.ADMIN_JOB_SECRET).toBe("file-fixture-secret");
  });
});
