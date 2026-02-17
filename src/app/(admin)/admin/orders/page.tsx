import { prisma } from "@/lib/prisma";
import { OrdersTable } from "@/components/orders-table";

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: true,
      items: { include: { product: true } },
    },
  });

  return (
    <section className="space-y-4">
      <OrdersTable
        role="ADMIN"
        orders={orders.map((order) => ({
          id: order.id,
          reference: order.reference,
          dealerName: order.user.name,
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
    </section>
  );
}
