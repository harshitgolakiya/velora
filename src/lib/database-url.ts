import path from "node:path";

export function resolveDatabaseUrl(url = process.env.DATABASE_URL) {
  if (url === "file:./dev.db") {
    return `file:${path.join(process.cwd(), "prisma", "dev.db").replace(/\\/g, "/")}`;
  }

  if (!url?.startsWith("file:./prisma/")) return url;

  const filename = url.slice("file:./prisma/".length);
  return `file:${path.join(process.cwd(), "prisma", filename).replace(/\\/g, "/")}`;
}
