import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/prisma";

const adminNav = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/orders", label: "Order Approvals" },
  { href: "/admin/products", label: "Product Management" },
];

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireRole([Role.ADMIN]);
  const pendingOrders = await prisma.order.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      reference: true,
      user: {
        select: {
          name: true,
        },
      },
    },
  });

  return (
    <AppShell
      role="ADMIN"
      userName={user.name}
      navItems={adminNav}
      pendingOrders={pendingOrders.map((order) => ({
        id: order.id,
        reference: order.reference,
        dealerName: order.user.name,
      }))}
    >
      {children}
    </AppShell>
  );
}
