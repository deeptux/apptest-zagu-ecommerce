import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { Role } from "@prisma/client";
import { OrderingClient } from "@/components/ordering-client";

type DealerOrderingPageProps = {
  searchParams?: Promise<{
    openCart?: string;
  }>;
};

export default async function DealerOrderingPage({ searchParams }: DealerOrderingPageProps) {
  await requireRole([Role.DEALER]);
  const params = (await searchParams) ?? {};

  const products = await prisma.product.findMany({
    where: { isVisible: true },
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
    include: { category: true },
  });

  const categories = [
    "All",
    ...new Set(products.map((product) => product.category?.name || "Uncategorized")),
  ];

  return (
    <OrderingClient
      initialCartOpen={params.openCart === "1"}
      categories={categories}
      products={products.map((product) => ({
        id: product.id,
        code: product.code,
        name: product.name,
        description: product.description,
        price: product.price,
        stock: product.stock,
        unit: product.unit,
        imageUrl: product.imageUrl,
        category: product.category?.name || "Uncategorized",
      }))}
    />
  );
}
