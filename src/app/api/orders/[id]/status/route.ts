import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type StatusBody = {
  status?: "APPROVED" | "REJECTED";
  reason?: string;
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
  const orderId = Number(id);
  if (!orderId) {
    return NextResponse.json({ error: "Invalid order id." }, { status: 400 });
  }

  const body = (await request.json()) as StatusBody;
  if (body.status !== "APPROVED" && body.status !== "REJECTED") {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const reason = String(body.reason || "").trim();

  const existingOrder = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!existingOrder) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (existingOrder.status !== "REJECTED" && body.status === "REJECTED") {
        for (const item of existingOrder.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }

      if (existingOrder.status === "REJECTED" && body.status === "APPROVED") {
        for (const item of existingOrder.items) {
          const updated = await tx.product.updateMany({
            where: { id: item.productId, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
          });
          if (updated.count === 0) {
            throw new Error("Cannot approve because one or more products are out of stock.");
          }
        }
      }

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: body.status,
          remarks: reason || null,
          rejectionReason: body.status === "REJECTED" ? reason || null : null,
          approvedById: user.id,
          approvedAt: new Date(),
        },
      });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update order status.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  revalidatePath("/admin/orders");
  revalidatePath("/dealer/history");
  revalidatePath("/dealer/dashboard");

  return NextResponse.json({ ok: true });
}
