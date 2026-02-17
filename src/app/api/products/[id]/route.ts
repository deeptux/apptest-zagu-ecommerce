import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseTags, saveProductImage } from "@/lib/product-utils";

type UpdateBody = {
  code?: string;
  name?: string;
  description?: string;
  unit?: string;
  imageUrl?: string;
  categoryId?: number | null;
  price?: number;
  stock?: number;
  tags?: string;
};

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function isAdmin(role: Role) {
  return role === Role.ADMIN;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const productId = Number(id);
  if (!productId) {
    return NextResponse.json({ error: "Invalid product id." }, { status: 400 });
  }

  const contentType = request.headers.get("content-type") || "";
  let code = "";
  let name = "";
  let description = "";
  let unit = "";
  let imageUrl = "";
  let price = 0;
  let stock = 0;
  let categoryId = Number.NaN;
  let tagsRaw = "";
  let imageFile: File | null = null;

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    code = normalizeString(formData.get("code"));
    name = normalizeString(formData.get("name"));
    description = normalizeString(formData.get("description"));
    unit = normalizeString(formData.get("unit"));
    imageUrl = normalizeString(formData.get("imageUrl"));
    price = Number(formData.get("price"));
    stock = Number(formData.get("stock"));
    categoryId = Number(formData.get("categoryId"));
    tagsRaw = normalizeString(formData.get("tags"));
    const fileValue = formData.get("imageFile");
    if (fileValue instanceof File) imageFile = fileValue;
  } else {
    const body = (await request.json()) as UpdateBody;
    code = normalizeString(body.code);
    name = normalizeString(body.name);
    description = normalizeString(body.description);
    unit = normalizeString(body.unit);
    imageUrl = normalizeString(body.imageUrl);
    price = Number(body.price);
    stock = Number(body.stock);
    categoryId = Number(body.categoryId);
    tagsRaw = normalizeString(body.tags);
  }

  if (!code || !name || !unit || !Number.isFinite(price) || price <= 0 || !Number.isFinite(stock) || stock < 0) {
    return NextResponse.json({ error: "Invalid update payload." }, { status: 400 });
  }

  let finalImageUrl: string | null = null;
  if (imageFile && imageFile.size > 0) {
    try {
      finalImageUrl = await saveProductImage(imageFile, code);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid product image.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }
  if (!finalImageUrl) {
    finalImageUrl = imageUrl || null;
  }

  const tags = parseTags(tagsRaw);

  await prisma.product.update({
    where: { id: productId },
    data: {
      code,
      name,
      description: description || null,
      unit,
      imageUrl: finalImageUrl,
      price,
      stock,
      categoryId: Number.isFinite(categoryId) && categoryId > 0 ? categoryId : null,
      tags: {
        deleteMany: {},
        create: tags.map((tag) => ({ name: tag })),
      },
    },
  });

  revalidatePath("/admin/products");
  revalidatePath("/dealer/ordering");
  revalidatePath("/dealer/dashboard");
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const productId = Number(id);
  if (!productId) {
    return NextResponse.json({ error: "Invalid product id." }, { status: 400 });
  }

  await prisma.orderItem.deleteMany({ where: { productId } });
  await prisma.product.delete({ where: { id: productId } });

  revalidatePath("/admin/products");
  revalidatePath("/dealer/ordering");
  revalidatePath("/dealer/dashboard");
  return NextResponse.json({ ok: true });
}
