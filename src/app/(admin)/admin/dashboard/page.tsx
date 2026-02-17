import { prisma } from "@/lib/prisma";
import {
  ArrowUpRight,
  CalendarClock,
  Megaphone,
  PackagePlus,
  ReceiptText,
  UserRoundPlus,
} from "lucide-react";
import { AdminSalesFigureChart } from "@/components/admin-sales-figure-chart";
import { AdminDashboardLiveSync } from "@/components/admin-dashboard-live-sync";
import { AdminStockPieChart } from "@/components/admin-stock-pie-chart";
import { AdminDealerOrdersBarChart } from "@/components/admin-dealer-orders-bar-chart";

export default async function AdminDashboardPage() {
  const [orders, productsCount, dealersCount, dealers] = await Promise.all([
    prisma.order.findMany({
      select: {
        status: true,
        createdAt: true,
        totalAmount: true,
        grandTotal: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.product.count(),
    prisma.user.count({ where: { role: "DEALER" } }),
    prisma.user.findMany({
      where: { role: "DEALER" },
      select: {
        name: true,
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const orderCost = (order: { totalAmount: number; grandTotal: number }) =>
    order.grandTotal > 0 ? order.grandTotal : order.totalAmount;

  const totalOrders = orders.length;
  const approvedOrders = orders.filter((order) => order.status === "APPROVED").length;
  const pendingOrders = orders.filter((order) => order.status === "PENDING").length;
  const rejectedOrders = orders.filter((order) => order.status === "REJECTED").length;
  const settledOrders = approvedOrders + rejectedOrders;

  const totalOrderCost = orders.reduce((sum, order) => sum + orderCost(order), 0);
  const approvedOrderCost = orders
    .filter((order) => order.status === "APPROVED")
    .reduce((sum, order) => sum + orderCost(order), 0);
  const rejectedOrderCost = orders
    .filter((order) => order.status === "REJECTED")
    .reduce((sum, order) => sum + orderCost(order), 0);

  const approvedFromAllPct = totalOrders > 0 ? Math.round((approvedOrders / totalOrders) * 100) : 0;
  const approvedPct = totalOrders > 0 ? Math.round((approvedOrders / totalOrders) * 100) : 0;
  const pendingPct = totalOrders > 0 ? Math.round((pendingOrders / totalOrders) * 100) : 0;
  const rejectedPct = totalOrders > 0 ? Math.round((rejectedOrders / totalOrders) * 100) : 0;
  const rejectedCostPct = totalOrderCost > 0 ? Math.round((rejectedOrderCost / totalOrderCost) * 100) : 0;

  const now = new Date();
  const monthlyLineData = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    const monthlyOrders = orders.filter((order) => order.createdAt >= monthStart && order.createdAt < monthEnd);
    const totalCost = monthlyOrders.reduce((sum, order) => sum + orderCost(order), 0);
    const approvedCost = monthlyOrders
      .filter((order) => order.status === "APPROVED")
      .reduce((sum, order) => sum + orderCost(order), 0);
    const rejectedCost = monthlyOrders
      .filter((order) => order.status === "REJECTED")
      .reduce((sum, order) => sum + orderCost(order), 0);

    return {
      label: monthStart.toLocaleString("en-US", { month: "short" }),
      salesA: Number(totalCost.toFixed(2)),
      salesB: Number(approvedCost.toFixed(2)),
      salesC: Number(rejectedCost.toFixed(2)),
    };
  });

  const stockRows = await prisma.product.findMany({
    select: { stock: true, name: true },
    orderBy: { updatedAt: "desc" },
  });
  const stockPieData = [
    { label: "In Stock", value: stockRows.filter((item) => item.stock > 10).length },
    { label: "Low Stock", value: stockRows.filter((item) => item.stock > 0 && item.stock <= 10).length },
    { label: "Out Stock", value: stockRows.filter((item) => item.stock <= 0).length },
  ];

  const dealerBarData = dealers.map((dealer) => ({
    dealer: dealer.name,
    orders: dealer._count.orders,
  }));
  const topOutOfStockProducts = stockRows.filter((item) => item.stock <= 0).slice(0, 5);

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
      <AdminDashboardLiveSync />
      <section className="space-y-5">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-[#edd9b2] bg-[#fffaf0] p-5">
            <div className="flex items-start justify-between">
              <div className="min-w-0 pr-2">
                <p className="truncate text-sm font-medium text-slate-500 min-[851px]:max-w-none">
                  Sales Orders
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{totalOrders}</p>
              </div>
              <div className="rounded-2xl bg-[#fff0cf] p-2 text-[#dea43a]">
                <ReceiptText className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 h-2 rounded-full bg-[#f7ebd4]">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-[#e6b642] to-[#ed8a72]"
                style={{ width: `${approvedFromAllPct}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">{approvedFromAllPct}% approved out of all orders</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between">
              <div className="min-w-0 pr-2">
                <p className="truncate text-sm font-medium text-slate-500 min-[851px]:max-w-none">
                  Transactions
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {approvedOrders}/{settledOrders}
                </p>
              </div>
              <div className="rounded-2xl bg-[#ffe6de] p-2 text-[#de7c64]">
                <ArrowUpRight className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Rejected: {rejectedOrders}/{settledOrders}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between">
              <div className="min-w-0 pr-2">
                <p className="truncate text-sm font-medium text-slate-500 min-[851px]:max-w-none">
                  New Dealers
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{dealersCount}</p>
              </div>
              <div className="rounded-2xl bg-[#fff0cf] p-2 text-[#dea43a]">
                <UserRoundPlus className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-400">Current active dealers in system</p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-[33px] font-black leading-none tracking-tight text-slate-900">
            Order Cost Trend
          </h2>
          <AdminSalesFigureChart data={monthlyLineData} />
          <p className="mt-3 text-sm text-slate-500">
            Last 6 months: total order cost vs approved order cost.
          </p>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Product Stock Distribution</h3>
              <AdminStockPieChart data={stockPieData} />
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                {stockPieData.map((slice, index) => {
                  const colors = ["#ebb446", "#4e95f2", "#ef6b5a"];
                  return (
                    <span key={slice.label} className="inline-flex items-center gap-1.5">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: colors[index % colors.length] }}
                      />
                      {slice.label}
                    </span>
                  );
                })}
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Orders Per Dealer</h3>
              <AdminDealerOrdersBarChart data={dealerBarData} />
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-500">
            Product master count: {productsCount} active SKU records.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <h3 className="text-2xl font-bold text-slate-900">Announcements</h3>
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl bg-[#fff7e8] p-4">
              <p className="flex items-center gap-2 font-semibold text-slate-800">
                <Megaphone className="h-4 w-4 text-[#d8a84a]" />
                System Update
              </p>
              <p className="text-sm text-slate-500">Order sync queue is operating normally.</p>
            </div>
            <div className="rounded-2xl bg-[#fff7e8] p-4">
              <p className="flex items-center gap-2 font-semibold text-slate-800">
                <CalendarClock className="h-4 w-4 text-[#d8a84a]" />
                Holiday Schedule
              </p>
              <p className="text-sm text-slate-500">Schedule blocks are applied to pickup dates.</p>
            </div>
            <div className="rounded-2xl bg-[#fff7e8] p-4">
              <p className="flex items-center gap-2 font-semibold text-slate-800">
                <PackagePlus className="h-4 w-4 text-[#d8a84a]" />
                New Product Line
              </p>
              <p className="text-sm text-slate-500">Fresh SKUs were added by catalog management.</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <h3 className="text-xl font-bold text-slate-900">Sales Breakdown</h3>
          <div className="mt-4 space-y-3">
            {[
              { label: "Approved", value: approvedPct },
              { label: "Pending", value: pendingPct },
              { label: "Rejected", value: rejectedPct },
              { label: "Rejected Cost Share", value: rejectedCostPct },
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
          <p className="mt-4 text-xs text-slate-500">
            Approved cost total: PHP {approvedOrderCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <h3 className="text-xl font-bold text-slate-900">Registered Products</h3>
          <p className="mt-3 text-3xl font-bold text-slate-900">{productsCount}</p>
          <p className="mt-2 text-xs text-slate-500">Total products currently registered in catalog.</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <h3 className="text-xl font-bold text-slate-900">Top 5 Out of Stock</h3>
          <ul className="mt-3 space-y-1 text-sm text-slate-700">
            {topOutOfStockProducts.length === 0 ? (
              <li>No out-of-stock products.</li>
            ) : (
              topOutOfStockProducts.map((item) => <li key={item.name}>- {item.name}</li>)
            )}
          </ul>
        </div>
      </section>
    </div>
  );
}
