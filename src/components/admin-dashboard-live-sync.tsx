"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AdminDashboardLiveSync() {
  const router = useRouter();

  useEffect(() => {
    const ordersStream = new EventSource("/api/orders/stream");
    const refresh = () => router.refresh();

    ordersStream.onmessage = refresh;
    ordersStream.onerror = () => ordersStream.close();

    return () => {
      ordersStream.close();
    };
  }, [router]);

  return null;
}
