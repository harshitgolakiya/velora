import "server-only";

import { processDueAutomationEvents } from "./automation-events";
import { expireStaleCartReservations } from "./cart-reservations";
import { publishDuePageContent } from "./content-cms";
import { processProductAlertQueue } from "./product-alert-queue";
import {
  publishDueScheduledCollections,
  publishDueScheduledHomepageSections,
  publishDueScheduledProducts,
} from "./scheduled-publishing";

export const maintenanceJobNames = [
  "cartReservations",
  "scheduledPublishing",
  "automation",
  "productAlerts",
] as const;

export type MaintenanceJobName = (typeof maintenanceJobNames)[number];

export type MaintenanceJobResult = {
  name: MaintenanceJobName;
  status: "success" | "failed";
  metrics: Record<string, number>;
  error?: string;
};

export type MaintenanceJobRun = {
  ok: boolean;
  ranAt: string;
  jobs: MaintenanceJobResult[];
  totals: {
    failedJobs: number;
    processedJobs: number;
  };
};

export type MaintenanceJobOptions = {
  now?: Date;
  only?: MaintenanceJobName[];
  automationLimit?: number;
  productAlertLimit?: number;
};

async function runStep(
  name: MaintenanceJobName,
  task: () => Promise<Record<string, number>>,
): Promise<MaintenanceJobResult> {
  try {
    return {
      name,
      status: "success",
      metrics: await task(),
    };
  } catch (error) {
    return {
      name,
      status: "failed",
      metrics: {},
      error: error instanceof Error ? error.message : "Maintenance job failed",
    };
  }
}

function shouldRun(name: MaintenanceJobName, only?: MaintenanceJobName[]) {
  return !only?.length || only.includes(name);
}

export async function runMaintenanceJobs(options: MaintenanceJobOptions = {}): Promise<MaintenanceJobRun> {
  const now = options.now ?? new Date();
  const jobs: MaintenanceJobResult[] = [];

  if (shouldRun("cartReservations", options.only)) {
    jobs.push(await runStep("cartReservations", async () => ({
      expiredCarts: await expireStaleCartReservations(now),
    })));
  }

  if (shouldRun("scheduledPublishing", options.only)) {
    jobs.push(await runStep("scheduledPublishing", async () => {
      const [products, homepageSections, collections, pages] = await Promise.all([
        publishDueScheduledProducts(now, { force: true }),
        publishDueScheduledHomepageSections(now),
        publishDueScheduledCollections(now),
        publishDuePageContent(now),
      ]);
      return {
        products: products.count,
        homepageSections: homepageSections.count,
        collections: collections.count,
        pages: pages.count,
      };
    }));
  }

  if (shouldRun("automation", options.only)) {
    jobs.push(await runStep("automation", () =>
      processDueAutomationEvents({ limit: options.automationLimit }),
    ));
  }

  if (shouldRun("productAlerts", options.only)) {
    jobs.push(await runStep("productAlerts", () =>
      processProductAlertQueue(options.productAlertLimit),
    ));
  }

  const failedJobs = jobs.filter((job) => job.status === "failed").length;
  return {
    ok: failedJobs === 0,
    ranAt: now.toISOString(),
    jobs,
    totals: {
      failedJobs,
      processedJobs: jobs.length,
    },
  };
}
