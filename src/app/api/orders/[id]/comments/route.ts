import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function canAccessOrder(userId: number, role: Role, orderId: number) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, userId: true },
  });

  if (!order) return false;
  if (role === Role.ADMIN) return true;
  if (role !== Role.DEALER) return false;
  return order.userId === userId;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const orderId = Number(id);
  if (!orderId) return NextResponse.json({ error: "Invalid order id." }, { status: 400 });

  const allowed = await canAccessOrder(user.id, user.role, orderId);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const comments = await prisma.orderComment.findMany({
    where: { orderId },
    orderBy: { createdAt: "asc" },
    include: {
      user: { select: { id: true, name: true, role: true } },
    },
  });

  return NextResponse.json({ comments });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const orderId = Number(id);
  if (!orderId) return NextResponse.json({ error: "Invalid order id." }, { status: 400 });

  const allowed = await canAccessOrder(user.id, user.role, orderId);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await request.json()) as { message?: string };
  const message = String(body.message || "").trim();
  if (!message) return NextResponse.json({ error: "Message is required." }, { status: 400 });

  await prisma.orderComment.create({
    data: {
      orderId,
      userId: user.id,
      message,
    },
  });

  revalidatePath("/admin/orders");
  revalidatePath("/dealer/history");
  return NextResponse.json({ ok: true });
}
