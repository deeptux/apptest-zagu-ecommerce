"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownAZ, ArrowUpDown, ArrowUpZA, Filter, MessageSquareText } from "lucide-react";

type OrderStatus = "PENDING" | "APPROVED" | "REJECTED";
type Role = "ADMIN" | "DEALER";

type OrderRow = {
  id: number;
  reference: string;
  dealerName: string;
  createdAt: string;
  totalAmount: number;
  shippingFee: number;
  taxAmount: number;
  discountAmount: number;
  grandTotal: number;
  status: OrderStatus;
  remarks: string | null;
  deliveryAddress: string | null;
  deliveryCoordinates: string | null;
  paymentMethod: string | null;
  paymentDetails: string | null;
  items: {
    id: number;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    product: {
      id: number;
      code: string;
      name: string;
      imageUrl: string | null;
    };
  }[];
};

type OrderComment = {
  id: number;
  message: string;
  createdAt: string;
  user: {
    id: number;
    name: string;
    role: Role;
  };
};

type OrdersTableProps = {
  orders: OrderRow[];
  role: Role;
};

const statusStyles: Record<OrderStatus, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

export function OrdersTable({ orders, role }: OrdersTableProps) {
  const router = useRouter();
  const [sortBy, setSortBy] = useState<"reference" | "dealerName" | "createdAt" | "totalAmount">("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [statusRemarks, setStatusRemarks] = useState("");
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const [statusFilter, setStatusFilter] = useState<OrderStatus[]>([
    "PENDING",
    "APPROVED",
    "REJECTED",
  ]);
  const [rejectConfirmOrder, setRejectConfirmOrder] = useState<{
    id: number;
    reason?: string;
    origin: "row" | "modal";
  } | null>(null);

  const [comments, setComments] = useState<OrderComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentsBusy, setCommentsBusy] = useState(false);
  const [coordinatesModal, setCoordinatesModal] = useState<string | null>(null);
  const commentsContainerRef = useRef<HTMLDivElement | null>(null);

  const formatMoney = (value: number | null | undefined) =>
    Number(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 });

  const shortenReference = (value: string) => {
    if (value.length <= 12) return value;
    return `${value.slice(0, 7)}...${value.slice(-5)}`;
  };

  const filteredAndSortedOrders = useMemo(() => {
    const copy = orders.filter((order) => statusFilter.includes(order.status));

    copy.sort((a, b) => {
      const modifier = sortDirection === "asc" ? 1 : -1;
      if (sortBy === "reference") return a.reference.localeCompare(b.reference) * modifier;
      if (sortBy === "dealerName") return a.dealerName.localeCompare(b.dealerName) * modifier;
      if (sortBy === "totalAmount") return (a.totalAmount - b.totalAmount) * modifier;
      return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * modifier;
    });
    return copy;
  }, [orders, sortBy, sortDirection, statusFilter]);

  const toggleSort = (key: "reference" | "dealerName" | "createdAt" | "totalAmount") => {
    if (sortBy === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(key);
    setSortDirection("asc");
  };

  const toggleStatusFilter = (status: OrderStatus) => {
    setStatusFilter((prev) => {
      if (prev.includes(status)) {
        if (prev.length === 1) return prev;
        return prev.filter((item) => item !== status);
      }
      return [...prev, status];
    });
  };

  const scrollCommentsToBottom = () => {
    if (!commentsContainerRef.current) return;
    commentsContainerRef.current.scrollTo({
      top: commentsContainerRef.current.scrollHeight,
      behavior: "smooth",
    });
  };

  const refreshComments = async (orderId: number) => {
    const response = await fetch(`/api/orders/${orderId}/comments`, { cache: "no-store" });
    if (!response.ok) return;
    const payload = (await response.json()) as { comments: OrderComment[] };
    setComments(payload.comments || []);
  };

  useEffect(() => {
    if (!selectedOrder) return;
    void refreshComments(selectedOrder.id);
    const timer = setInterval(() => {
      void refreshComments(selectedOrder.id);
    }, 4000);
    return () => clearInterval(timer);
  }, [selectedOrder]);

  useEffect(() => {
    const stream = new EventSource("/api/orders/stream");
    stream.onmessage = () => {
      router.refresh();
    };
    stream.onerror = () => {
      stream.close();
    };
    return () => stream.close();
  }, [router]);

  const updateStatus = async (orderId: number, status: "APPROVED" | "REJECTED", reason = "") => {
    try {
      setIsBusy(true);
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reason }),
      });
      if (!response.ok) return;
      router.refresh();
    } finally {
      setIsBusy(false);
    }
  };

  const submitComment = async () => {
    if (!selectedOrder || !commentText.trim()) return;
    try {
      setCommentsBusy(true);
      const response = await fetch(`/api/orders/${selectedOrder.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: commentText.trim() }),
      });
      if (!response.ok) return;
      setCommentText("");
      await refreshComments(selectedOrder.id);
      scrollCommentsToBottom();
    } finally {
      setCommentsBusy(false);
    }
  };

  const mapEmbedUrl = coordinatesModal
    ? `https://maps.google.com/maps?q=${encodeURIComponent(coordinatesModal)}&z=16&output=embed`
    : "";

  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white max-[1085px]:overflow-x-auto overflow-hidden">
        <div className="max-h-[calc(100vh-260px)] overflow-y-auto">
        <table className="w-full min-w-[1050px] table-fixed text-left">
          <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 sm:text-xs">
            <tr>
              <th className="sticky top-0 z-10 min-w-[170px] bg-slate-50 px-3 py-3 sm:px-4">
                <button
                  onClick={() => toggleSort("reference")}
                  className="inline-flex items-center gap-1 font-semibold hover:text-slate-700"
                >
                  Reference
                  {sortBy === "reference" ? (
                    sortDirection === "asc" ? <ArrowDownAZ className="h-3.5 w-3.5" /> : <ArrowUpZA className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
                  )}
                </button>
              </th>
              <th className="sticky top-0 z-10 min-w-[150px] bg-slate-50 px-3 py-3 sm:px-4">
                <button
                  onClick={() => toggleSort("dealerName")}
                  className="inline-flex items-center gap-1 font-semibold hover:text-slate-700"
                >
                  Dealer
                  {sortBy === "dealerName" ? (
                    sortDirection === "asc" ? <ArrowDownAZ className="h-3.5 w-3.5" /> : <ArrowUpZA className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
                  )}
                </button>
              </th>
              <th className="sticky top-0 z-10 min-w-[210px] w-[210px] bg-slate-50 px-3 py-3 sm:px-4">
                <button
                  onClick={() => toggleSort("createdAt")}
                  className="inline-flex items-center gap-1 font-semibold hover:text-slate-700"
                >
                  Date
                  <ArrowUpDown className="h-3.5 w-3.5 opacity-70" />
                </button>
              </th>
              <th className="sticky top-0 z-10 min-w-[170px] w-[170px] bg-slate-50 px-3 py-3 sm:px-4">
                <button
                  onClick={() => toggleSort("totalAmount")}
                  className="inline-flex items-center gap-1 font-semibold hover:text-slate-700"
                >
                  Total
                  <ArrowUpDown className="h-3.5 w-3.5 opacity-70" />
                </button>
              </th>
              <th className="sticky top-0 z-10 relative min-w-[150px] bg-slate-50 px-3 py-3 sm:px-4">
                <button
                  onClick={() => setShowStatusFilter((prev) => !prev)}
                  className="inline-flex items-center gap-1 font-semibold hover:text-slate-700"
                >
                  Status
                  <Filter className="h-3.5 w-3.5" />
                </button>
                {showStatusFilter && (
                  <div className="absolute left-0 top-10 z-20 w-40 rounded-lg border border-slate-200 bg-white p-2 text-[11px] shadow-lg">
                    {(["PENDING", "APPROVED", "REJECTED"] as OrderStatus[]).map((status) => (
                      <label key={status} className="flex items-center gap-2 px-1 py-1.5 text-slate-700">
                        <input
                          type="checkbox"
                          checked={statusFilter.includes(status)}
                          onChange={() => toggleStatusFilter(status)}
                        />
                        {status}
                      </label>
                    ))}
                  </div>
                )}
              </th>
              <th className="sticky top-0 z-10 min-w-[170px] bg-slate-50 px-3 py-3 sm:px-4">Remarks</th>
              {role === "ADMIN" && <th className="sticky top-0 z-10 min-w-[160px] bg-slate-50 px-3 py-3 sm:px-4">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedOrders.map((order) => (
              <tr
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className="cursor-pointer border-t border-slate-100 text-[10px] hover:bg-slate-50 sm:text-xs md:text-sm"
              >
                <td className="min-w-[170px] px-3 py-3 font-semibold text-slate-800 sm:px-4">
                  <span className="block max-[1085px]:hidden">{order.reference}</span>
                  <span className="hidden max-[1085px]:block">{shortenReference(order.reference)}</span>
                </td>
                <td className="min-w-[150px] px-3 py-3 text-slate-700 sm:px-4">
                  <span className="block truncate">{order.dealerName}</span>
                </td>
                <td className="w-[210px] min-w-[210px] px-3 py-3 text-slate-600 sm:px-4">
                  <span className="block whitespace-nowrap">{new Date(order.createdAt).toLocaleString()}</span>
                </td>
                <td className="w-[170px] min-w-[170px] px-3 py-3 font-semibold text-slate-900 sm:px-4">
                  PHP {formatMoney(order.totalAmount)}
                </td>
                <td className="min-w-[150px] px-3 py-3 sm:px-4">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[order.status]}`}>
                    {order.status}
                  </span>
                </td>
                <td className="min-w-[170px] px-3 py-3 text-slate-600 sm:px-4">
                  <span className="block truncate">
                    {order.remarks || "No remarks"}
                  </span>
                </td>
                {role === "ADMIN" && (
                  <td className="min-w-[160px] px-3 py-3 sm:px-4" onClick={(event) => event.stopPropagation()}>
                    {order.status === "PENDING" ? (
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <button
                          onClick={() => void updateStatus(order.id, "APPROVED")}
                          disabled={isBusy}
                          className="rounded-md bg-green-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => setRejectConfirmOrder({ id: order.id, origin: "row" })}
                          disabled={isBusy}
                          className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">No actions</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {filteredAndSortedOrders.length === 0 && (
              <tr>
                <td
                  colSpan={role === "ADMIN" ? 7 : 6}
                  className="px-4 py-6 text-center text-sm text-slate-500"
                >
                  No matching orders for selected status filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{selectedOrder.reference}</h2>
                <p className="text-sm text-slate-500">
                  {selectedOrder.dealerName} - {new Date(selectedOrder.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedOrder(null);
                  setStatusRemarks("");
                  setComments([]);
                  setCoordinatesModal(null);
                }}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
              >
                Close
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {selectedOrder.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                    <Image
                      src={item.product.imageUrl || "https://picsum.photos/seed/zagu-order/120/120"}
                      alt={item.product.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-800">{item.product.name}</p>
                    <p className="text-xs text-slate-500">{item.product.code}</p>
                    <p className="text-xs text-slate-500">Qty {item.quantity}</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">
                    PHP {formatMoney(item.lineTotal)}
                  </p>
                </div>
              ))}
            </div>

            {selectedOrder.remarks && (
              <p className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
                Remarks: {selectedOrder.remarks}
              </p>
            )}

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Delivery Address</p>
                <p className="mt-1 text-sm text-slate-700">
                  {selectedOrder.deliveryAddress || "No delivery address saved."}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedOrder.deliveryCoordinates) return;
                    setCoordinatesModal(selectedOrder.deliveryCoordinates);
                  }}
                  disabled={!selectedOrder.deliveryCoordinates}
                  className="mt-2 text-left text-xs font-semibold text-slate-600 underline underline-offset-2 disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50"
                >
                  Coordinates: {selectedOrder.deliveryCoordinates + "  [Click to view Map]" || "No coordinates selected."}
                </button>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Payment Method</p>
                <p className="mt-1 text-sm text-slate-700">
                  {selectedOrder.paymentMethod || "No payment method selected."}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedOrder.paymentDetails || "No payment details provided."}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Order Total Details</p>
              <div className="mt-2 grid gap-1 text-sm text-slate-700">
                <div className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span>PHP {formatMoney(selectedOrder.totalAmount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Shipping Fee</span>
                  <span>PHP {formatMoney(selectedOrder.shippingFee)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Tax</span>
                  <span>PHP {formatMoney(selectedOrder.taxAmount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Discount</span>
                  <span>- PHP {formatMoney(selectedOrder.discountAmount)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-base font-bold text-slate-900">
                  <span>Grand Total</span>
                  <span>PHP {formatMoney(selectedOrder.grandTotal)}</span>
                </div>
              </div>
            </div>

            <p className="mt-4 text-right text-sm font-bold text-slate-900">
              Grand Total: PHP {formatMoney(selectedOrder.grandTotal)}
            </p>

            {role === "ADMIN" && selectedOrder.status === "PENDING" && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Quick decision</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => void updateStatus(selectedOrder.id, "APPROVED")}
                    disabled={isBusy}
                    className="rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() =>
                      setRejectConfirmOrder({
                        id: selectedOrder.id,
                        reason: statusRemarks,
                        origin: "modal",
                      })
                    }
                    disabled={isBusy}
                    className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    Reject
                  </button>
                  <input
                    value={statusRemarks}
                    onChange={(event) => setStatusRemarks(event.target.value)}
                    placeholder="Remarks (optional)"
                    className="min-w-[220px] flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
            )}

            <div className="relative mt-6 rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-800">Order Comments</p>
              <div className="relative mt-3">
                <div
                  ref={commentsContainerRef}
                  className="max-h-52 space-y-2 overflow-auto rounded-lg bg-slate-50 p-3"
                >
                  {comments.length === 0 ? (
                    <p className="text-sm text-slate-500">No comments yet.</p>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="rounded-md bg-white px-3 py-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-700">
                            {comment.user.name} ({comment.user.role})
                          </span>
                          <span className="text-xs text-slate-400">
                            {new Date(comment.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="mt-1 text-slate-700">{comment.message}</p>
                      </div>
                    ))
                  )}
                </div>
                <button
                  onClick={scrollCommentsToBottom}
                  className="absolute bottom-3 right-5 inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-lg hover:bg-slate-700"
                >
                  <MessageSquareText className="h-3.5 w-3.5" />
                  Latest chat
                </button>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <input
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                <button
                  onClick={() => void submitComment()}
                  disabled={commentsBusy || !commentText.trim()}
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {coordinatesModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Pinned Coordinates</h3>
                <p className="text-sm text-slate-600">{coordinatesModal}</p>
              </div>
              <button
                type="button"
                onClick={() => setCoordinatesModal(null)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700"
              >
                Close
              </button>
            </div>
            <div className="h-[420px] overflow-hidden rounded-xl border border-slate-200">
              <iframe
                title="Pinned coordinates map"
                src={mapEmbedUrl}
                className="h-full w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      )}

      {rejectConfirmOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">Reject this order?</h3>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure to reject the order? This action updates the order status to REJECTED.
            </p>
            {rejectConfirmOrder.reason && (
              <p className="mt-2 text-sm text-slate-500">Reason: {rejectConfirmOrder.reason}</p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setRejectConfirmOrder(null)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  void updateStatus(
                    rejectConfirmOrder.id,
                    "REJECTED",
                    rejectConfirmOrder.reason || "",
                  );
                  setRejectConfirmOrder(null);
                }}
                className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Yes, reject
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
