import "server-only";

import { prisma } from "./prisma";

type ActivityWriter = {
  activityLog: {
    create: (args: {
      data: {
        actor: string;
        action: string;
        entityType: string;
        entityId: string | null;
        metadata: string | null;
      };
    }) => Promise<unknown>;
  };
};

export type AdminActivityInput = {
  action: string;
  entityType: string;
  entityId?: string;
  actor?: string;
  metadata?: Record<string, unknown>;
};

export async function recordAdminActivity(
  input: AdminActivityInput,
  client: ActivityWriter = prisma,
) {
  await client.activityLog.create({
    data: {
      actor: input.actor ?? "Super admin",
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    },
  });
}
