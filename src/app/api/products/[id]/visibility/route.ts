import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type VisibilityBody = {
  visible?: boolean;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const productId = Number(id);
  if (!productId) {
    return NextResponse.json({ error: "Invalid product id." }, { status: 400 });
  }

  const body = (await request.json()) as VisibilityBody;
  const visible = Boolean(body.visible);

  await prisma.product.update({
    where: { id: productId },
    data: { isVisible: visible },
  });

  revalidatePath("/admin/products");
  revalidatePath("/dealer/ordering");
  revalidatePath("/dealer/dashboard");
  return NextResponse.json({ ok: true });
}
