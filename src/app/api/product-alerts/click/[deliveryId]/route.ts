import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ deliveryId: string }> },
) {
  const { deliveryId } = await params;
  const delivery = await prisma.productAlertDelivery.findUnique({
    where: { id: deliveryId },
    include: { subscription: { select: { product: { select: { slug: true } } } } },
  });
  if (!delivery) redirect("/shop");
  if (!delivery.clickedAt) {
    await prisma.productAlertDelivery.update({ where: { id: delivery.id }, data: { clickedAt: new Date() } });
  }
  redirect(`/product/${delivery.subscription.product.slug}?utm_source=product_alert&utm_medium=email&utm_campaign=${delivery.id}`);
}
