import { prisma } from "@/lib/prisma";
import { createProductAction } from "@/app/(admin)/admin/products/actions";
import { AddProductSection } from "@/components/add-product-section";
import { ProductsTable } from "@/components/products-table";

type AdminProductsPageProps = {
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function AdminProductsPage({ searchParams }: AdminProductsPageProps) {
  const params = (await searchParams) ?? {};
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      include: { category: true, tags: true },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-5">
      {params.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {params.error}
        </div>
      )}
      {params.success && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {params.success}
        </div>
      )}

      <AddProductSection
        categories={categories.map((category) => ({ id: category.id, name: category.name }))}
        action={createProductAction}
      />

      <section>
        <ProductsTable
          categories={categories.map((category) => ({ id: category.id, name: category.name }))}
          products={products.map((product) => ({
            id: product.id,
            code: product.code,
            name: product.name,
            description: product.description,
            unit: product.unit,
            price: product.price,
            stock: product.stock,
            imageUrl: product.imageUrl,
            isVisible: product.isVisible,
            categoryId: product.categoryId,
            categoryName: product.category?.name || "Uncategorized",
            updatedAt: product.updatedAt.toISOString(),
            tags: product.tags.map((tag) => tag.name),
          }))}
        />
      </section>
    </div>
  );
}
