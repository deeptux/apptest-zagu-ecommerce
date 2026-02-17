import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type IncomingOrderItem = {
  productId: number;
  quantity: number;
};

type IncomingCheckoutDetails = {
  deliveryAddress?: string;
  deliveryCoordinates?: string;
  paymentMethod?: string;
  paymentDetails?: string;
  shippingFee?: number;
  taxAmount?: number;
  discountAmount?: number;
  grandTotal?: number;
};

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user || user.role !== Role.DEALER) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const items = (Array.isArray(body.items) ? body.items : []) as IncomingOrderItem[];
  const remarks = typeof body.remarks === "string" ? body.remarks.trim() : "";
  const checkout = (body.checkoutDetails || {}) as IncomingCheckoutDetails;
  const deliveryAddress =
    typeof checkout.deliveryAddress === "string" ? checkout.deliveryAddress.trim() : "";
  const deliveryCoordinates =
    typeof checkout.deliveryCoordinates === "string" ? checkout.deliveryCoordinates.trim() : "";
  const paymentMethod =
    typeof checkout.paymentMethod === "string" ? checkout.paymentMethod.trim() : "";
  const paymentDetails =
    typeof checkout.paymentDetails === "string" ? checkout.paymentDetails.trim() : "";
  const shippingFee =
    Number.isFinite(Number(checkout.shippingFee)) && Number(checkout.shippingFee) >= 0
      ? Number(checkout.shippingFee)
      : 0;
  const taxAmount =
    Number.isFinite(Number(checkout.taxAmount)) && Number(checkout.taxAmount) >= 0
      ? Number(checkout.taxAmount)
      : 0;
  const discountAmount =
    Number.isFinite(Number(checkout.discountAmount)) && Number(checkout.discountAmount) >= 0
      ? Number(checkout.discountAmount)
      : 0;
  const grandTotal =
    Number.isFinite(Number(checkout.grandTotal)) && Number(checkout.grandTotal) >= 0
      ? Number(checkout.grandTotal)
      : 0;

  if (!items.length) {
    return NextResponse.json({ error: "Cart is empty." }, { status: 400 });
  }

  const normalized = items
    .map((item) => ({
      productId: Number(item.productId),
      quantity: Number(item.quantity),
    }))
    .filter((item) => Number.isInteger(item.productId) && Number.isInteger(item.quantity) && item.quantity > 0);

  if (!normalized.length) {
    return NextResponse.json({ error: "No valid order items." }, { status: 400 });
  }

  const productIds = [...new Set(normalized.map((item) => item.productId))];
  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
      isVisible: true,
    },
  });

  if (products.length !== productIds.length) {
    return NextResponse.json({ error: "Some products are unavailable." }, { status: 400 });
  }

  const productMap = new Map(products.map((p) => [p.id, p]));
  let lines: Array<{
    productId: number;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }> = [];
  try {
    lines = normalized.map((item) => {
      const product = productMap.get(item.productId)!;
      if (product.stock <= 0) {
        throw new Error(`${product.name} is out of stock.`);
      }
      if (item.quantity > product.stock) {
        throw new Error(`Only ${product.stock} stock available for ${product.name}.`);
      }
      const lineTotal = product.price * item.quantity;
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: product.price,
        lineTotal,
      };
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Some products are out of stock.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  const totalAmount = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const reference = `SO-${Date.now()}`;

  let order: { id: number; reference: string };
  try {
    order = await prisma.$transaction(async (tx) => {
      for (const line of lines) {
        const updated = await tx.product.updateMany({
          where: { id: line.productId, stock: { gte: line.quantity } },
          data: { stock: { decrement: line.quantity } },
        });
        if (updated.count === 0) {
          const product = productMap.get(line.productId);
          throw new Error(`${product?.name || "Product"} is out of stock.`);
        }
      }

      return tx.order.create({
        data: {
          reference,
          userId: user.id,
          remarks: remarks || null,
          totalAmount,
          shippingFee,
          taxAmount,
          discountAmount,
          grandTotal: grandTotal || Math.max(0, totalAmount + shippingFee + taxAmount - discountAmount),
          deliveryAddress: deliveryAddress || null,
          deliveryCoordinates: deliveryCoordinates || null,
          paymentMethod: paymentMethod || null,
          paymentDetails: paymentDetails || null,
          items: {
            create: lines,
          },
        },
        select: { id: true, reference: true },
      });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit order due to stock changes.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ order }, { status: 201 });
}
