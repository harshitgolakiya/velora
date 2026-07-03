import "server-only";

import { z } from "zod";
import { prisma } from "./prisma";
import { defaultReturnSettings, returnSettingsSchema, type ReturnSettings } from "./return-policy";

export const checkoutSettingsSchema = z.object({
  cashOnDeliveryEnabled: z.boolean(),
  cashOnDeliveryLabel: z.string().trim().min(2).max(80),
  cashOnDeliveryInstructions: z.string().trim().max(300),
  addressAutocomplete: z.object({
    provider: z.enum(["LOCAL", "GOOGLE_PLACES", "MAPBOX"]),
    enabled: z.boolean(),
    fallbackToLocal: z.boolean(),
    apiKeyConfigured: z.boolean().default(false),
  }),
  expressCheckout: z.object({
    enabled: z.boolean(),
    applePay: z.boolean(),
    googlePay: z.boolean(),
  }).default({ enabled: true, applePay: true, googlePay: true }),
  paymentMethods: z.array(z.object({
    id: z.enum(["stripe", "paypal", "tabby", "cash_on_delivery"]),
    enabled: z.boolean(),
    label: z.string().trim().min(2).max(80),
    description: z.string().trim().max(240),
    sortOrder: z.coerce.number().int().min(0),
  })).min(1),
  shippingZones: z.array(z.object({
    id: z.string().trim().min(2).max(40),
    name: z.string().trim().min(2).max(80),
    emirates: z.array(z.string().trim().min(2)).min(1),
    methods: z.array(z.object({
      id: z.enum(["standard", "express"]),
      label: z.string().trim().min(2).max(80),
      estimate: z.string().trim().min(2).max(120),
      price: z.coerce.number().min(0),
      freeOver: z.coerce.number().min(0).optional().nullable(),
      enabled: z.boolean(),
    })).min(1),
  })).min(1),
});

export type CheckoutSettings = z.infer<typeof checkoutSettingsSchema>;

export const recommendationSettingsSchema = z.object({
  enabled: z.boolean(),
  strategy: z.enum(["BALANCED", "SAME_CATEGORY", "SAME_COLLECTION", "BEST_SELLERS"]),
  maxItems: z.number().int().min(2).max(8),
  manualOverrides: z.record(z.string().min(1), z.array(z.string().min(1)).max(8)),
});

export type RecommendationSettings = z.infer<typeof recommendationSettingsSchema>;

export const defaultCheckoutSettings: CheckoutSettings = {
  cashOnDeliveryEnabled: true,
  cashOnDeliveryLabel: "Cash on delivery",
  cashOnDeliveryInstructions:
    "Pay in cash to the courier on delivery. Keep exact change ready where possible.",
  addressAutocomplete: {
    provider: "LOCAL",
    enabled: true,
    fallbackToLocal: true,
    apiKeyConfigured: false,
  },
  expressCheckout: {
    enabled: true,
    applePay: true,
    googlePay: true,
  },
  paymentMethods: [
    {
      id: "stripe",
      enabled: true,
      label: "Secure card payment",
      description: "Pay securely online by card, Apple Pay, or Google Pay where supported.",
      sortOrder: 1,
    },
    {
      id: "cash_on_delivery",
      enabled: true,
      label: "Cash on delivery",
      description: "Pay in cash to the courier on delivery. Keep exact change ready where possible.",
      sortOrder: 4,
    },
    {
      id: "paypal",
      enabled: false,
      label: "PayPal",
      description: "Pay with your PayPal account or a saved PayPal payment method.",
      sortOrder: 2,
    },
    {
      id: "tabby",
      enabled: false,
      label: "Tabby",
      description: "Split eligible UAE orders into installments with Tabby.",
      sortOrder: 3,
    },
  ],
  shippingZones: [
    {
      id: "uae",
      name: "United Arab Emirates",
      emirates: [
        "Abu Dhabi",
        "Dubai",
        "Sharjah",
        "Ajman",
        "Umm Al Quwain",
        "Ras Al Khaimah",
        "Fujairah",
      ],
      methods: [
        {
          id: "standard",
          label: "Standard UAE delivery",
          estimate: "2-4 business days",
          price: 25,
          freeOver: 300,
          enabled: true,
        },
        {
          id: "express",
          label: "Express UAE delivery",
          estimate: "Next business day in major cities",
          price: 40,
          freeOver: null,
          enabled: true,
        },
      ],
    },
  ],
};

export const defaultRecommendationSettings: RecommendationSettings = {
  enabled: true,
  strategy: "BALANCED",
  maxItems: 4,
  manualOverrides: {},
};

const CHECKOUT_SETTINGS_KEY = "checkout";
const RETURN_SETTINGS_KEY = "returns";
const RECOMMENDATION_SETTINGS_KEY = "recommendations";

function parseCheckoutSettings(value: string | null | undefined): CheckoutSettings {
  if (!value) return defaultCheckoutSettings;

  try {
    const parsed = checkoutSettingsSchema.partial().safeParse(JSON.parse(value));
    if (!parsed.success) return defaultCheckoutSettings;
    const configuredPaymentMethods = parsed.data.paymentMethods ?? [];
    const configuredById = new Map(configuredPaymentMethods.map((method) => [method.id, method]));
    const paymentMethods = defaultCheckoutSettings.paymentMethods.map((method) => {
      const configured = configuredById.get(method.id);
      if (configured) return { ...method, ...configured };
      if (method.id === "cash_on_delivery" && parsed.data.cashOnDeliveryEnabled !== undefined) {
        return { ...method, enabled: parsed.data.cashOnDeliveryEnabled };
      }
      return method;
    });
    return {
      ...defaultCheckoutSettings,
      ...parsed.data,
      addressAutocomplete: parsed.data.addressAutocomplete ?? defaultCheckoutSettings.addressAutocomplete,
      expressCheckout: parsed.data.expressCheckout ?? defaultCheckoutSettings.expressCheckout,
      paymentMethods,
      shippingZones: parsed.data.shippingZones ?? defaultCheckoutSettings.shippingZones,
    };
  } catch {
    return defaultCheckoutSettings;
  }
}

export async function getCheckoutSettings(): Promise<CheckoutSettings> {
  const row = await prisma.storeSetting.findUnique({
    where: { key: CHECKOUT_SETTINGS_KEY },
  });
  return parseCheckoutSettings(row?.value);
}

export async function updateCheckoutSettings(input: CheckoutSettings) {
  const settings = checkoutSettingsSchema.parse(input);
  await prisma.storeSetting.upsert({
    where: { key: CHECKOUT_SETTINGS_KEY },
    create: {
      key: CHECKOUT_SETTINGS_KEY,
      value: JSON.stringify(settings),
    },
    update: {
      value: JSON.stringify(settings),
    },
  });
  return settings;
}

function parseRecommendationSettings(value: string | null | undefined): RecommendationSettings {
  if (!value) return defaultRecommendationSettings;
  try {
    const parsed = recommendationSettingsSchema.partial().safeParse(JSON.parse(value));
    return parsed.success
      ? { ...defaultRecommendationSettings, ...parsed.data }
      : defaultRecommendationSettings;
  } catch {
    return defaultRecommendationSettings;
  }
}

export async function getRecommendationSettings(): Promise<RecommendationSettings> {
  const row = await prisma.storeSetting.findUnique({ where: { key: RECOMMENDATION_SETTINGS_KEY } });
  return parseRecommendationSettings(row?.value);
}

export async function updateRecommendationSettings(input: RecommendationSettings) {
  const settings = recommendationSettingsSchema.parse(input);
  await prisma.storeSetting.upsert({
    where: { key: RECOMMENDATION_SETTINGS_KEY },
    create: { key: RECOMMENDATION_SETTINGS_KEY, value: JSON.stringify(settings) },
    update: { value: JSON.stringify(settings) },
  });
  return settings;
}

function parseReturnSettings(value: string | null | undefined): ReturnSettings {
  if (!value) return defaultReturnSettings;
  try {
    const parsed = returnSettingsSchema.partial().safeParse(JSON.parse(value));
    return parsed.success ? { ...defaultReturnSettings, ...parsed.data } : defaultReturnSettings;
  } catch {
    return defaultReturnSettings;
  }
}

export async function getReturnSettings(): Promise<ReturnSettings> {
  const row = await prisma.storeSetting.findUnique({ where: { key: RETURN_SETTINGS_KEY } });
  return parseReturnSettings(row?.value);
}

export async function updateReturnSettings(input: ReturnSettings) {
  const settings = returnSettingsSchema.parse(input);
  await prisma.storeSetting.upsert({
    where: { key: RETURN_SETTINGS_KEY },
    create: { key: RETURN_SETTINGS_KEY, value: JSON.stringify(settings) },
    update: { value: JSON.stringify(settings) },
  });
  return settings;
}

export { returnSettingsSchema, type ReturnSettings } from "./return-policy";
