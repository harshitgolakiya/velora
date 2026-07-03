import { NextResponse } from "next/server";
import { reconcileEmailProviderEvent } from "@/lib/email-provider-events";

function stringField(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function objectField(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function extractEvent(raw: unknown) {
  const root = objectField(raw);
  const data = objectField(root.data);
  const attributes = objectField(data.attributes);
  const metric = objectField(attributes.metric);
  const profile = objectField(attributes.profile);
  const mergeFields = objectField(root.merge_fields);
  const recipient =
    stringField(root.email) ??
    stringField(root.recipient) ??
    stringField(root.email_address) ??
    stringField(data.email) ??
    stringField(data.to) ??
    stringField(attributes.email) ??
    stringField(profile.email) ??
    stringField(mergeFields.EMAIL);
  const eventType =
    stringField(root.eventType) ??
    stringField(root.event_type) ??
    stringField(root.type) ??
    stringField(data.type) ??
    stringField(attributes.event_name) ??
    stringField(metric.name);
  if (!recipient || !eventType) return null;
  return {
    provider: stringField(root.provider) ?? stringField(root.source) ?? "GENERIC",
    providerEventId:
      stringField(root.providerEventId) ??
      stringField(root.event_id) ??
      stringField(root.id) ??
      stringField(data.id),
    eventType,
    recipient,
    providerRef:
      stringField(root.providerRef) ??
      stringField(root.message_id) ??
      stringField(data.email_id) ??
      stringField(attributes.message_id),
    sourceKey: stringField(root.sourceKey) ?? stringField(attributes.source_key),
    message:
      stringField(root.message) ??
      stringField(root.reason) ??
      stringField(attributes.reason) ??
      stringField(attributes.status),
    payload: raw,
    occurredAt: stringField(root.occurredAt) || stringField(root.timestamp) || stringField(attributes.datetime)
      ? new Date(stringField(root.occurredAt) ?? stringField(root.timestamp) ?? stringField(attributes.datetime)!)
      : undefined,
  };
}

export async function POST(request: Request) {
  const configuredSecret = process.env.EMAIL_PROVIDER_WEBHOOK_SECRET;
  const providedSecret = request.headers.get("x-velora-email-webhook-secret");
  if (configuredSecret && providedSecret !== configuredSecret) {
    return NextResponse.json({ message: "Invalid webhook secret" }, { status: 401 });
  }
  if (!configuredSecret && process.env.NODE_ENV === "production") {
    return NextResponse.json({ message: "Email provider webhook secret is not configured" }, { status: 503 });
  }

  const payload = await request.json().catch(() => null);
  const rawEvents = Array.isArray(payload) ? payload : Array.isArray(objectField(payload).events) ? objectField(payload).events as unknown[] : [payload];
  const events = rawEvents.map(extractEvent).filter((event): event is NonNullable<ReturnType<typeof extractEvent>> => Boolean(event));
  if (!events.length) return NextResponse.json({ message: "No email provider events found" }, { status: 400 });
  const reconciled = [];
  for (const event of events) reconciled.push(await reconcileEmailProviderEvent(event));
  return NextResponse.json({
    received: rawEvents.length,
    reconciled: reconciled.length,
    events: reconciled.map((event) => ({
      id: event.id,
      eventType: event.eventType,
      recipient: event.recipient,
      alertStatus: event.alertStatus,
    })),
  });
}
