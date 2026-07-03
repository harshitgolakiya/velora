import { headers } from "next/headers";
import { getDbCategories, getDbCategory, getDbCategoryDetails, getDbCollection, getDbCollections, getDbHomepageSections, getDbProduct, getDbProducts } from "./catalog-db";
import type { Locale } from "./i18n";
import { filterPublicProducts } from "./public-catalog";

export type CmsProvider = "local" | "sanity" | "shopify-headless" | "strapi";

const provider = (process.env.CMS_PROVIDER ?? "local") as CmsProvider;

export async function requestLocale(): Promise<Locale> {
  return (await headers()).get("x-velora-locale") === "ar" ? "ar" : "en";
}

async function resolveLocale(locale?: Locale): Promise<Locale> {
  return locale ?? await requestLocale();
}

export async function getCmsProducts(locale?: Locale) {
  if (provider !== "local") {
    // Replace this adapter with Sanity, Shopify Storefront API, or Strapi queries.
    // The storefront imports this boundary so CMS migration does not touch UI components.
  }

  return filterPublicProducts(await getDbProducts(await resolveLocale(locale)));
}

export async function getCmsProduct(slug: string, locale?: Locale) {
  const product = await getDbProduct(slug, await resolveLocale(locale));
  return product && filterPublicProducts([product]).length ? product : undefined;
}

export async function getCmsCollections(locale?: Locale) {
  return getDbCollections(await resolveLocale(locale));
}

export async function getCmsCollection(slug: string, locale?: Locale) {
  return getDbCollection(slug, await resolveLocale(locale));
}

export async function getCmsCategories(locale?: Locale) {
  return getDbCategories(await resolveLocale(locale));
}

export async function getCmsCategoryDetails(locale?: Locale) {
  return getDbCategoryDetails(await resolveLocale(locale));
}

export async function getCmsCategory(slug: string, locale?: Locale) {
  return getDbCategory(slug, await resolveLocale(locale));
}

export async function getCmsHomepageSections(locale?: Locale) {
  return getDbHomepageSections(await resolveLocale(locale));
}
