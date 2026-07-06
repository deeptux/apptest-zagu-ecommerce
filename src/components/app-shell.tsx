"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ShoppingCart,
  X,
} from "lucide-react";
import { logoutAction } from "@/app/actions";
import { assetPath } from "@/lib/base-path";
import { useCartStore } from "@/store/cart-store";

type NavItem = {
  href: string;
  label: string;
};

type AppShellProps = {
  role: "ADMIN" | "DEALER";
  userName: string;
  navItems: NavItem[];
  pendingOrders?: {
    id: number;
    reference: string;
    dealerName: string;
  }[];
  children: React.ReactNode;
};

function LogoutButton({ collapsed }: { collapsed: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`w-full rounded-xl border border-white/50 px-3 py-2.5 text-sm font-semibold text-white ${
        pending ? "cursor-not-allowed opacity-70" : "hover:bg-white/20"
      } ${collapsed ? "md:flex md:justify-center" : "flex items-center gap-3"}`}
      title={collapsed ? "Logout" : undefined}
      aria-busy={pending}
    >
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 text-white">
        <LogOut className="h-4 w-4" />
      </span>
      <span className={collapsed ? "md:hidden" : ""}>{pending ? "Logging out..." : "Logout"}</span>
    </button>
  );
}

export function AppShell({
  role,
  userName,
  navItems,
  pendingOrders = [],
  children,
}: AppShellProps) {
  const activePath = usePathname();
  const router = useRouter();
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showHeaderPanel, setShowHeaderPanel] = useState(false);
  const [orderingSummaryOpen, setOrderingSummaryOpen] = useState(false);
  const [cartReady, setCartReady] = useState(false);
  const [optimisticPath, setOptimisticPath] = useState<string | null>(null);
  const cartItems = useCartStore((state) => state.items);
  const cartItemCount = useCartStore((state) => state.itemCount());
  const cartTotalAmount = useCartStore((state) => state.totalAmount());

  useEffect(() => {
    setCartReady(true);
  }, []);

  useEffect(() => {
    setOptimisticPath(null);
  }, [activePath]);

  useEffect(() => {
    const handleSummaryState = (event: Event) => {
      const custom = event as CustomEvent<{ open?: boolean }>;
      setOrderingSummaryOpen(Boolean(custom.detail?.open));
    };
    window.addEventListener("zagu:order-summary-state", handleSummaryState);
    return () => window.removeEventListener("zagu:order-summary-state", handleSummaryState);
  }, []);

  const visibleCartItems = cartReady ? cartItems : [];
  const visibleCartItemCount = cartReady ? cartItemCount : 0;
  const visibleCartTotalAmount = cartReady ? cartTotalAmount : 0;
  const highlightPath = optimisticPath || activePath;

  const pageTitle = useMemo(() => {
    const current = navItems.find((item) => highlightPath.startsWith(item.href));
    return current?.label || "Workspace";
  }, [highlightPath, navItems]);

  const subtitle =
    role === "ADMIN"
      ? "Approve dealer orders and manage products"
      : "Browse products and place orders";

  const getNavIcon = (href: string) => {
    if (href.includes("dashboard")) return <LayoutDashboard className="h-4 w-4" />;
    if (href.includes("ordering")) return <ShoppingCart className="h-4 w-4" />;
    if (href.includes("history")) return <History className="h-4 w-4" />;
    if (href.includes("orders")) return <ClipboardCheck className="h-4 w-4" />;
    if (href.includes("products")) return <Package className="h-4 w-4" />;
    return <LayoutDashboard className="h-4 w-4" />;
  };

  const handleCartItemClick = () => {
    setShowHeaderPanel(false);
    if (activePath.startsWith("/dealer/ordering")) {
      window.dispatchEvent(new Event("zagu:open-order-summary"));
      return;
    }
    router.push("/dealer/ordering?openCart=1");
  };

  return (
    <div className="min-h-screen bg-[#f4f5f8]">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <button
        onClick={() => setMobileOpen((prev) => !prev)}
        className="fixed right-3 top-1/2 z-50 -translate-y-1/2 rounded-full border border-slate-300 bg-white p-2 shadow-lg md:hidden"
        aria-label="Toggle sidebar"
      >
        {mobileOpen ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>

      <aside
        className={`rounded-r-2xl fixed inset-y-0 left-0 z-40 flex flex-col bg-gradient-to-b from-[#f4b133] to-[#f6bf5a] p-5 text-white transition-all duration-300 md:z-20 ${mobileOpen ? "translate-x-0 w-[230px]" : "-translate-x-full w-[230px] md:translate-x-0"
          } ${desktopCollapsed ? "md:w-[86px]" : "md:w-[230px]"}`}
      >
        <div
          className={`mb-8 mt-2 flex items-center ${
            desktopCollapsed ? "justify-between gap-2 md:justify-center md:gap-0" : "justify-between gap-2"
          }`}
        >
          {desktopCollapsed ? (
            <>
              <div className="relative h-8 w-8 overflow-hidden rounded-full bg-white hidden md:block">
                <Image
                  src={assetPath("/images/company-logo-circle.jpg")}
                  unoptimized
                  alt="Company logo circle"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="inline-flex w-fit overflow-hidden rounded-md bg-white/20 md:hidden">
                <Image
                  src={assetPath("/images/company-logo.png")}
                  unoptimized
                  alt="Company logo"
                  width={150}
                  height={48}
                  className="h-10 w-auto object-contain object-left"
                />
              </div>
            </>
          ) : (
            <div className="inline-flex w-fit overflow-hidden rounded-md bg-white/20">
              <Image
                src={assetPath("/images/company-logo.png")}
                unoptimized
                alt="Company logo"
                width={150}
                height={48}
                className="h-12 w-auto object-contain object-left"
              />
            </div>
          )}

          <button onClick={() => setMobileOpen(false)} className="rounded p-1 md:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className={`mb-4 text-xs uppercase text-white/80 ${desktopCollapsed ? "md:hidden" : ""}`}>
          More Zagu, Less worries #ZAGUdTime!
        </p>
        <nav className="space-y-2">
          {navItems.map((item) => {
            const active = highlightPath.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  setMobileOpen(false);
                  setOptimisticPath(item.href);
                  setShowHeaderPanel(false);
                }}
                prefetch
                className={`flex items-center rounded-xl px-3 py-2.5 text-sm transition ${active ? "bg-white text-[#d28f0a] font-semibold" : "text-white/90 hover:bg-white/20"
                  } ${desktopCollapsed ? "md:justify-center md:px-2" : "gap-3"}`}
                title={desktopCollapsed ? item.label : undefined}
              >
                <span
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${active ? "bg-[#fef3d8] text-[#d28f0a]" : "bg-white/15 text-white"
                    }`}
                >
                  {getNavIcon(item.href)}
                </span>
                <span className={desktopCollapsed ? "md:hidden" : ""}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <form action={logoutAction} className="mt-auto">
          <LogoutButton collapsed={desktopCollapsed} />
        </form>
      </aside>

      <div
        className={`min-h-screen transition-all duration-300 ${desktopCollapsed ? "md:pl-[86px]" : "md:pl-[230px]"
          }`}
      >
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:px-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => setDesktopCollapsed((prev) => !prev)}
                className="hidden rounded-lg border border-slate-200 bg-white p-2 text-slate-600 md:flex"
              >
                <Menu className="h-4 w-4" />
              </button>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-bold text-slate-900 md:text-2xl">{pageTitle}</h1>
                <p className="truncate text-xs text-slate-500 md:text-sm">{subtitle}</p>
              </div>
            </div>

            <div className="relative flex min-w-0 items-center gap-2">
              <button
                onClick={() => {
                  if (
                    role === "DEALER" &&
                    activePath.startsWith("/dealer/ordering") &&
                    orderingSummaryOpen
                  ) {
                    return;
                  }
                  setShowHeaderPanel((prev) => !prev);
                }}
                className="inline-flex max-w-[130px] items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm min-[885px]:max-w-none"
              >
                {role === "DEALER" ? (
                  <>
                    <ShoppingCart className="h-4 w-4" />
                    <span className="truncate whitespace-nowrap">{visibleCartItemCount} items</span>
                  </>
                ) : (
                  <>
                    <Bell className="h-4 w-4" />
                    <span className="truncate whitespace-nowrap">{pendingOrders.length} pending</span>
                  </>
                )}
              </button>
              <div className="max-w-[120px] truncate rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 md:text-sm min-[885px]:max-w-none">
                <span className="block truncate whitespace-nowrap">{userName}</span>
              </div>

              {showHeaderPanel && (
                <div className="absolute right-0 top-11 z-40 w-[320px] rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
                  {role === "DEALER" ? (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase text-slate-500">Cart Items</p>
                      {visibleCartItems.length === 0 ? (
                        <p className="text-sm text-slate-500">Cart is empty.</p>
                      ) : (
                        <>
                          {visibleCartItems.map((item) => (
                            <button
                              key={item.productId}
                              onClick={handleCartItemClick}
                              className="flex w-full items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm hover:bg-slate-100"
                            >
                              <span className="flex min-w-0 items-center gap-2 pr-2">
                                <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md bg-slate-200">
                                  <Image
                                    src={assetPath(item.imageUrl)}
                                    unoptimized
                                    alt={item.name}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                                <span className="truncate">
                                  {item.name} x {item.quantity}
                                </span>
                              </span>
                              <span className="font-semibold">
                                PHP {(item.price * item.quantity).toFixed(2)}
                              </span>
                            </button>
                          ))}
                          <div className="pt-2 text-right text-sm font-semibold text-slate-900">
                            Total: PHP {visibleCartTotalAmount.toFixed(2)}
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase text-slate-500">Pending Orders</p>
                      {pendingOrders.length === 0 ? (
                        <p className="text-sm text-slate-500">No pending approvals.</p>
                      ) : (
                        pendingOrders.map((order) => (
                          <div key={order.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                            <p className="font-semibold text-slate-800">{order.reference}</p>
                            <p className="text-xs text-slate-500">{order.dealerName}</p>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
