import "server-only";

type TabbyMoney = {
  amount: string;
  currency: string;
};

type TabbyItem = {
  title: string;
  quantity: number;
  unitPrice: number;
  referenceId: string;
  category?: string;
};

type TabbyCheckoutResponse = {
  id: string;
  status: string;
  payment?: {
    id?: string;
    status?: string;
  };
  configuration?: {
    available_products?: Record<string, Array<{ web_url?: string }>>;
  };
};

type TabbyPaymentResponse = {
  id: string;
  status: string;
};

type TabbyErrorResponse = {
  error?: string;
  errorType?: string;
  message?: string;
};

function getTabbyApiBase() {
  return (process.env.TABBY_API_BASE ?? "https://api.tabby.ai").replace(/\/$/, "");
}

export function isTabbyConfigured() {
  return Boolean(process.env.TABBY_SECRET_KEY);
}

function formatAmount(amount: number) {
  return (Math.round(amount * 100) / 100).toFixed(2);
}

async function parseTabbyError(response: Response) {
  let body: TabbyErrorResponse | undefined;
  try {
    body = await response.json();
  } catch {
    // Keep the generic status message when the gateway sends a non-JSON body.
  }
  return body?.message ?? body?.error ?? body?.errorType ?? `Tabby request failed with status ${response.status}`;
}

async function tabbyFetch(path: string, init: RequestInit) {
  const secretKey = process.env.TABBY_SECRET_KEY;
  if (!secretKey) throw new Error("Tabby is not configured.");

  const response = await fetch(`${getTabbyApiBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) throw new Error(await parseTabbyError(response));
  return response;
}

function getCheckoutUrl(body: TabbyCheckoutResponse) {
  const products = body.configuration?.available_products;
  if (!products) return undefined;
  return Object.values(products).flat().find((product) => product.web_url)?.web_url;
}

function toTabbyItems(items: TabbyItem[]) {
  return items.map((item) => ({
    title: item.title,
    quantity: item.quantity,
    unit_price: formatAmount(item.unitPrice),
    category: item.category ?? "Fashion",
    reference_id: item.referenceId,
  }));
}

export async function createTabbyCheckoutSession(input: {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency?: string;
  buyer: {
    email: string;
    phone: string;
    name: string;
  };
  shippingAddress: {
    city: string;
    address: string;
    phone: string;
  };
  items: TabbyItem[];
  successUrl: string;
  cancelUrl: string;
  failureUrl: string;
}) {
  const currency = input.currency ?? "AED";
  const response = await tabbyFetch("/api/v2/checkout", {
    method: "POST",
    body: JSON.stringify({
      payment: {
        amount: formatAmount(input.amount),
        currency,
        description: `Velora order ${input.orderNumber}`,
        buyer: {
          email: input.buyer.email,
          phone: input.buyer.phone,
          name: input.buyer.name,
        },
        shipping_address: {
          city: input.shippingAddress.city,
          address: input.shippingAddress.address,
          phone: input.shippingAddress.phone,
        },
        order: {
          reference_id: input.orderNumber,
          items: toTabbyItems(input.items),
        },
        buyer_history: {
          registered_since: new Date().toISOString(),
          loyalty_level: 0,
          wishlist_count: 0,
          is_social_networks_connected: false,
        },
        order_history: [],
      },
      lang: "en",
      merchant_code: process.env.TABBY_MERCHANT_CODE ?? "default",
      merchant_urls: {
        success: input.successUrl,
        cancel: input.cancelUrl,
        failure: input.failureUrl,
      },
    }),
  });
  const body = await response.json() as TabbyCheckoutResponse;
  const checkoutUrl = getCheckoutUrl(body);
  const paymentId = body.payment?.id;
  if (!paymentId || !checkoutUrl) {
    throw new Error("Tabby did not return an available checkout option.");
  }
  return {
    id: body.id,
    status: body.status,
    paymentId,
    paymentStatus: body.payment?.status,
    checkoutUrl,
  };
}

export async function retrieveTabbyPayment(paymentId: string) {
  const response = await tabbyFetch(`/api/v2/payments/${encodeURIComponent(paymentId)}`, {
    method: "GET",
  });
  return await response.json() as TabbyPaymentResponse;
}

export async function captureTabbyPayment(input: {
  paymentId: string;
  amount: number;
  currency?: string;
  items: TabbyItem[];
}) {
  const currency = input.currency ?? "AED";
  const amount: TabbyMoney = {
    amount: formatAmount(input.amount),
    currency,
  };
  const response = await tabbyFetch(`/api/v2/payments/${encodeURIComponent(input.paymentId)}/captures`, {
    method: "POST",
    body: JSON.stringify({
      amount: amount.amount,
      tax_amount: "0.00",
      shipping_amount: "0.00",
      discount_amount: "0.00",
      items: toTabbyItems(input.items),
    }),
  });
  return await response.json() as TabbyPaymentResponse;
}
