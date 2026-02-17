"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type ProductPreferencesState = {
  favoriteIds: number[];
  wishlistIds: number[];
  toggleFavorite: (productId: number) => void;
  toggleWishlist: (productId: number) => void;
  isFavorite: (productId: number) => boolean;
  isWishlisted: (productId: number) => boolean;
};

export const useProductPreferencesStore = create<ProductPreferencesState>()(
  persist(
    (set, get) => ({
      favoriteIds: [],
      wishlistIds: [],
      toggleFavorite: (productId) =>
        set((state) => ({
          favoriteIds: state.favoriteIds.includes(productId)
            ? state.favoriteIds.filter((id) => id !== productId)
            : [...state.favoriteIds, productId],
        })),
      toggleWishlist: (productId) =>
        set((state) => ({
          wishlistIds: state.wishlistIds.includes(productId)
            ? state.wishlistIds.filter((id) => id !== productId)
            : [...state.wishlistIds, productId],
        })),
      isFavorite: (productId) => get().favoriteIds.includes(productId),
      isWishlisted: (productId) => get().wishlistIds.includes(productId),
    }),
    {
      name: "zagu-product-preferences-store",
      partialize: (state) => ({
        favoriteIds: state.favoriteIds,
        wishlistIds: state.wishlistIds,
      }),
    },
  ),
);
