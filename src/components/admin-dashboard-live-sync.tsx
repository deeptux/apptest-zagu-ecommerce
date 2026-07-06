"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiPath } from "@/lib/base-path";

export function AdminDashboardLiveSync() {
  const router = useRouter();

  useEffect(() => {
    const ordersStream = new EventSource(apiPath("/orders/stream"));
    const refresh = () => router.refresh();

    ordersStream.onmessage = refresh;
    ordersStream.onerror = () => ordersStream.close();

    return () => {
      ordersStream.close();
    };
  }, [router]);

  return null;
}
