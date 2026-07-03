import { createHash } from "node:crypto";
import { prisma } from "./prisma";

export type MarketingSyncResult = {
  provider: string;
  status: "SYNCED" | "SKIPPED" | "FAILED";
  message?: string;
};

async function syncMarketingConsent(email: string, subscribed: boolean): Promise<MarketingSyncResult[]> {
  const integrations = await prisma.emailIntegration.findMany({
    where: { enabled: true },
  });

  return Promise.all(
    integrations.map(async (integration): Promise<MarketingSyncResult> => {
      const apiKey = process.env[integration.apiKeyEnv ?? ""];
      if (!apiKey || !integration.listId) {
        return {
          provider: integration.provider,
          status: "SKIPPED",
          message: "API key or list ID is not configured",
        };
      }

      try {
        if (integration.provider === "MAILCHIMP") {
          const dataCenter = apiKey.split("-").at(-1);
          if (!dataCenter || dataCenter === apiKey) {
            throw new Error("Mailchimp API key must include its data center suffix");
          }
          const subscriberHash = createHash("md5")
            .update(email.toLowerCase())
            .digest("hex");
          const response = await fetch(
            `https://${dataCenter}.api.mailchimp.com/3.0/lists/${integration.listId}/members/${subscriberHash}`,
            {
              method: "PUT",
              headers: {
                Authorization: `Basic ${Buffer.from(`velora:${apiKey}`).toString("base64")}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                email_address: email.toLowerCase(),
                status_if_new: subscribed ? "subscribed" : "unsubscribed",
                status: subscribed ? "subscribed" : "unsubscribed",
              }),
            },
          );
          if (!response.ok) throw new Error(`Mailchimp returned ${response.status}`);
        } else if (integration.provider === "KLAVIYO") {
          const response = await fetch(
            "https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs",
            {
              method: "POST",
              headers: {
                Authorization: `Klaviyo-API-Key ${apiKey}`,
                accept: "application/vnd.api+json",
                "content-type": "application/vnd.api+json",
                revision: "2026-04-15",
              },
              body: JSON.stringify({
                data: {
                  type: "profile-subscription-bulk-create-job",
                  attributes: {
                    profiles: {
                      data: [
                        {
                          type: "profile",
                          attributes: {
                            email: email.toLowerCase(),
                            subscriptions: {
                              email: {
                                marketing: { consent: subscribed ? "SUBSCRIBED" : "UNSUBSCRIBED" },
                              },
                            },
                          },
                        },
                      ],
                    },
                  },
                  relationships: {
                    list: {
                      data: { type: "list", id: integration.listId },
                    },
                  },
                },
              }),
            },
          );
          if (!response.ok) throw new Error(`Klaviyo returned ${response.status}`);
        } else {
          return {
            provider: integration.provider,
            status: "SKIPPED",
            message: "Unsupported provider",
          };
        }
        return { provider: integration.provider, status: "SYNCED" };
      } catch (error) {
        return {
          provider: integration.provider,
          status: "FAILED",
          message: error instanceof Error ? error.message : "Sync failed",
        };
      }
    }),
  );
}

export function syncMarketingSubscriber(email: string) {
  return syncMarketingConsent(email, true);
}

export function syncMarketingUnsubscriber(email: string) {
  return syncMarketingConsent(email, false);
}
