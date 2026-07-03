import "server-only";

import { Buffer } from "node:buffer";

type PayPalLink = {
  rel: string;
  href: string;
  method?: string;
};

type PayPalOrderResponse = {
  id: string;
  status: string;
  links?: PayPalLink[];
  purchase_units?: Array<{
    payments?: {
      captures?: Array<{ id: string; status: string }>;
    };
  }>;
};

type PayPalErrorResponse = {
  name?: string;
  message?: string;
  details?: Array<{ issue?: string; description?: string }>;
};

function getPayPalApiBase() {
  if (process.env.PAYPAL_API_BASE) return process.env.PAYPAL_API_BASE.replace(/\/$/, "");
  const environment = (process.env.PAYPAL_ENVIRONMENT ?? "sandbox").toLowerCase();
  return environment === "live" || environment === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

export function isPayPalConfigured() {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

async function parsePayPalError(response: Response) {
  let body: PayPalErrorResponse | undefined;
  try {
    body = await response.json();
  } catch {
    // PayPal sometimes returns HTML or empty bodies for gateway failures.
  }
  const detail = body?.details?.[0]?.description ?? body?.details?.[0]?.issue;
  return `${body?.message ?? "PayPal request failed"}${detail ? `: ${detail}` : ""}`;
}

async function getAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("PayPal is not configured.");
  }

  const response = await fetch(`${getPayPalApiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!response.ok) throw new Error(await parsePayPalError(response));
  const body = await response.json() as { access_token?: string };
  if (!body.access_token) throw new Error("PayPal did not return an access token.");
  return body.access_token;
}

function formatPayPalAmount(amount: number) {
  return (Math.round(amount * 100) / 100).toFixed(2);
}

export async function createPayPalOrder(input: {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency?: string;
  returnUrl: string;
  cancelUrl: string;
}) {
  const accessToken = await getAccessToken();
  const response = await fetch(`${getPayPalApiBase()}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": `velora-create-${input.orderId}`,
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: input.orderId,
          invoice_id: input.orderNumber,
          description: `Velora order ${input.orderNumber}`,
          amount: {
            currency_code: input.currency ?? "AED",
            value: formatPayPalAmount(input.amount),
          },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: "Velora",
            locale: "en-AE",
            landing_page: "LOGIN",
            user_action: "PAY_NOW",
            return_url: input.returnUrl,
            cancel_url: input.cancelUrl,
          },
        },
      },
    }),
  });
  if (!response.ok) throw new Error(await parsePayPalError(response));
  const body = await response.json() as PayPalOrderResponse;
  const approvalUrl = body.links?.find((link) => link.rel === "approve")?.href;
  if (!body.id || !approvalUrl) {
    throw new Error("PayPal did not return an approval URL.");
  }
  return { id: body.id, status: body.status, approvalUrl };
}

export async function capturePayPalOrder(paypalOrderId: string) {
  const accessToken = await getAccessToken();
  const response = await fetch(`${getPayPalApiBase()}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": `velora-capture-${paypalOrderId}`,
      Prefer: "return=representation",
    },
    body: "{}",
  });
  if (!response.ok) throw new Error(await parsePayPalError(response));
  const body = await response.json() as PayPalOrderResponse;
  const capture = body.purchase_units?.flatMap((unit) => unit.payments?.captures ?? [])[0];
  return {
    id: body.id,
    status: body.status,
    captureId: capture?.id,
    captureStatus: capture?.status,
  };
}
