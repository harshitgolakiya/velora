import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const replacements: Record<string, string> = {
  "/images/velora/noor-crop-1.jpg": "/images/activewear-demo/active-neutral.jpg",
  "/images/velora/zephyr-bra-1.jpg": "/images/activewear-demo/studio-yoga.jpg",
  "/images/velora/mira-jacket-1.jpg": "/images/activewear-demo/court-blue.jpg",
  "/images/velora/collection-studio-sculpt.jpg": "/images/activewear-demo/active-duo.jpg",
  "/images/velora/story.jpg": "/images/activewear-demo/active-neutral.jpg",
};

function repair(value: string | null) {
  if (!value) return value;
  return Object.entries(replacements).reduce((result, [stale, current]) => result.replaceAll(stale, current), value);
}

async function main() {
  const sections = await prisma.homepageSection.findMany({ select: { id: true, imageUrl: true, mobileImageUrl: true, settings: true } });
  let sectionCount = 0;
  for (const section of sections) {
    const imageUrl = repair(section.imageUrl);
    const mobileImageUrl = repair(section.mobileImageUrl);
    const settings = repair(section.settings) ?? section.settings;
    if (imageUrl === section.imageUrl && mobileImageUrl === section.mobileImageUrl && settings === section.settings) continue;
    await prisma.homepageSection.update({ where: { id: section.id }, data: { imageUrl, mobileImageUrl, settings } });
    sectionCount += 1;
  }

  const pages = await prisma.pageContent.findMany({ select: { id: true, blocks: true } });
  let pageCount = 0;
  for (const page of pages) {
    const blocks = repair(page.blocks) ?? page.blocks;
    if (blocks === page.blocks) continue;
    await prisma.pageContent.update({ where: { id: page.id }, data: { blocks } });
    pageCount += 1;
  }

  console.log(`Repaired media in ${sectionCount} homepage section(s) and ${pageCount} page(s).`);
}

main().finally(() => prisma.$disconnect());
