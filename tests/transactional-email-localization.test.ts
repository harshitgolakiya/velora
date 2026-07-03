import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    emailDelivery: { findUnique: vi.fn().mockResolvedValue(null) },
  },
}));

vi.mock("@/lib/email-delivery", () => ({
  deliverEmail: vi.fn().mockResolvedValue({ id: "email_1", status: "SENT" }),
}));

import { sendVerificationEmail } from "@/lib/account-security-email";
import { deliverEmail } from "@/lib/email-delivery";
import { sendRefundNotificationEmail } from "@/lib/refund-email";
import { sendReturnLifecycleNotification } from "@/lib/return-notifications";
import { sendShipmentNotificationEmail } from "@/lib/shipment-email";

const mockedDeliverEmail = vi.mocked(deliverEmail);

describe("transactional email localization", () => {
  beforeEach(() => {
    mockedDeliverEmail.mockClear();
  });

  it("renders account security emails in Arabic with RTL direction", async () => {
    await sendVerificationEmail("amira@example.com", "https://velora.test/ar/account/verify-email?token=abc", "ar");

    expect(mockedDeliverEmail).toHaveBeenCalledWith(expect.objectContaining({
      subject: "تأكيد بريدك الإلكتروني",
      metadata: expect.objectContaining({ locale: "ar" }),
      html: expect.stringContaining('dir="rtl"'),
    }));
    expect(mockedDeliverEmail.mock.calls[0]?.[0].html).toContain("تأكيد البريد الإلكتروني");
  });

  it("localizes shipment and refund action links", async () => {
    await sendShipmentNotificationEmail({
      recipient: "amira@example.com",
      orderId: "order_1",
      orderNumber: "VL-1",
      eventId: "event_1",
      status: "SHIPPED",
      carrier: "Aramex",
      trackingNo: "TRK1",
      locale: "ar",
    });

    await sendRefundNotificationEmail({
      recipient: "amira@example.com",
      orderId: "order_1",
      orderNumber: "VL-1",
      refundId: "refund_1",
      amount: 75,
      totalRefunded: 75,
      kind: "PARTIAL",
      locale: "ar",
    });

    expect(mockedDeliverEmail.mock.calls[0]?.[0].html).toContain("/ar/track-order");
    expect(mockedDeliverEmail.mock.calls[1]?.[0].html).toContain("/ar/account/orders/VL-1");
  });

  it("renders return lifecycle customer emails in Arabic", async () => {
    await sendReturnLifecycleNotification({
      requestId: "return_1",
      eventId: "event_1",
      orderId: "order_1",
      orderNumber: "VL-1",
      recipient: "amira@example.com",
      status: "PICKUP_SCHEDULED",
      message: "Pickup tomorrow",
      locale: "ar",
    });

    expect(mockedDeliverEmail).toHaveBeenCalledWith(expect.objectContaining({
      recipient: "amira@example.com",
      subject: "تم تحديد موعد الاستلام: طلب الإرجاع VL-1",
      metadata: expect.objectContaining({ locale: "ar" }),
      html: expect.stringContaining("/ar/account/orders/VL-1/return"),
    }));
  });
});
