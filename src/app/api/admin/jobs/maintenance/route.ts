import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { recordAdminActivity } from "@/lib/admin-activity";
import {
  maintenanceJobNames,
  runMaintenanceJobs,
  type MaintenanceJobName,
} from "@/lib/maintenance-jobs";

const bodySchema = z.object({
  jobs: z.array(z.enum(maintenanceJobNames)).optional(),
  automationLimit: z.coerce.number().int().min(1).max(250).optional(),
  productAlertLimit: z.coerce.number().int().min(1).max(100).optional(),
}).optional();

function hasJobSecret(request: NextRequest) {
  const secret = process.env.ADMIN_JOB_SECRET;
  if (!secret) return false;
  const authorization = request.headers.get("authorization");
  return authorization === `Bearer ${secret}`;
}

async function parseBody(request: NextRequest) {
  const raw = await request.json().catch(() => undefined);
  const parsed = bodySchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export async function POST(request: NextRequest) {
  let actor = "Scheduled job";

  if (!hasJobSecret(request)) {
    const auth = await requireAdminApiPermission("security:write");
    if ("response" in auth) return auth.response;
    actor = auth.access.name;
  }

  const body = await parseBody(request);
  if (body === null) {
    return NextResponse.json({ message: "Invalid maintenance job payload" }, { status: 400 });
  }

  const result = await runMaintenanceJobs({
    only: body?.jobs as MaintenanceJobName[] | undefined,
    automationLimit: body?.automationLimit,
    productAlertLimit: body?.productAlertLimit,
  });

  await recordAdminActivity({
    actor,
    action: result.ok
      ? `Ran maintenance jobs (${result.totals.processedJobs} completed)`
      : `Ran maintenance jobs (${result.totals.failedJobs} failed)`,
    entityType: "maintenance_job",
    metadata: result,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
