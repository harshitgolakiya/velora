import "server-only";

import { CartStatus } from "@prisma/client";
import { prisma } from "./prisma";

export type BusinessHealthStatus = "ok" | "degraded" | "action_required";

type BusinessHealthIssue = {
  code: string;
  severity: "warn" | "critical";
  message: string;
  count: number;
};

export async function getBusinessHealth(now = new Date()) {
  const [
    failedEmailDeliveries,
    retryingEmailDeliveries,
    failedAutomationEvents,
    dueAutomationEvents,
    failedProductAlerts,
    exhaustedProductAlerts,
    returnIntegrationActions,
    expiredActiveCarts,
  ] = await Promise.all([
    prisma.emailDelivery.count({ where: { status: "FAILED" } }),
    prisma.emailDelivery.count({ where: { status: "RETRYING", nextAttemptAt: { lte: now } } }),
    prisma.automationEvent.count({ where: { status: "FAILED" } }),
    prisma.automationEvent.count({ where: { status: "PENDING", scheduledAt: { lte: now } } }),
    prisma.productAlertDelivery.count({ where: { status: "FAILED", nextAttemptAt: { lte: now } } }),
    prisma.productAlertDelivery.count({ where: { status: "EXHAUSTED" } }),
    prisma.returnIntegrationAttempt.count({ where: { status: { in: ["FAILED", "MANUAL_REQUIRED"] } } }),
    prisma.cart.count({ where: { status: { in: [CartStatus.ACTIVE, CartStatus.CHECKOUT] }, expiresAt: { lt: now } } }),
  ]);

  const issues: BusinessHealthIssue[] = [];
  if (failedEmailDeliveries) {
    issues.push({ code: "failed_email_deliveries", severity: "critical", message: "Email deliveries need operator review.", count: failedEmailDeliveries });
  }
  if (retryingEmailDeliveries) {
    issues.push({ code: "retrying_email_deliveries", severity: "warn", message: "Email deliveries are due for retry.", count: retryingEmailDeliveries });
  }
  if (failedAutomationEvents) {
    issues.push({ code: "failed_automation_events", severity: "warn", message: "Automation events failed processing.", count: failedAutomationEvents });
  }
  if (dueAutomationEvents > 100) {
    issues.push({ code: "automation_backlog", severity: "warn", message: "Automation event backlog is above the expected queue size.", count: dueAutomationEvents });
  }
  if (failedProductAlerts) {
    issues.push({ code: "failed_product_alerts", severity: "warn", message: "Product alert deliveries are due for retry.", count: failedProductAlerts });
  }
  if (exhaustedProductAlerts) {
    issues.push({ code: "exhausted_product_alerts", severity: "critical", message: "Product alert deliveries exhausted retry attempts.", count: exhaustedProductAlerts });
  }
  if (returnIntegrationActions) {
    issues.push({ code: "return_integration_actions", severity: "critical", message: "Return carrier integrations require manual action.", count: returnIntegrationActions });
  }
  if (expiredActiveCarts > 50) {
    issues.push({ code: "expired_cart_backlog", severity: "warn", message: "Expired active carts need reservation cleanup.", count: expiredActiveCarts });
  }

  const status: BusinessHealthStatus = issues.some((issue) => issue.severity === "critical")
    ? "action_required"
    : issues.length ? "degraded" : "ok";

  return {
    status,
    checkedAt: now.toISOString(),
    metrics: {
      failedEmailDeliveries,
      retryingEmailDeliveries,
      failedAutomationEvents,
      dueAutomationEvents,
      failedProductAlerts,
      exhaustedProductAlerts,
      returnIntegrationActions,
      expiredActiveCarts,
    },
    issues,
  };
}
