import "server-only";

import { prisma } from "./prisma";
import {
  parseSearchMerchandisingSettings,
  searchMerchandisingSettingsSchema,
  type SearchMerchandisingSettings,
} from "./search-merchandising";

const SEARCH_MERCHANDISING_KEY = "search_merchandising";

export async function getSearchMerchandisingSettings() {
  const row = await prisma.storeSetting.findUnique({ where: { key: SEARCH_MERCHANDISING_KEY } });
  return parseSearchMerchandisingSettings(row?.value);
}

export async function updateSearchMerchandisingSettings(input: SearchMerchandisingSettings) {
  const settings = searchMerchandisingSettingsSchema.parse(input);
  await prisma.storeSetting.upsert({
    where: { key: SEARCH_MERCHANDISING_KEY },
    create: { key: SEARCH_MERCHANDISING_KEY, value: JSON.stringify(settings) },
    update: { value: JSON.stringify(settings) },
  });
  return settings;
}
