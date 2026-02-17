"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function approveOrderAction(formData: FormData) {
  const admin = await requireRole([Role.ADMIN]);
  const orderId = Number(formData.get("orderId"));

  if (!orderId) return;

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "APPROVED",
      rejectionReason: null,
      approvedById: admin.id,
      approvedAt: new Date(),
    },
  });

  revalidatePath("/admin/orders");
  revalidatePath("/dealer/history");
  revalidatePath("/dealer/dashboard");
}

export async function rejectOrderAction(formData: FormData) {
  const admin = await requireRole([Role.ADMIN]);
  const orderId = Number(formData.get("orderId"));
  const reason = String(formData.get("reason") || "").trim();

  if (!orderId || !reason) return;

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "REJECTED",
      rejectionReason: reason,
      approvedById: admin.id,
      approvedAt: new Date(),
    },
  });

  revalidatePath("/admin/orders");
  revalidatePath("/dealer/history");
  revalidatePath("/dealer/dashboard");
}
