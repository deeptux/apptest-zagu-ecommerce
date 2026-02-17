"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  productId: number;
  code: string;
  name: string;
  imageUrl?: string | null;
  unit: string;
  price: number;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, "quantity">) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  removeItem: (productId: number) => void;
  clearCart: () => void;
  itemCount: () => number;
  totalAmount: () => number;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addToCart: (item) => {
        set((state) => {
          const existing = state.items.find((current) => current.productId === item.productId);
          if (!existing) {
            return { items: [...state.items, { ...item, quantity: 1 }] };
          }
          return {
            items: state.items.map((current) =>
              current.productId === item.productId
                ? { ...current, quantity: current.quantity + 1 }
                : current,
            ),
          };
        });
      },
      updateQuantity: (productId, quantity) => {
        set((state) => ({
          items: state.items
            .map((current) => (current.productId === productId ? { ...current, quantity } : current))
            .filter((current) => current.quantity > 0),
        }));
      },
      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((current) => current.productId !== productId),
        }));
      },
      clearCart: () => set({ items: [] }),
      itemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
      totalAmount: () => get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    }),
    {
      name: "zagu-cart-store",
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
