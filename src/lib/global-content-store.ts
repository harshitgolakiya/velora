import "server-only";

import { prisma } from "./prisma";
import {
  defaultGlobalContentSettings,
  globalContentSchema,
  globalContentSettingsSchema,
  parseGlobalContentSettings,
  type GlobalContent,
  type GlobalContentSettings,
} from "./global-content";

const GLOBAL_CONTENT_KEY = "globalContent";

export async function getGlobalContentSettings(): Promise<GlobalContentSettings> {
  const row = await prisma.storeSetting.findUnique({ where: { key: GLOBAL_CONTENT_KEY } });
  return parseGlobalContentSettings(row?.value);
}

export async function getPublishedGlobalContent(): Promise<GlobalContent> {
  const settings = await getGlobalContentSettings();
  return settings.published;
}

export async function updateGlobalContentDraft(input: GlobalContent): Promise<GlobalContentSettings> {
  const draft = globalContentSchema.parse(input);
  const current = await getGlobalContentSettings();
  const settings = globalContentSettingsSchema.parse({
    ...defaultGlobalContentSettings,
    ...current,
    draft,
    updatedAt: new Date().toISOString(),
  });

  await prisma.storeSetting.upsert({
    where: { key: GLOBAL_CONTENT_KEY },
    create: { key: GLOBAL_CONTENT_KEY, value: JSON.stringify(settings) },
    update: { value: JSON.stringify(settings) },
  });

  return settings;
}

export async function publishGlobalContent(input: GlobalContent): Promise<GlobalContentSettings> {
  const draft = globalContentSchema.parse(input);
  const now = new Date().toISOString();
  const settings = globalContentSettingsSchema.parse({
    draft,
    published: draft,
    publishedAt: now,
    updatedAt: now,
  });

  await prisma.storeSetting.upsert({
    where: { key: GLOBAL_CONTENT_KEY },
    create: { key: GLOBAL_CONTENT_KEY, value: JSON.stringify(settings) },
    update: { value: JSON.stringify(settings) },
  });

  return settings;
}
