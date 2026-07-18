import "server-only";

export type LogLevel = "debug" | "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

const levelWeight: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const sensitiveKeyPattern = /(password|secret|token|api[_-]?key|authorization|cookie|session|webhook|private)/i;

function activeLogLevel(): LogLevel {
  const value = process.env.LOG_LEVEL?.toLowerCase();
  return value === "debug" || value === "info" || value === "warn" || value === "error"
    ? value
    : process.env.NODE_ENV === "production" ? "info" : "debug";
}

function shouldLog(level: LogLevel) {
  return levelWeight[level] >= levelWeight[activeLogLevel()];
}

export function redactLogValue(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[truncated]";
  if (value == null) return value;
  if (typeof value === "string") return value.length > 500 ? `${value.slice(0, 500)}...` : value;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Error) return { name: value.name, message: value.message, stack: value.stack };
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => redactLogValue(item, depth + 1));
  if (typeof value !== "object") return String(value);

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      sensitiveKeyPattern.test(key) ? "[redacted]" : redactLogValue(item, depth + 1),
    ]),
  );
}

export function buildLogEvent(level: LogLevel, message: string, context: LogContext = {}) {
  return {
    level,
    message,
    service: "velora",
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    release: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.RELEASE_VERSION ?? "local",
    timestamp: new Date().toISOString(),
    ...redactLogValue(context) as LogContext,
  };
}

export function writeLog(level: LogLevel, message: string, context: LogContext = {}) {
  if (!shouldLog(level)) return;
  const payload = JSON.stringify(buildLogEvent(level, message, context));
  if (level === "error") console.error(payload);
  else if (level === "warn") console.warn(payload);
  else console.log(payload);
}

export const logger = {
  debug: (message: string, context?: LogContext) => writeLog("debug", message, context),
  info: (message: string, context?: LogContext) => writeLog("info", message, context),
  warn: (message: string, context?: LogContext) => writeLog("warn", message, context),
  error: (message: string, context?: LogContext) => writeLog("error", message, context),
};

export async function notifyMonitoring(input: {
  severity: "info" | "warn" | "error";
  title: string;
  context?: LogContext;
}) {
  const endpoint = process.env.MONITORING_WEBHOOK_URL;
  if (!endpoint) return { sent: false, reason: "not_configured" as const };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(process.env.MONITORING_WEBHOOK_SECRET
        ? { "x-velora-monitoring-secret": process.env.MONITORING_WEBHOOK_SECRET }
        : {}),
    },
    body: JSON.stringify(buildLogEvent(input.severity, input.title, input.context)),
  });

  return { sent: response.ok, status: response.status };
}

export async function captureException(error: unknown, context: LogContext = {}) {
  const normalized = error instanceof Error ? error : new Error(String(error));
  logger.error(normalized.message, { ...context, error: normalized });
  return notifyMonitoring({
    severity: "error",
    title: normalized.message,
    context: { ...context, error: normalized },
  });
}
