import { NextResponse } from "next/server";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = await requireAdminApiPermission("admin:read");
  if ("response" in auth) return auth.response;

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) return NextResponse.json({ results: [] });

  const [products, orders, customers, media] = await Promise.all([
    prisma.product.findMany({
      where: {
        OR: [
          { title: { contains: query } },
          { sku: { contains: query } },
          { slug: { contains: query } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: { id: true, title: true, sku: true, slug: true, status: true },
    }),
    prisma.order.findMany({
      where: {
        OR: [
          { orderNumber: { contains: query } },
          { email: { contains: query } },
          { shippingAddress: { is: { name: { contains: query } } } },
          { shippingAddress: { is: { phone: { contains: query } } } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, orderNumber: true, email: true, status: true },
    }),
    prisma.user.findMany({
      where: {
        role: "CUSTOMER",
        OR: [
          { name: { contains: query } },
          { email: { contains: query } },
          { addresses: { some: { phone: { contains: query } } } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: { id: true, name: true, email: true },
    }),
    prisma.mediaAsset.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { originalName: { contains: query } },
          { folder: { contains: query } },
          { tags: { contains: query } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, name: true, originalName: true, mediaType: true },
    }),
  ]);

  return NextResponse.json({
    results: [
      ...products.map((product) => ({
        id: product.id,
        section: "products",
        title: product.title,
        subtitle: `${product.sku} · ${product.status.toLowerCase()}`,
        href: `/admin/products/${product.id}`,
      })),
      ...orders.map((order) => ({
        id: order.id,
        section: "orders",
        title: order.orderNumber,
        subtitle: `${order.email} · ${order.status.toLowerCase()}`,
      })),
      ...customers.map((customer) => ({
        id: customer.id,
        section: "customers",
        title: customer.name ?? customer.email,
        subtitle: customer.email,
      })),
      ...media.map((asset) => ({
        id: asset.id,
        section: "media",
        title: asset.name,
        subtitle: `${asset.originalName} · ${asset.mediaType.toLowerCase()}`,
      })),
    ],
  });
}
