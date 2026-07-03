import bcrypt from "bcryptjs";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient, ProductStatus, UserRole } from "@prisma/client";
import { categories, categoryDescriptions, collections, products } from "../src/lib/catalog";
import { resolveDatabaseUrl } from "../src/lib/database-url";
import { slugify } from "../src/lib/utils";

const databaseUrl = resolveDatabaseUrl();
const adapter = new PrismaLibSql({
  url: databaseUrl ?? "file:./prisma/dev.db",
});
const prisma = new PrismaClient({
  adapter,
});

const COLOR_HEX: Record<string, string> = {
  Ink: "#1a1a2e",
  Sage: "#7a9e7e",
  Oat: "#e8d5b0",
  Mauve: "#9b7fa6",
  Carbon: "#4a4a4a",
  Cloud: "#dcd8d0",
  Dusk: "#5c4a72",
  Onyx: "#1c1c1c",
  Ash: "#b0a49a",
  Teal: "#3d8b8b",
  Storm: "#5a7080",
  Navy: "#1a2744",
  Ecru: "#f0e8d5",
  Plum: "#6d2b4e",
  Blush: "#e8bfbf",
  Cream: "#f5edd8",
  Slate: "#5a6070",
  Olive: "#6b7a3d",
  Black: "#111111",
  White: "#f5f5f0",
};

async function main() {
  const passwordHash = await bcrypt.hash("VeloraAdmin123!", 12);

  // Admin role — permissions stored as JSON string for SQLite compat
  await prisma.adminRole.upsert({
    where: { name: "Super admin" },
    update: {},
    create: {
      name: "Super admin",
      permissions: JSON.stringify(["products:*", "orders:*", "content:*", "customers:*", "coupons:*"]),
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@velora.ae" },
    update: {
      name: "Velora Admin",
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      deletedAt: null,
    },
    create: {
      email: "admin@velora.ae",
      name: "Velora Admin",
      passwordHash,
      role: UserRole.SUPER_ADMIN,
    },
  });

  const dummyCustomer = await prisma.user.upsert({
    where: { email: "mira.saleh@example.com" },
    update: {
      name: "Mira Saleh",
      role: UserRole.CUSTOMER,
    },
    create: {
      email: "mira.saleh@example.com",
      name: "Mira Saleh",
      role: UserRole.CUSTOMER,
    },
  });

  const sampleProduct = await prisma.product.findFirst({
    where: { status: ProductStatus.PUBLISHED },
    include: {
      variants: { take: 1, include: { color: true, size: true } },
    },
  });

  if (sampleProduct?.variants?.[0]) {
    const shippingAddress = await prisma.address.upsert({
      where: {
        id: `${dummyCustomer.id}-shipping`,
      },
      update: {
        line1: "Villa 12, Palm Jumeirah",
        city: "Dubai",
        postalCode: "00000",
        phone: "0501234567",
      },
      create: {
        id: `${dummyCustomer.id}-shipping`,
        userId: dummyCustomer.id,
        name: "Mira Saleh",
        phone: "0501234567",
        line1: "Villa 12, Palm Jumeirah",
        city: "Dubai",
        country: "United Arab Emirates",
        postalCode: "00000",
      },
    });

    const billingAddress = await prisma.address.upsert({
      where: {
        id: `${dummyCustomer.id}-billing`,
      },
      update: {
        line1: "Apartment 8B, Jumeirah Lake Towers",
        city: "Dubai",
        postalCode: "00001",
        phone: "0501234567",
      },
      create: {
        id: `${dummyCustomer.id}-billing`,
        userId: dummyCustomer.id,
        name: "Mira Saleh",
        phone: "0501234567",
        line1: "Apartment 8B, Jumeirah Lake Towers",
        city: "Dubai",
        country: "United Arab Emirates",
        postalCode: "00001",
      },
    });

    const variant = sampleProduct.variants[0];
    const unitPrice = Number(sampleProduct.price);
    const quantity = 1;
    const shippingTotal = 35;
    const discountTotal = 0;
    const total = unitPrice * quantity + shippingTotal - discountTotal;

    await prisma.order.upsert({
      where: { orderNumber: "VL-1001" },
      update: {},
      create: {
        orderNumber: "VL-1001",
        userId: dummyCustomer.id,
        email: dummyCustomer.email,
        status: "PAID",
        paymentStatus: "paid",
        fulfillmentStatus: "delivered",
        internalNote: "Sample order for admin testing.",
        subtotal: unitPrice * quantity,
        shippingTotal,
        discountTotal,
        total,
        shippingAddressId: shippingAddress.id,
        billingAddressId: billingAddress.id,
        items: {
          create: [
            {
              productId: sampleProduct.id,
              title: sampleProduct.title,
              size: variant.size.name,
              color: variant.color.name,
              quantity,
              unitPrice,
            },
          ],
        },
        payment: {
          create: {
            provider: "Stripe",
            providerRef: "pi_1234567890",
            status: "paid",
            amount: total,
          },
        },
        shipment: {
          create: {
            carrier: "Aramex",
            trackingNo: "ARX123456789",
            status: "delivered",
            shippedAt: new Date(),
            deliveredAt: new Date(),
          },
        },
      },
    });
  }

  // Collect all sizes dynamically from the catalog (handles "750ml", "One Size", etc.)
  const allSizes = [...new Set(products.flatMap((p) => p.sizes))];
  const sizeMap: Record<string, string> = {};
  for (const name of allSizes) {
    const s = await prisma.size.upsert({ where: { id: name }, update: {}, create: { id: name, name } });
    sizeMap[name] = s.id;
  }

  // Collect all color names used in the catalog
  const allColors = [...new Set(products.flatMap((p) => p.colors))];
  const colorMap: Record<string, string> = {};
  for (const name of allColors) {
    const hex = COLOR_HEX[name] ?? "#888888";
    const existing = await prisma.color.findFirst({ where: { name } });
    const c = existing ?? (await prisma.color.create({ data: { name, hex } }));
    colorMap[name] = c.id;
  }

  // Categories
  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: slugify(category) },
      update: { description: categoryDescriptions[category] },
      create: { name: category, slug: slugify(category), description: categoryDescriptions[category] },
    });
  }

  // Collections
  for (const collection of collections) {
    await prisma.collection.upsert({
      where: { slug: collection.slug },
      update: {},
      create: {
        name: collection.name,
        slug: collection.slug,
        summary: collection.summary,
        bannerImage: collection.image,
        seoTitle: `${collection.name} | Velora`,
        seoDescription: collection.summary,
      },
    });
  }

  // Products
  for (const product of products) {
    const category = await prisma.category.findUniqueOrThrow({ where: { slug: slugify(product.category) } });
    const collection = await prisma.collection.findUnique({ where: { slug: product.collection } });

    const stockPerVariant = Math.max(3, Math.floor(product.stock / product.sizes.length));

    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        collections: collection ? { set: [{ id: collection.id }] } : undefined,
      },
      create: {
        title: product.name,
        slug: product.slug,
        description: product.description,
        price: product.price,
        salePrice: product.salePrice ?? null,
        sku: product.id.toUpperCase(),
        fabricDetails: product.fabric,
        careInstructions: product.care,
        seoTitle: `${product.name} | Velora`,
        seoDescription: product.description,
        featured: Boolean(product.featured),
        bestSeller: Boolean(product.bestSeller),
        newArrival: Boolean(product.newArrival),
        status: ProductStatus.PUBLISHED,
        categoryId: category.id,
        collections: collection ? { connect: [{ id: collection.id }] } : undefined,
        images: {
          create: product.images.map((url, index) => ({
            url,
            alt: product.name,
            position: index,
          })),
        },
        // Each color × size = one variant with its own stock
        variants: {
          create: product.colors.flatMap((colorName) =>
            product.sizes.map((sizeName) => ({
              colorId: colorMap[colorName],
              sizeId: sizeMap[sizeName] ?? sizeName,
              sku: `${product.id}-${sizeName}-${colorName}`.toUpperCase().replace(/\s+/g, "-"),
              stock: stockPerVariant,
              // Seed variant media from product-level images
              medias: {
                create: product.images.map((url, i) => ({
                  type: "IMAGE" as const,
                  url,
                  sortOrder: i,
                  isHoverImage: i === 1,
                })),
              },
            })),
          ),
        },
      },
    });
  }

  await prisma.newsletterSubscriber.upsert({
    where: { email: "founder@velora.ae" },
    update: {},
    create: { email: "founder@velora.ae" },
  });

  console.log("✓ Seed complete");
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
