import { NextResponse } from "next/server";
import { z } from "zod";
import { recordAdminActivity } from "@/lib/admin-activity";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";

const updateCustomerSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().email().optional(),
  notes: z.string().max(1000).optional(),
  tags: z.array(z.string().trim().min(1)).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiPermission("orders:write");
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const parsed = updateCustomerSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid customer payload", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const customer = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, customerNotes: true, customerTags: true },
  });

  if (!customer) {
    return NextResponse.json({ message: "Customer not found" }, { status: 404 });
  }

  if (parsed.data.email && parsed.data.email !== customer.email) {
    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true },
    });
    if (existing && existing.id !== customer.id) {
      return NextResponse.json({ message: "Another customer already uses this email" }, { status: 409 });
    }
  }

  const normalizedTags = parsed.data.tags
    ? Array.from(new Set(parsed.data.tags.map((tag) => tag.trim()).filter(Boolean)))
    : parseCustomerTags(customer.customerTags);

  const updated = await prisma.user.update({
    where: { id },
    data: {
      name: parsed.data.name ?? customer.name,
      email: parsed.data.email ?? customer.email,
      customerNotes: parsed.data.notes !== undefined ? parsed.data.notes.trim() || null : customer.customerNotes,
      customerTags: JSON.stringify(normalizedTags),
    },
  });

  await recordAdminActivity({
    action: `Updated customer ${updated.email} profile`,
    entityType: "customer",
    entityId: updated.id,
    actor: auth.access.name,
    metadata: {
      previousName: customer.name,
      nextName: updated.name,
      previousEmail: customer.email,
      nextEmail: updated.email,
      previousNotes: customer.customerNotes,
      nextNotes: updated.customerNotes,
      previousTags: customer.customerTags,
      nextTags: normalizedTags,
    },
  });

  return NextResponse.json({
    customer: {
      id: updated.id,
      name: updated.name ?? updated.email,
      email: updated.email,
      notes: updated.customerNotes ?? undefined,
      tags: normalizedTags,
    },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiPermission("orders:write");
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const payload = await request.json().catch(() => ({}));
  if (payload?.action !== "merge_guest_orders") {
    return NextResponse.json({ message: "Unsupported customer action" }, { status: 400 });
  }

  const customer = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, marketingEmails: true },
  });

  if (!customer) {
    return NextResponse.json({ message: "Customer not found" }, { status: 404 });
  }

  const [guestOrders, guestCarts, guestProductAlerts, subscriber] = await Promise.all([
    prisma.order.findMany({
      where: {
        userId: null,
        email: customer.email,
      },
      select: {
        id: true,
        shippingAddressId: true,
        billingAddressId: true,
      },
    }),
    prisma.cart.findMany({
      where: {
        userId: null,
        email: customer.email,
      },
      select: { id: true },
    }),
    prisma.productAlertSubscription.findMany({
      where: {
        userId: null,
        email: customer.email,
      },
      select: { id: true },
    }),
    prisma.newsletterSubscriber.findUnique({
      where: { email: customer.email },
      select: { status: true },
    }),
  ]);

  const guestOrderIds = guestOrders.map((order) => order.id);
  const guestCartIds = guestCarts.map((cart) => cart.id);
  const guestProductAlertIds = guestProductAlerts.map((alert) => alert.id);
  const marketingEmails =
    subscriber?.status === "SUBSCRIBED"
      ? true
      : subscriber?.status === "UNSUBSCRIBED"
        ? false
        : customer.marketingEmails;
  const marketingPreferenceChanged = marketingEmails !== customer.marketingEmails;

  if (!guestOrders.length && !guestCarts.length && !guestProductAlerts.length && !marketingPreferenceChanged) {
    return NextResponse.json({
      message: "No guest records found for this customer",
      mergedOrders: 0,
      mergedCarts: 0,
      mergedProductAlerts: 0,
    });
  }

  const addressIds = Array.from(
    new Set(
      guestOrders
        .flatMap((order) => [order.shippingAddressId, order.billingAddressId])
        .filter((addressId): addressId is string => Boolean(addressId)),
    ),
  );

  const operations = [];
  if (guestOrderIds.length) {
    operations.push(
      prisma.order.updateMany({
        where: { id: { in: guestOrderIds } },
        data: { userId: customer.id },
      }),
    );
  }
  if (addressIds.length) {
    operations.push(
      prisma.address.updateMany({
        where: { id: { in: addressIds }, userId: null },
        data: { userId: customer.id },
      }),
    );
  }
  if (guestCartIds.length) {
    operations.push(
      prisma.cart.updateMany({
        where: { id: { in: guestCartIds }, userId: null },
        data: { userId: customer.id },
      }),
    );
  }
  if (guestProductAlertIds.length) {
    operations.push(
      prisma.productAlertSubscription.updateMany({
        where: { id: { in: guestProductAlertIds }, userId: null },
        data: { userId: customer.id },
      }),
    );
  }
  if (marketingPreferenceChanged) {
    operations.push(
      prisma.user.update({
        where: { id: customer.id },
        data: { marketingEmails },
      }),
    );
  }

  if (operations.length) {
    await prisma.$transaction(operations);
  }

  await recordAdminActivity({
    action: `Merged guest records into ${customer.email}`,
    entityType: "customer",
    entityId: customer.id,
    actor: auth.access.name,
    metadata: {
      mergedOrderIds: guestOrderIds,
      mergedCartIds: guestCartIds,
      mergedProductAlertIds: guestProductAlertIds,
      addressIds,
      marketingPreference: marketingPreferenceChanged
        ? { previous: customer.marketingEmails, next: marketingEmails, source: "newsletter_subscriber" }
        : undefined,
    },
  });

  return NextResponse.json({
    customer: {
      id: customer.id,
      name: customer.name ?? customer.email,
      email: customer.email,
    },
    mergedOrders: guestOrders.length,
    mergedCarts: guestCarts.length,
    mergedProductAlerts: guestProductAlerts.length,
    marketingEmails,
    mergedOrderIds: guestOrderIds,
    mergedCartIds: guestCartIds,
    mergedProductAlertIds: guestProductAlertIds,
    mergedAddressIds: addressIds,
  });
}

function parseCustomerTags(value: string | null | undefined) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((tag): tag is string => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean);
  } catch {
    return [];
  }
}
