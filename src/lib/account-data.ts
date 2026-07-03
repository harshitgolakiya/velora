import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./prisma";

export async function requireCustomerSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) return null;
  return session;
}

export async function getAccountDashboardData(userId: string, email: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      addresses: { orderBy: { id: "desc" } },
      wishlist: {
        include: {
          items: {
            include: {
              product: {
                select: {
                  slug: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const orders = await prisma.order.findMany({
    where: {
      OR: [{ userId }, { email }],
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      items: true,
      payment: true,
      shipment: true,
      shippingAddress: true,
      returnRequests: {
        orderBy: { createdAt: "desc" },
        include: {
          events: { orderBy: { createdAt: "asc" } },
          evidence: { orderBy: { createdAt: "asc" } },
          items: {
            include: {
              orderItem: true,
              requestedVariant: { include: { color: true, size: true } },
            },
          },
        },
      },
    },
  });

  return { user, orders };
}

export async function getActiveAccountOrders(userId: string, email: string) {
  return prisma.order.findMany({
    where: {
      OR: [{ userId }, { email }],
      status: { notIn: ["DELIVERED", "CANCELLED", "REFUNDED"] },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      items: true,
      payment: true,
      shipment: { include: { events: { orderBy: { createdAt: "asc" } } } },
    },
  });
}

export function normalizeUaePhone(phone: string) {
  return phone.trim().replace(/[\s-]/g, "");
}
