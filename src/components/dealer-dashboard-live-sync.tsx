"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function DealerDashboardLiveSync() {
  const router = useRouter();

  useEffect(() => {
    const ordersStream = new EventSource("/api/orders/stream");
    const productsStream = new EventSource("/api/products/stream");

    const refresh = () => {
      router.refresh();
    };

    ordersStream.onmessage = refresh;
    productsStream.onmessage = refresh;

    ordersStream.onerror = () => {
      ordersStream.close();
    };
    productsStream.onerror = () => {
      productsStream.close();
    };

    return () => {
      ordersStream.close();
      productsStream.close();
    };
  }, [router]);

  return null;
}
