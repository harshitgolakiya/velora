import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const placeholderPattern = /replace-with|localhost|example|\.test(?:\/|$)|changeme|your-|placeholder/i;
const httpsUrlEnv = new Set([
  "NEXTAUTH_URL",
  "NEXT_PUBLIC_SITE_URL",
  "MONITORING_WEBHOOK_URL",
  "BACKUP_RESTORE_RUNBOOK_URL",
  "ASSISTIVE_TECH_SIGNOFF_URL",
  "PAYPAL_API_BASE",
  "TABBY_API_BASE",
  "MALWARE_SCAN_API_URL",
  "RETURN_CARRIER_API_URL",
]);
const minLengthEnv: Record<string, number> = {
  NEXTAUTH_SECRET: 32,
  NEWSLETTER_TOKEN_SECRET: 32,
  ADMIN_JOB_SECRET: 24,
  MONITORING_WEBHOOK_SECRET: 24,
  EMAIL_PROVIDER_WEBHOOK_SECRET: 24,
  RETURN_CARRIER_WEBHOOK_SECRET: 24,
};

export const requiredProductionEnv = [
  "DATABASE_URL",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
  "NEXT_PUBLIC_SITE_URL",
  "ADMIN_JOB_SECRET",
] as const;

export const recommendedProductionEnv = [
  "NEWSLETTER_TOKEN_SECRET",
  "MONITORING_WEBHOOK_URL",
  "MONITORING_WEBHOOK_SECRET",
  "BACKUP_RESTORE_RUNBOOK_URL",
  "ASSISTIVE_TECH_SIGNOFF_URL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "EMAIL_FROM",
  "SMTP_HOST",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "SUPPORT_EMAIL",
  "ADMIN_NOTIFICATION_EMAIL",
  "EMAIL_PROVIDER_WEBHOOK_SECRET",
] as const;

export function loadDotEnv(filename = ".env") {
  const filePath = path.join(process.cwd(), filename);
  if (!existsSync(filePath)) return;

  const content = readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = /^([A-Z0-9_]+)\s*=\s*(.*)$/.exec(trimmed);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

export function envValue(name: string) {
  return process.env[name]?.trim() ?? "";
}

export function isPlaceholderEnv(name: string, value: string) {
  if (!value) return false;
  if (name === "DATABASE_URL" && value.startsWith("file:")) return false;
  return placeholderPattern.test(value);
}

function isHttpsUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname);
  } catch {
    return false;
  }
}

export function envProblem(name: string) {
  const value = envValue(name);
  if (!value) return `${name} missing`;
  if (isPlaceholderEnv(name, value)) return `${name} placeholder/local value`;
  if (httpsUrlEnv.has(name) && !isHttpsUrl(value)) return `${name} must be an https URL`;
  if (minLengthEnv[name] && value.length < minLengthEnv[name]) {
    return `${name} must be at least ${minLengthEnv[name]} characters`;
  }
  if (name === "STRIPE_SECRET_KEY" && !value.startsWith("sk_live_")) {
    return `${name} must use a live Stripe secret key`;
  }
  if (name === "STRIPE_WEBHOOK_SECRET" && !/^whsec_[A-Za-z0-9_]{16,}$/.test(value)) {
    return `${name} must look like a Stripe webhook signing secret`;
  }
  if (name === "EMAIL_FROM" && !/^[^<>\s]+@[^<>\s]+\.[^<>\s]+$/.test(value) && !/<[^<>\s]+@[^<>\s]+\.[^<>\s]+>/.test(value)) {
    return `${name} must include a valid sender email`;
  }
  if ((name === "SUPPORT_EMAIL" || name === "ADMIN_NOTIFICATION_EMAIL") && !/^[^<>\s]+@[^<>\s]+\.[^<>\s]+$/.test(value)) {
    return `${name} must be a valid email address`;
  }
  if (name === "PAYPAL_ENVIRONMENT" && !["sandbox", "live", "production"].includes(value.toLowerCase())) {
    return `${name} must be sandbox, live, or production`;
  }
  if (name === "MALWARE_SCAN_REQUIRED" && !["true", "false"].includes(value.toLowerCase())) {
    return `${name} must be true or false`;
  }
  return null;
}

export function envProblems(names: readonly string[]) {
  return names.map((name) => envProblem(name)).filter((problem): problem is string => Boolean(problem));
}
