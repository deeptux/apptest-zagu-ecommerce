import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { Role } from "@prisma/client";
import { AdminSalesFigureChart } from "@/components/admin-sales-figure-chart";
import { DealerAnnouncementsHero } from "@/components/dealer-announcements-hero";
import { DealerDashboardLiveSync } from "@/components/dealer-dashboard-live-sync";
import { ArrowUpRight, ClipboardClock, Layers3, ShoppingBag } from "lucide-react";

export default async function DealerDashboardPage() {
  const user = await requireRole([Role.DEALER]);

  const [pendingOrders, totalOrders, approvedOrders, rejectedOrders, dealerOrders] = await Promise.all([
    prisma.order.count({ where: { userId: user.id, status: "PENDING" } }),
    prisma.order.count({ where: { userId: user.id } }),
    prisma.order.count({ where: { userId: user.id, status: "APPROVED" } }),
    prisma.order.count({ where: { userId: user.id, status: "REJECTED" } }),
    prisma.order.findMany({
      where: { userId: user.id },
      select: {
        status: true,
        createdAt: true,
        totalAmount: true,
        grandTotal: true,
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const orderCost = (order: { totalAmount: number; grandTotal: number }) =>
    order.grandTotal > 0 ? order.grandTotal : order.totalAmount;
  const approvedSpend = dealerOrders
    .filter((order) => order.status === "APPROVED")
    .reduce((sum, order) => sum + orderCost(order), 0);
  const allOrdersSpend = dealerOrders.reduce((sum, order) => sum + orderCost(order), 0);
  const approvedSpendPct = allOrdersSpend > 0 ? Math.round((approvedSpend / allOrdersSpend) * 100) : 0;

  const now = new Date();
  const monthlyChartData = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    const monthlyOrders = dealerOrders.filter(
      (order) => order.createdAt >= monthStart && order.createdAt < monthEnd,
    );
    const submittedSpend = monthlyOrders.reduce((sum, order) => sum + orderCost(order), 0);
    const approvedMonthlySpend = monthlyOrders
      .filter((order) => order.status === "APPROVED")
      .reduce((sum, order) => sum + orderCost(order), 0);

    return {
      label: monthStart.toLocaleString("en-US", { month: "short" }),
      salesA: Number(submittedSpend.toFixed(2)),
      salesB: Number(approvedMonthlySpend.toFixed(2)),
    };
  });

  const maxCount = Math.max(totalOrders, 1);
  const approvedPct = Math.round((approvedOrders / maxCount) * 100);
  const pendingPct = Math.round((pendingOrders / maxCount) * 100);
  const rejectedPct = Math.round((rejectedOrders / maxCount) * 100);

  return (
    <div className="space-y-5">
      <DealerDashboardLiveSync />
      <DealerAnnouncementsHero
        slides={[
          {
            id: "s1",
            title: "System Update",
            description: "Ordering and checkout flow are running normally with real-time status updates.",
            imageUrl: "/images/menu.jpg",
          },
          {
            id: "s2",
            title: "Holiday Schedule",
            description: "Please check blocked pickup dates before confirming large-volume requests.",
            imageUrl: "/images/bg-login.png",
          },
          {
            id: "s3",
            title: "Catalog Refresh",
            description: "New and updated SKUs are now reflected directly in your ordering list.",
            imageUrl: "/images/company-logo.png",
          },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-[#edd9b2] bg-[#fffaf0] p-5">
          <div className="flex items-start justify-between">
            <div className="min-w-0 pr-2">
              <p className="truncate text-sm font-medium text-slate-500">Total Order Cost Spent</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                PHP {approvedSpend.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="rounded-2xl bg-[#fff0cf] p-2 text-[#dea43a]">
              <Layers3 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 h-2 rounded-full bg-[#f7ebd4]">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-[#e6b642] to-[#ed8a72]"
              style={{ width: `${approvedSpendPct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {approvedSpendPct}% of all submitted order cost ({allOrdersSpend.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })} total)
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between">
            <div className="min-w-0 pr-2">
              <p className="truncate text-sm font-medium text-slate-500">Pending Orders</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{pendingOrders}</p>
            </div>
            <div className="rounded-2xl bg-[#ffe6de] p-2 text-[#de7c64]">
              <ClipboardClock className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-400">Awaiting admin action</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between">
            <div className="min-w-0 pr-2">
              <p className="truncate text-sm font-medium text-slate-500">Total Orders</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{totalOrders}</p>
            </div>
            <div className="rounded-2xl bg-[#eef6ff] p-2 text-[#568bdc]">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-400">All submitted dealer requests</p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-[33px] font-black leading-none tracking-tight text-slate-900">
            Dealer Order Cost Trend
          </h2>
          <AdminSalesFigureChart data={monthlyChartData} />
          <p className="mt-3 text-sm text-slate-500">
            Last 6 months of submitted cost vs approved cost.
          </p>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5">
          <h3 className="text-xl font-bold text-slate-900">Order Breakdown</h3>
          <div className="mt-4 space-y-3">
            {[
              { label: "Approved", value: approvedPct },
              { label: "Pending", value: pendingPct },
              { label: "Rejected", value: rejectedPct },
            ].map((item) => (
              <div key={item.label}>
                <div className="mb-1 flex justify-between text-xs text-slate-500">
                  <span>{item.label}</span>
                  <span>{item.value}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100">
                  <div
                    className="h-2.5 rounded-full bg-gradient-to-r from-[#e6b642] to-[#ef6b5a]"
                    style={{ width: `${item.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
            <p className="flex items-center gap-2 font-semibold text-slate-700">
              <ArrowUpRight className="h-4 w-4 text-[#d8a84a]" />
              Quick Insight
            </p>
            <p className="mt-1">Higher approval ratio usually means faster order turnaround.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
