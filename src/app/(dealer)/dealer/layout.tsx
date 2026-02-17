import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

const dealerNav = [
  { href: "/dealer/dashboard", label: "Overview" },
  { href: "/dealer/ordering", label: "Place Order" },
  { href: "/dealer/history", label: "Order History" },
];

export default async function DealerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireRole([Role.DEALER]);

  return (
    <AppShell
      role="DEALER"
      userName={user.name}
      navItems={dealerNav}
    >
      {children}
    </AppShell>
  );
}
