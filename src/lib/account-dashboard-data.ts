import type { Product } from "@/lib/catalog";
import type { AccountDashboardProps } from "@/components/auth/account-dashboard";
import type { getAccountDashboardData } from "@/lib/account-data";

type DashboardData = Awaited<ReturnType<typeof getAccountDashboardData>>;

export function mapAccountDashboardProps(
  data: DashboardData & { user: NonNullable<DashboardData["user"]> },
  catalogProducts: Product[],
): Omit<AccountDashboardProps, "section"> {
  const { user, orders } = data;
  return {
    initialUser: {
      name: user.name,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
      marketingEmails: user.marketingEmails,
      productAlertEmails: user.productAlertEmails,
      postPurchaseEmails: user.postPurchaseEmails,
      preferredSize: user.preferredSize,
      fitPreference: user.fitPreference,
      compressionPreference: user.compressionPreference,
      hasPassword: Boolean(user.passwordHash),
    },
    initialAddresses: user.addresses.map((address) => ({
      id: address.id,
      name: address.name,
      phone: address.phone,
      line1: address.line1,
      line2: address.line2,
      city: address.city,
      country: address.country,
      postalCode: address.postalCode,
    })),
    initialOrders: orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.payment?.status ?? order.paymentStatus,
      paymentProvider: order.payment?.provider,
      fulfillmentStatus: order.fulfillmentStatus,
      total: Number(order.total),
      createdAt: order.createdAt.toISOString(),
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      trackingNo: order.shipment?.trackingNo,
      items: order.items.map((item) => ({
        title: item.title,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        unitPrice: Number(item.unitPrice),
      })),
    })),
    initialReturns: orders.flatMap((order) => order.returnRequests.map((request) => ({
      id: request.id,
      orderNumber: order.orderNumber,
      resolution: request.resolution,
      reason: request.reason,
      status: request.status,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
      items: request.items.map((item) => ({
        title: item.orderItem.title,
        color: item.orderItem.color,
        originalSize: item.orderItem.size,
        requestedSize: item.requestedSize ?? item.requestedVariant?.size.name ?? null,
        quantity: item.quantity,
      })),
    }))),
    initialWishlistSlugs: user.wishlist?.items.map((item) => item.product.slug) ?? [],
    initialWishlistIntents: Object.fromEntries(user.wishlist?.items.map((item) => [item.product.slug, {
      variantId: item.variantId ?? undefined,
      color: item.color ?? undefined,
      size: item.size ?? undefined,
    }]) ?? []),
    catalogProducts,
  };
}
