import "server-only";

import { z } from "zod";
import { prisma } from "./prisma";

const safeText = z.string().trim().max(5000).refine((value) => !/<\/?[a-z][^>]*>/i.test(value), "HTML markup is not allowed");
const safeHref = z.string().trim().max(500).refine((value) => value.startsWith("/") || value.startsWith("https://"), "Use an internal path or HTTPS URL");
const safeMedia = z.string().trim().max(500).refine((value) => value.startsWith("/images/") || value.startsWith("/api/") || value.startsWith("https://"), "Use a managed image path or HTTPS URL");

const baseBlock = z.object({ id: z.string().trim().min(1).max(80) });
export const contentBlockSchema = z.discriminatedUnion("type", [
  baseBlock.extend({
    type: z.literal("HERO"),
    eyebrow: safeText.max(80).optional(),
    heading: safeText.min(2).max(160),
    body: safeText.max(800).optional(),
    imageUrl: safeMedia.optional(),
    mobileImageUrl: safeMedia.optional(),
    ctaLabel: safeText.max(60).optional(),
    ctaHref: safeHref.optional(),
  }),
  baseBlock.extend({
    type: z.literal("TEXT"),
    heading: safeText.min(2).max(160),
    body: safeText.min(1).max(5000),
  }),
  baseBlock.extend({
    type: z.literal("FAQ_GROUP"),
    category: safeText.min(2).max(100),
    items: z.array(z.object({ question: safeText.min(3).max(240), answer: safeText.min(3).max(2000) })).min(1).max(30),
  }),
  baseBlock.extend({
    type: z.literal("POLICY"),
    heading: safeText.min(2).max(160),
    body: safeText.min(1).max(5000),
  }),
  baseBlock.extend({
    type: z.literal("CARDS"),
    heading: safeText.min(2).max(160),
    items: z.array(z.object({ title: safeText.min(2).max(120), body: safeText.min(2).max(1000), href: safeHref.optional() })).min(1).max(12),
  }),
  baseBlock.extend({
    type: z.literal("COMPARISON"),
    heading: safeText.min(2).max(160),
    items: z.array(z.object({ name: safeText.min(1).max(80), support: safeText.max(120), feel: safeText.max(120), bestFor: safeText.max(200) })).min(2).max(10),
  }),
]);

export type ContentBlock = z.infer<typeof contentBlockSchema>;

export const pageContentInputSchema = z.object({
  slug: z.string().trim().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: safeText.min(2).max(160),
  summary: safeText.max(500).optional().nullable(),
  body: safeText.max(5000).default(""),
  blocks: z.array(contentBlockSchema).max(40),
  contentType: z.enum(["EDITORIAL", "FAQ", "POLICY", "SUPPORT", "LEGAL", "GUIDE"]),
  status: z.enum(["DRAFT", "SCHEDULED", "PUBLISHED"]),
  locale: z.string().trim().min(2).max(8).default("en"),
  seoTitle: safeText.max(70).optional().nullable(),
  seoDescription: safeText.max(170).optional().nullable(),
  socialImage: safeMedia.optional().nullable(),
  scheduledAt: z.string().datetime().optional().nullable(),
}).superRefine((value, context) => {
  if (value.status === "SCHEDULED" && !value.scheduledAt) {
    context.addIssue({ code: "custom", path: ["scheduledAt"], message: "Choose a publication time" });
  }
  if (value.status === "PUBLISHED" && value.blocks.length === 0 && !value.body) {
    context.addIssue({ code: "custom", path: ["blocks"], message: "Published pages need content" });
  }
});

export type PageContentInput = z.infer<typeof pageContentInputSchema>;

export function parseContentBlocks(value: string): ContentBlock[] {
  try {
    const parsed = z.array(contentBlockSchema).safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export async function publishDuePageContent() {
  const now = new Date();
  await prisma.pageContent.updateMany({
    where: { status: "SCHEDULED", scheduledAt: { lte: now } },
    data: { status: "PUBLISHED", publishedAt: now, scheduledAt: null },
  });
}

export async function getPublishedPageContent(slug: string) {
  const page = await prisma.pageContent.findUnique({ where: { slug } });
  return page && isPageContentPublic(page.status, page.scheduledAt)
    ? { ...page, blocks: parseContentBlocks(page.blocks) }
    : null;
}

export function isPageContentPublic(status: string, scheduledAt?: Date | null, now = new Date()) {
  return status === "PUBLISHED" || (status === "SCHEDULED" && Boolean(scheduledAt && scheduledAt.getTime() <= now.getTime()));
}

export async function createPageVersion(pageId: string, actor: string) {
  const page = await prisma.pageContent.findUnique({ where: { id: pageId } });
  if (!page) throw new Error("Page not found");
  const aggregate = await prisma.pageContentVersion.aggregate({ where: { pageId }, _max: { version: true } });
  return prisma.pageContentVersion.create({
    data: {
      pageId,
      version: (aggregate._max.version ?? 0) + 1,
      title: page.title,
      summary: page.summary,
      body: page.body,
      blocks: page.blocks,
      contentType: page.contentType,
      status: page.status,
      seoTitle: page.seoTitle,
      seoDescription: page.seoDescription,
      socialImage: page.socialImage,
      createdBy: actor,
    },
  });
}

export function mapPageContent<T extends { blocks: string }>(page: T) {
  return { ...page, blocks: parseContentBlocks(page.blocks) };
}
