require("dotenv/config");
// const { PrismaClient, Role } = require("@prisma/client");
// const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");

// const prisma = new PrismaClient({
//   adapter: new PrismaBetterSqlite3({
//     url: process.env.DATABASE_URL || "file:./dev.db",
//   }),
// });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set.");

const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient, Role } = require("@prisma/client");

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const starterProducts = [
  {
    code: "ZAGU-001",
    name: "Classic Pearl Shake Mix",
    description: "Signature pearl shake base mix.",
    price: 150,
    unit: "Pack",
    imageUrl: "https://images.unsplash.com/photo-1579954115545-a95591f28bfc?w=700&q=80",
    categoryName: "Food & Beverages",
  },
  {
    code: "ZAGU-002",
    name: "Tapioca Pearls",
    description: "Cook-ready tapioca pearls.",
    price: 220,
    unit: "Pack",
    imageUrl: "https://images.unsplash.com/photo-1558857563-b371033873b8?w=700&q=80",
    categoryName: "Food & Beverages",
  },
  {
    code: "ZAGU-003",
    name: "Sealing Cups 95mm",
    description: "Disposable cups for drink service.",
    price: 95,
    unit: "Bundle",
    imageUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=700&q=80",
    categoryName: "Packaging",
  },
  {
    code: "ZAGU-004",
    name: "Franchise Signage Kit",
    description: "Promo signage and menu holder kit.",
    price: 480,
    unit: "Set",
    imageUrl: "https://images.unsplash.com/photo-1576866209830-589e1bfbaa4d?w=700&q=80",
    categoryName: "Merchandise",
  },
];

async function main() {
  const categories = ["Food & Beverages", "Packaging", "Spare Parts", "Store Equipment", "Merchandise"];

  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  await prisma.user.upsert({
    where: { email: "admin@zagu.local" },
    update: {},
    create: {
      name: "Zagu Admin",
      email: "admin@zagu.local",
      password: "admin123",
      role: Role.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: "dealer@zagu.local" },
    update: {},
    create: {
      name: "Main Dealer",
      email: "dealer@zagu.local",
      password: "dealer123",
      role: Role.DEALER,
    },
  });

  await prisma.user.upsert({
    where: { email: "dealer2@zagu.local" },
    update: {},
    create: {
      name: "Dealer Two",
      email: "dealer2@zagu.local",
      password: "dealer123",
      role: Role.DEALER,
    },
  });

  for (const product of starterProducts) {
    const category = await prisma.category.findUnique({
      where: { name: product.categoryName },
    });

    await prisma.product.upsert({
      where: { code: product.code },
      update: {
        name: product.name,
        description: product.description,
        price: product.price,
        unit: product.unit,
        imageUrl: product.imageUrl,
        isVisible: true,
        categoryId: category?.id,
      },
      create: {
        code: product.code,
        name: product.name,
        description: product.description,
        price: product.price,
        unit: product.unit,
        imageUrl: product.imageUrl,
        isVisible: true,
        categoryId: category?.id,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
