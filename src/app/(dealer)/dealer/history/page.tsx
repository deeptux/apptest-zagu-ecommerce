import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OrdersTable } from "@/components/orders-table";

export default async function DealerHistoryPage() {
  const user = await requireRole([Role.DEALER]);

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { items: { include: { product: true } } },
  });

  return (
    <section className="space-y-4">
      {orders.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          No orders yet.
        </div>
      )}
      {orders.length > 0 && (
        <OrdersTable
          role="DEALER"
          orders={orders.map((order) => ({
            id: order.id,
            reference: order.reference,
            dealerName: user.name,
            createdAt: order.createdAt.toISOString(),
            totalAmount: order.totalAmount,
            shippingFee: order.shippingFee,
            taxAmount: order.taxAmount,
            discountAmount: order.discountAmount,
            grandTotal: order.grandTotal,
            status: order.status,
            remarks: order.remarks,
            deliveryAddress: order.deliveryAddress,
            deliveryCoordinates: order.deliveryCoordinates,
            paymentMethod: order.paymentMethod,
            paymentDetails: order.paymentDetails,
            items: order.items.map((item) => ({
              id: item.id,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              lineTotal: item.lineTotal,
              product: {
                id: item.product.id,
                code: item.product.code,
                name: item.product.name,
                imageUrl: item.product.imageUrl,
              },
            })),
          }))}
        />
      )}
    </section>
  );
}
