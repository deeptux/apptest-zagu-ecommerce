"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma, Role } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseTags, saveProductImage } from "@/lib/product-utils";

function normalizeString(value: FormDataEntryValue | null) {
  return String(value || "").trim();
}

function revalidateProductScreens() {
  revalidatePath("/admin/products");
  revalidatePath("/dealer/ordering");
  revalidatePath("/dealer/dashboard");
}

function redirectWithError(message: string) {
  redirect(`/admin/products?error=${encodeURIComponent(message)}`);
}

function redirectWithSuccess(message: string) {
  redirect(`/admin/products?success=${encodeURIComponent(message)}`);
}

export async function createProductAction(formData: FormData) {
  await requireRole([Role.ADMIN]);

  const code = normalizeString(formData.get("code"));
  const name = normalizeString(formData.get("name"));
  const description = normalizeString(formData.get("description"));
  const unit = normalizeString(formData.get("unit"));
  const imageUrl = normalizeString(formData.get("imageUrl"));
  const tagsRaw = normalizeString(formData.get("tags"));
  const categoryId = Number(formData.get("categoryId"));
  const price = Number(formData.get("price"));
  const stock = Number(formData.get("stock"));
  const imageFile = formData.get("imageFile");

  if (!code || !name || !unit || !Number.isFinite(price) || price <= 0 || !Number.isFinite(stock) || stock < 0) {
    redirectWithError("Please provide valid product code, name, unit, price, and stock.");
  }

  let finalImageUrl: string | null = null;
  if (imageFile instanceof File && imageFile.size > 0) {
    try {
      finalImageUrl = await saveProductImage(imageFile, code);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid product image.";
      redirectWithError(message);
    }
  }
  if (!finalImageUrl) {
    finalImageUrl = imageUrl || null;
  }

  const tags = parseTags(tagsRaw);

  try {
    await prisma.product.create({
      data: {
        code,
        name,
        description: description || null,
        unit,
        price,
        stock,
        imageUrl: finalImageUrl,
        categoryId: Number.isFinite(categoryId) && categoryId > 0 ? categoryId : null,
        isVisible: true,
        tags: {
          create: tags.map((tag) => ({ name: tag })),
        },
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirectWithError(`Product code "${code}" already exists. Please use a different code.`);
    }
    throw error;
  }

  revalidateProductScreens();
  redirectWithSuccess("Product created successfully.");
}

export async function updateProductAction(formData: FormData) {
  await requireRole([Role.ADMIN]);

  const productId = Number(formData.get("productId"));
  const code = normalizeString(formData.get("code"));
  const name = normalizeString(formData.get("name"));
  const description = normalizeString(formData.get("description"));
  const unit = normalizeString(formData.get("unit"));
  const imageUrl = normalizeString(formData.get("imageUrl"));
  const categoryId = Number(formData.get("categoryId"));
  const price = Number(formData.get("price"));
  const stock = Number(formData.get("stock"));

  if (!productId || !code || !name || !unit || !Number.isFinite(price) || price <= 0 || !Number.isFinite(stock) || stock < 0) {
    redirectWithError("Invalid product update values.");
  }

  try {
    await prisma.product.update({
      where: { id: productId },
      data: {
        code,
        name,
        description: description || null,
        unit,
        price,
        stock,
        imageUrl: imageUrl || null,
        categoryId: Number.isFinite(categoryId) && categoryId > 0 ? categoryId : null,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        redirectWithError(`Product code "${code}" already exists. Please use a different code.`);
      }
      if (error.code === "P2025") {
        redirectWithError("Product not found. Refresh and try again.");
      }
    }
    throw error;
  }

  revalidateProductScreens();
  redirectWithSuccess("Product updated successfully.");
}

export async function toggleProductVisibilityAction(formData: FormData) {
  await requireRole([Role.ADMIN]);
  const productId = Number(formData.get("productId"));
  const nextVisible = String(formData.get("nextVisible")) === "true";

  if (!productId) {
    redirectWithError("Invalid product visibility request.");
  }

  try {
    await prisma.product.update({
      where: { id: productId },
      data: { isVisible: nextVisible },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      redirectWithError("Product not found. Refresh and try again.");
    }
    throw error;
  }

  revalidateProductScreens();
  redirectWithSuccess(nextVisible ? "Product is now visible to dealers." : "Product is now hidden from dealers.");
}

export async function deleteProductAction(formData: FormData) {
  await requireRole([Role.ADMIN]);
  const productId = Number(formData.get("productId"));
  if (!productId) {
    redirectWithError("Invalid product delete request.");
  }

  try {
    await prisma.orderItem.deleteMany({ where: { productId } });
    await prisma.product.delete({ where: { id: productId } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      redirectWithError("Product not found. Refresh and try again.");
    }
    throw error;
  }

  revalidateProductScreens();
  redirectWithSuccess("Product deleted successfully.");
}
