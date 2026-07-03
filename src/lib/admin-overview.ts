import type {
  AdminCartAnalytics,
  AdminCustomer,
  AdminInventoryRow,
  AdminOrder,
  AdminProduct,
} from "./admin-catalog";

export type OverviewRange = "Today" | "Week" | "Month" | "Quarter";

const rangeDays: Record<OverviewRange, number> = {
  Today: 1,
  Week: 7,
  Month: 30,
  Quarter: 90,
};

const isRevenueOrder = (order: AdminOrder) =>
  !["CANCELLED", "REFUNDED"].includes(order.status) &&
  (order.paymentStatus.toLowerCase() === "paid" || order.status === "PAID");

function percentageDelta(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export function buildAdminOverview(
  {
    orders,
    customers,
    products,
    inventory,
    cartAnalytics,
  }: {
    orders: AdminOrder[];
    customers: AdminCustomer[];
    products: AdminProduct[];
    inventory: AdminInventoryRow[];
    cartAnalytics: AdminCartAnalytics;
  },
  range: OverviewRange,
  now = new Date(),
) {
  const days = rangeDays[range];
  const periodMs = days * 86_400_000;
  const currentStart = now.getTime() - periodMs;
  const previousStart = currentStart - periodMs;
  const currentOrders = orders.filter(
    (order) => new Date(order.createdAt).getTime() >= currentStart,
  );
  const previousOrders = orders.filter((order) => {
    const created = new Date(order.createdAt).getTime();
    return created >= previousStart && created < currentStart;
  });
  const currentPaid = currentOrders.filter(isRevenueOrder);
  const previousPaid = previousOrders.filter(isRevenueOrder);
  const revenue = currentPaid.reduce((sum, order) => sum + order.total, 0);
  const previousRevenue = previousPaid.reduce(
    (sum, order) => sum + order.total,
    0,
  );
  const averageOrderValue = currentPaid.length
    ? revenue / currentPaid.length
    : 0;
  const previousAov = previousPaid.length
    ? previousRevenue / previousPaid.length
    : 0;

  const bucketCount = range === "Quarter" ? 12 : range === "Month" ? 10 : days;
  const bucketMs = periodMs / bucketCount;
  const timeline = Array.from({ length: bucketCount }, (_, index) => {
    const start = currentStart + index * bucketMs;
    const end = start + bucketMs;
    const bucketOrders = currentPaid.filter((order) => {
      const created = new Date(order.createdAt).getTime();
      return created >= start && created < end;
    });
    const date = new Date(start);
    return {
      label:
        range === "Today"
          ? date.toLocaleTimeString("en-AE", { hour: "numeric" })
          : date.toLocaleDateString("en-AE", {
              day: "numeric",
              month: range === "Quarter" ? "short" : undefined,
            }),
      revenue: bucketOrders.reduce((sum, order) => sum + order.total, 0),
      orders: bucketOrders.length,
    };
  });

  const productSales = new Map<
    string,
    { productId: string; title: string; units: number; revenue: number }
  >();
  for (const order of currentPaid) {
    for (const item of order.items) {
      const existing = productSales.get(item.productId) ?? {
        productId: item.productId,
        title: item.title,
        units: 0,
        revenue: 0,
      };
      existing.units += item.quantity;
      existing.revenue += item.quantity * item.unitPrice;
      productSales.set(item.productId, existing);
    }
  }

  const topProducts = [...productSales.values()]
    .sort((a, b) => b.units - a.units)
    .slice(0, 5);
  const atRiskInventory = inventory
    .filter((row) => row.status !== "In stock")
    .sort((a, b) => a.availableStock - b.availableStock)
    .slice(0, 8);
  const pendingOrders = orders.filter((order) =>
    ["PENDING", "PROCESSING"].includes(order.status),
  );
  const unpaidOrders = orders.filter(
    (order) => order.paymentStatus.toLowerCase() !== "paid",
  );
  const unfulfilledOrders = orders.filter(
    (order) =>
      !["fulfilled", "shipped", "delivered"].includes(
        order.fulfillmentStatus.toLowerCase(),
      ) && !["CANCELLED", "REFUNDED"].includes(order.status),
  );
  const returningCustomers = customers.filter(
    (customer) => customer.orderCount >= 2,
  ).length;
  const publishedProducts = products.filter(
    (product) => product.status === "Published",
  ).length;
  const drafts = products.filter((product) => product.status === "Draft").length;
  const missingImages = products.filter(
    (product) => product.images.length === 0,
  ).length;
  const missingSeo = products.filter(
    (product) => !product.seoTitle || !product.seoDescription,
  ).length;

  return {
    periodLabel:
      range === "Today"
        ? now.toLocaleDateString("en-AE", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })
        : `Last ${days} days`,
    currentOrders,
    revenue,
    timeline,
    metrics: [
      {
        label: "Revenue",
        value: revenue,
        delta: percentageDelta(revenue, previousRevenue),
        helper: `${currentPaid.length} paid orders`,
        format: "money" as const,
      },
      {
        label: "Orders",
        value: currentOrders.length,
        delta: percentageDelta(currentOrders.length, previousOrders.length),
        helper: `${pendingOrders.length} pending or processing`,
        format: "number" as const,
      },
      {
        label: "Average order value",
        value: averageOrderValue,
        delta: percentageDelta(averageOrderValue, previousAov),
        helper: "Based on paid orders",
        format: "money" as const,
      },
      {
        label: "Cart conversion",
        value: cartAnalytics.conversionRate,
        delta: 0,
        helper: `${cartAnalytics.completedCarts} of ${cartAnalytics.cartsStarted} carts`,
        format: "percent" as const,
      },
      {
        label: "Returning customers",
        value: customers.length
          ? (returningCustomers / customers.length) * 100
          : 0,
        delta: 0,
        helper: `${returningCustomers} repeat customers`,
        format: "percent" as const,
      },
      {
        label: "Available units",
        value: inventory.reduce((sum, row) => sum + row.availableStock, 0),
        delta: 0,
        helper: `${atRiskInventory.length} SKUs need attention`,
        format: "number" as const,
      },
    ],
    funnel: [
      { label: "Carts started", value: cartAnalytics.cartsStarted },
      { label: "Checkout started", value: cartAnalytics.checkoutsStarted },
      { label: "Orders completed", value: cartAnalytics.completedCarts },
    ],
    queue: [
      {
        label: "Orders to process",
        value: pendingOrders.length,
        detail: `${unfulfilledOrders.length} total orders are not fulfilled`,
        priority: pendingOrders.length ? "High" : "Low",
      },
      {
        label: "Payment review",
        value: unpaidOrders.length,
        detail: "Orders with pending or failed payment",
        priority: unpaidOrders.length ? "High" : "Low",
      },
      {
        label: "Inventory risk",
        value: atRiskInventory.length,
        detail: "Low-stock or out-of-stock variants",
        priority: atRiskInventory.length ? "High" : "Low",
      },
      {
        label: "Abandoned carts",
        value: cartAnalytics.abandonedCarts,
        detail: `AED ${cartAnalytics.abandonedValue.toFixed(0)} recoverable value`,
        priority: cartAnalytics.abandonedCarts ? "Medium" : "Low",
      },
    ],
    topProducts,
    atRiskInventory,
    recentOrders: orders.slice(0, 8),
    customerHealth: [
      {
        label: "Customers",
        value: customers.length,
        detail: `${customers.filter((customer) => customer.type === "Account").length} accounts`,
      },
      {
        label: "Returning rate",
        value: customers.length
          ? `${((returningCustomers / customers.length) * 100).toFixed(1)}%`
          : "0%",
        detail: `${returningCustomers} customers ordered twice or more`,
      },
      {
        label: "Lifetime value",
        value: customers.length
          ? `AED ${Math.round(
              customers.reduce(
                (sum, customer) => sum + customer.lifetimeValue,
                0,
              ) / customers.length,
            ).toLocaleString("en-AE")}`
          : "AED 0",
        detail: "Average across known customers",
      },
      {
        label: "VIP customers",
        value: customers.filter((customer) => customer.lifetimeValue >= 1000)
          .length,
        detail: "AED 1,000+ lifetime spend",
      },
    ],
    catalogHealth: [
      { label: "Published products", value: publishedProducts },
      { label: "Draft products", value: drafts },
      { label: "Missing images", value: missingImages },
      { label: "Missing SEO", value: missingSeo },
    ],
  };
}
