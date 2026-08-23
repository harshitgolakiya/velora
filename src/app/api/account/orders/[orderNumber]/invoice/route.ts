import { NextResponse } from "next/server";
import { getAuthorizedAccountOrder, formatAddressLines } from "@/lib/account-orders";
import { requireCustomerSession } from "@/lib/account-data";
import { formatAed } from "@/lib/utils";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#039;",
    };
    return entities[char] ?? char;
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderNumber: string }> },
) {
  const session = await requireCustomerSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const email = session.user.email;
  if (!userId || !email) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { orderNumber } = await params;
  const order = await getAuthorizedAccountOrder({
    orderNumber,
    userId,
    email,
  });

  if (!order) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const address = formatAddressLines(order.shippingAddress).map(escapeHtml).join("<br />");
  const rows = order.items.map((item) => `
    <tr>
      <td>${escapeHtml(item.title)}<br /><small>${escapeHtml(item.color)} / ${escapeHtml(item.size)}</small></td>
      <td>${item.quantity}</td>
      <td>${formatAed(Number(item.unitPrice))}</td>
      <td>${formatAed(Number(item.unitPrice) * item.quantity)}</td>
    </tr>
  `).join("");

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Invoice ${escapeHtml(order.orderNumber)}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #17262D; margin: 40px; }
    .head { display: flex; justify-content: space-between; gap: 32px; border-bottom: 1px solid #DDE7EB; padding-bottom: 24px; }
    h1 { margin: 0; font-size: 32px; letter-spacing: 0.08em; }
    h2 { margin: 32px 0 12px; font-size: 16px; text-transform: uppercase; letter-spacing: 0.12em; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; }
    th, td { border-bottom: 1px solid #DDE7EB; padding: 14px 0; text-align: left; vertical-align: top; }
    th:nth-child(n+2), td:nth-child(n+2) { text-align: right; }
    small, .muted { color: #66777F; }
    .totals { margin-left: auto; width: 320px; margin-top: 24px; }
    .totals div { display: flex; justify-content: space-between; padding: 8px 0; }
    .total { border-top: 1px solid #17262D; font-weight: 700; font-size: 18px; }
  </style>
</head>
<body>
  <section class="head">
    <div>
      <h1>VELORA</h1>
      <p class="muted">Invoice ${escapeHtml(order.orderNumber)}</p>
    </div>
    <div>
      <strong>Issued</strong><br />
      ${new Intl.DateTimeFormat("en-AE", { dateStyle: "medium" }).format(order.createdAt)}<br />
      <span class="muted">${escapeHtml(order.email)}</span>
    </div>
  </section>
  <h2>Ship to</h2>
  <p>${address || "No address saved"}</p>
  <table>
    <thead>
      <tr><th>Item</th><th>Qty</th><th>Unit</th><th>Total</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <section class="totals">
    <div><span>Subtotal</span><span>${formatAed(Number(order.subtotal))}</span></div>
    <div><span>Discount</span><span>-${formatAed(Number(order.discountTotal))}</span></div>
    <div><span>Shipping</span><span>${Number(order.shippingTotal) === 0 ? "Free" : formatAed(Number(order.shippingTotal))}</span></div>
    <div class="total"><span>Total</span><span>${formatAed(Number(order.total))}</span></div>
    ${order.refundAmount ? `<div style="color:#b42318"><span>Refunded</span><span>-${formatAed(Number(order.refundAmount))}</span></div><div class="total"><span>Net total</span><span>${formatAed(Math.max(0, Number(order.total) - Number(order.refundAmount)))}</span></div>` : ""}
  </section>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${order.orderNumber}-invoice.html"`,
      "Cache-Control": "private, no-store",
    },
  });
}
