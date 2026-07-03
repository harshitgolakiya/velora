export const workflowEmailTypes = ["WELCOME", "ABANDONED_CART", "POST_PURCHASE", "REVIEW_REQUEST"] as const;
export type WorkflowEmailType = (typeof workflowEmailTypes)[number];

export const emailTemplateVariables = [
  "brandName",
  "customerName",
  "orderNumber",
  "cartValue",
  "productName",
  "shopUrl",
  "reviewUrl",
  "preferencesUrl",
] as const;
