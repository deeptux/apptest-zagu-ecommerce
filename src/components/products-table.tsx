"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiPath } from "@/lib/base-path";
import { ArrowDownAZ, ArrowUpDown, ArrowUpZA, Eye, EyeOff, Filter, Search, Trash2 } from "lucide-react";

type CategoryOption = {
  id: number;
  name: string;
};

type ProductRow = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  unit: string;
  price: number;
  stock: number;
  imageUrl: string | null;
  isVisible: boolean;
  categoryId: number | null;
  categoryName: string;
  updatedAt: string;
  tags: string[];
};

type ProductsTableProps = {
  products: ProductRow[];
  categories: CategoryOption[];
};

export function ProductsTable({ products, categories }: ProductsTableProps) {
  const router = useRouter();
  const [sortBy, setSortBy] = useState<"code" | "name" | "category" | "price" | "updatedAt">("updatedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [showVisibilityFilter, setShowVisibilityFilter] = useState(false);
  const [showUnitFilter, setShowUnitFilter] = useState(false);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [visibilityFilter, setVisibilityFilter] = useState<("VISIBLE" | "HIDDEN")[]>([
    "VISIBLE",
    "HIDDEN",
  ]);
  const [unitFilter, setUnitFilter] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [searchText, setSearchText] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductRow | null>(null);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editImageUrlValue, setEditImageUrlValue] = useState("");
  const [editFilePreviewUrl, setEditFilePreviewUrl] = useState<string | null>(null);
  const [editImageError, setEditImageError] = useState(false);

  const units = useMemo(() => [...new Set(products.map((item) => item.unit))], [products]);
  const categoryNames = useMemo(
    () => [...new Set(products.map((item) => item.categoryName))],
    [products],
  );

  useEffect(() => {
    if (!unitFilter.length && units.length) {
      setUnitFilter(units);
    }
  }, [units, unitFilter.length]);

  useEffect(() => {
    if (!categoryFilter.length && categoryNames.length) {
      setCategoryFilter(categoryNames);
    }
  }, [categoryNames, categoryFilter.length]);

  const filteredAndSorted = useMemo(() => {
    const filtered = products.filter((product) => {
      const visOk = product.isVisible
        ? visibilityFilter.includes("VISIBLE")
        : visibilityFilter.includes("HIDDEN");
      const categoryOk = categoryFilter.includes(product.categoryName);
      const unitOk = unitFilter.includes(product.unit);
      const query = searchText.trim().toLowerCase();
      const searchOk =
        !query ||
        product.code.toLowerCase().includes(query) ||
        product.name.toLowerCase().includes(query) ||
        product.categoryName.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query) ||
        product.tags.some((tag) => tag.toLowerCase().includes(query));
      return visOk && categoryOk && unitOk && searchOk;
    });

    filtered.sort((a, b) => {
      const modifier = sortDirection === "asc" ? 1 : -1;
      if (sortBy === "code") return a.code.localeCompare(b.code) * modifier;
      if (sortBy === "name") return a.name.localeCompare(b.name) * modifier;
      if (sortBy === "category") return a.categoryName.localeCompare(b.categoryName) * modifier;
      if (sortBy === "price") return (a.price - b.price) * modifier;
      return (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) * modifier;
    });

    return filtered;
  }, [products, visibilityFilter, categoryFilter, unitFilter, searchText, sortBy, sortDirection]);

  const toggleSort = (key: "code" | "name" | "category" | "price" | "updatedAt") => {
    if (sortBy === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(key);
    setSortDirection("asc");
  };

  const toggleVisibilityFilter = (value: "VISIBLE" | "HIDDEN") => {
    setVisibilityFilter((prev) => {
      if (prev.includes(value)) {
        if (prev.length === 1) return prev;
        return prev.filter((item) => item !== value);
      }
      return [...prev, value];
    });
  };

  const toggleUnitFilter = (unit: string) => {
    setUnitFilter((prev) => {
      if (prev.includes(unit)) {
        if (prev.length === 1) return prev;
        return prev.filter((item) => item !== unit);
      }
      return [...prev, unit];
    });
  };

  const toggleCategoryFilter = (category: string) => {
    setCategoryFilter((prev) => {
      if (prev.includes(category)) {
        if (prev.length === 1) return prev;
        return prev.filter((item) => item !== category);
      }
      return [...prev, category];
    });
  };

  useEffect(() => {
    const stream = new EventSource(apiPath("/products/stream"));
    stream.onmessage = () => router.refresh();
    stream.onerror = () => stream.close();
    return () => stream.close();
  }, [router]);

  useEffect(() => {
    return () => {
      if (editFilePreviewUrl) URL.revokeObjectURL(editFilePreviewUrl);
    };
  }, [editFilePreviewUrl]);

  useEffect(() => {
    if (!selectedProduct) {
      setEditImageUrlValue("");
      setEditImageError(false);
      if (editFilePreviewUrl) {
        URL.revokeObjectURL(editFilePreviewUrl);
        setEditFilePreviewUrl(null);
      }
      return;
    }

    setEditImageUrlValue(selectedProduct.imageUrl || "");
    setEditImageError(false);
    if (editFilePreviewUrl) {
      URL.revokeObjectURL(editFilePreviewUrl);
      setEditFilePreviewUrl(null);
    }
  }, [selectedProduct]);

  const toggleVisibility = async (product: ProductRow) => {
    try {
      setBusyId(product.id);
      await fetch(apiPath(`/products/${product.id}/visibility`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visible: !product.isVisible }),
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  };

  const deleteProduct = async (productId: number) => {
    try {
      setBusyId(productId);
      await fetch(apiPath(`/products/${productId}`), { method: "DELETE" });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  };

  const handleEditFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setEditImageError(false);

    if (!file) {
      if (editFilePreviewUrl) {
        URL.revokeObjectURL(editFilePreviewUrl);
      }
      setEditFilePreviewUrl(null);
      return;
    }

    if (editFilePreviewUrl) {
      URL.revokeObjectURL(editFilePreviewUrl);
    }
    setEditFilePreviewUrl(URL.createObjectURL(file));
  };

  const editPreviewSource = editImageError
    ? "/products/not-available.png"
    : editFilePreviewUrl || editImageUrlValue.trim() || "/products/not-available.png";

  const updateProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedProduct) return;
    setError("");
    setIsSaving(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch(apiPath(`/products/${selectedProduct.id}`), {
      method: "PATCH",
      body: formData,
    });

    if (!response.ok) {
      setError("Failed to update product. Check values and try again.");
      setIsSaving(false);
      return;
    }

    setSelectedProduct(null);
    setIsSaving(false);
    router.refresh();
  };

  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search code, name, category, description, or tags..."
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white max-[1085px]:overflow-x-auto overflow-hidden">
        <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
          <table className="w-full min-w-[1480px] table-fixed text-left">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 sm:text-xs">
              <tr>
                <th className="sticky top-0 z-10 min-w-[160px] w-[160px] bg-slate-50 px-3 py-3 sm:px-4">
                  <button onClick={() => toggleSort("code")} className="inline-flex items-center gap-1 font-semibold hover:text-slate-700">
                    Code
                    {sortBy === "code" ? (
                      sortDirection === "asc" ? <ArrowDownAZ className="h-3.5 w-3.5" /> : <ArrowUpZA className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
                    )}
                  </button>
                </th>
                <th className="sticky top-0 z-10 min-w-[100px] w-[100px] bg-slate-50 px-3 py-3 sm:px-4">
                  Actions
                </th>
                <th className="sticky top-0 z-10 min-w-[110px] w-[110px] bg-slate-50 px-3 py-3 sm:px-4">
                  Image
                </th>
                <th className="sticky top-0 z-10 min-w-[230px] w-[230px] bg-slate-50 px-3 py-3 sm:px-4">
                  <button onClick={() => toggleSort("name")} className="inline-flex items-center gap-1 font-semibold hover:text-slate-700">
                    Product Name
                    {sortBy === "name" ? (
                      sortDirection === "asc" ? <ArrowDownAZ className="h-3.5 w-3.5" /> : <ArrowUpZA className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
                    )}
                  </button>
                </th>
                <th className="sticky top-0 z-10 relative min-w-[170px] w-[170px] bg-slate-50 px-3 py-3 sm:px-4">
                  <button
                    onClick={() => setShowCategoryFilter((prev) => !prev)}
                    className="inline-flex items-center gap-1 font-semibold hover:text-slate-700"
                  >
                    Category
                    <Filter className="h-3.5 w-3.5" />
                  </button>
                  {showCategoryFilter && (
                    <div className="absolute left-0 top-10 z-20 w-44 rounded-lg border border-slate-200 bg-white p-2 text-[11px] shadow-lg">
                      {categoryNames.map((category) => (
                        <label key={category} className="flex items-center gap-2 px-1 py-1.5 text-slate-700">
                          <input
                            type="checkbox"
                            checked={categoryFilter.includes(category)}
                            onChange={() => toggleCategoryFilter(category)}
                          />
                          {category}
                        </label>
                      ))}
                    </div>
                  )}
                </th>
                <th className="sticky top-0 z-10 relative min-w-[120px] w-[120px] bg-slate-50 px-3 py-3 sm:px-4">
                  <button
                    onClick={() => setShowUnitFilter((prev) => !prev)}
                    className="inline-flex items-center gap-1 font-semibold hover:text-slate-700"
                  >
                    Unit
                    <Filter className="h-3.5 w-3.5" />
                  </button>
                  {showUnitFilter && (
                    <div className="absolute left-0 top-10 z-20 w-40 rounded-lg border border-slate-200 bg-white p-2 text-[11px] shadow-lg">
                      {units.map((unit) => (
                        <label key={unit} className="flex items-center gap-2 px-1 py-1.5 text-slate-700">
                          <input
                            type="checkbox"
                            checked={unitFilter.includes(unit)}
                            onChange={() => toggleUnitFilter(unit)}
                          />
                          {unit}
                        </label>
                      ))}
                    </div>
                  )}
                </th>
                <th className="sticky top-0 z-10 min-w-[150px] w-[150px] bg-slate-50 px-3 py-3 sm:px-4">
                  <button onClick={() => toggleSort("price")} className="inline-flex items-center gap-1 font-semibold hover:text-slate-700">
                    Price
                    <ArrowUpDown className="h-3.5 w-3.5 opacity-70" />
                  </button>
                </th>
                <th className="sticky top-0 z-10 min-w-[120px] w-[120px] bg-slate-50 px-3 py-3 sm:px-4">
                  Stock
                </th>
                <th className="sticky top-0 z-10 min-w-[110px] w-[110px] relative bg-slate-50 px-3 py-3 sm:px-4">
                  <button
                    onClick={() => setShowVisibilityFilter((prev) => !prev)}
                    className="inline-flex items-center gap-1 font-semibold hover:text-slate-700"
                  >
                    Visibility
                    <Filter className="h-3.5 w-3.5" />
                  </button>
                  {showVisibilityFilter && (
                    <div className="absolute left-0 top-10 z-20 w-40 rounded-lg border border-slate-200 bg-white p-2 text-[11px] shadow-lg">
                      <label className="flex items-center gap-2 px-1 py-1.5 text-slate-700">
                        <input
                          type="checkbox"
                          checked={visibilityFilter.includes("VISIBLE")}
                          onChange={() => toggleVisibilityFilter("VISIBLE")}
                        />
                        Visible
                      </label>
                      <label className="flex items-center gap-2 px-1 py-1.5 text-slate-700">
                        <input
                          type="checkbox"
                          checked={visibilityFilter.includes("HIDDEN")}
                          onChange={() => toggleVisibilityFilter("HIDDEN")}
                        />
                        Hidden
                      </label>
                    </div>
                  )}
                </th>
                <th className="sticky top-0 z-10 min-w-[170px] w-[170px] bg-slate-50 px-3 py-3 sm:px-4">
                  <button onClick={() => toggleSort("updatedAt")} className="inline-flex items-center gap-1 font-semibold hover:text-slate-700">
                    Updated
                    <ArrowUpDown className="h-3.5 w-3.5 opacity-70" />
                  </button>
                </th>
                <th className="sticky top-0 z-10 min-w-[150px] w-[150px] bg-slate-50 px-3 py-3 sm:px-4">
                  Tags
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSorted.map((product) => (
                <tr
                  key={product.id}
                  onClick={() => {
                    setError("");
                    setSelectedProduct(product);
                  }}
                  className="cursor-pointer border-t border-slate-100 text-[10px] hover:bg-slate-50 sm:text-xs md:text-sm"
                >
                  <td className="min-w-[160px] px-3 py-3 sm:px-4">
                    <span className="block truncate font-semibold text-slate-800">{product.code}</span>
                  </td>
                  <td className="min-w-[100px] px-3 py-3 sm:px-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          void toggleVisibility(product);
                        }}
                        disabled={busyId === product.id}
                        className="inline-flex items-center justify-center rounded-md bg-amber-500 p-1.5 text-white hover:bg-amber-600 disabled:opacity-60"
                        title={product.isVisible ? "Hide product" : "Show product"}
                        aria-label={product.isVisible ? "Hide product" : "Show product"}
                      >
                        {product.isVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          setDeleteTarget(product);
                        }}
                        disabled={busyId === product.id}
                        className="inline-flex items-center justify-center rounded-md bg-red-600 p-1.5 text-white hover:bg-red-700 disabled:opacity-60"
                        title="Delete product"
                        aria-label="Delete product"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="min-w-[110px] px-3 py-3 sm:px-4">
                    <div className="relative h-12 w-12 overflow-hidden rounded-md bg-slate-100">
                      <Image
                        src={product.imageUrl || "/products/not-available.png"}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  </td>
                  <td className="min-w-[230px] px-3 py-3 sm:px-4">
                    <span className="block truncate text-slate-800">{product.name}</span>
                  </td>
                  <td className="min-w-[170px] px-3 py-3 sm:px-4">
                    <span className="block truncate text-slate-700">{product.categoryName}</span>
                  </td>
                  <td className="min-w-[120px] px-3 py-3 sm:px-4">
                    <span className="block truncate text-slate-700">{product.unit}</span>
                  </td>
                  <td className="min-w-[150px] px-3 py-3 font-semibold text-slate-900 sm:px-4">
                    PHP {product.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="min-w-[120px] px-3 py-3 sm:px-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        product.stock > 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {product.stock}
                    </span>
                  </td>
                  <td className="min-w-[110px] px-3 py-3 sm:px-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        product.isVisible ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {product.isVisible ? "Visible" : "Hidden"}
                    </span>
                  </td>
                  <td className="min-w-[170px] px-3 py-3 text-slate-600 sm:px-4">
                    <span className="block whitespace-nowrap">{new Date(product.updatedAt).toLocaleString()}</span>
                  </td>
                  <td className="min-w-[150px] w-[150px] px-3 py-3 text-slate-600 sm:px-4">
                    <div className="group relative">
                      <span className="line-clamp-2 block break-words">{product.tags.join(", ") || "-"}</span>
                      {!!product.tags.length && (
                        <div className="pointer-events-none absolute bottom-full left-0 z-20 mb-1 hidden max-w-[260px] rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow-md group-hover:block">
                          {product.tags.join(", ")}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredAndSorted.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-6 text-center text-sm text-slate-500">
                    No products match the active filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Update Product</h3>
              <button
                onClick={() => {
                  setSelectedProduct(null);
                  setError("");
                }}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
              >
                x
              </button>
            </div>
            {error && (
              <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            <form onSubmit={(event) => void updateProduct(event)} className="mt-4 grid gap-4 xl:grid-cols-[1fr_2fr]">
              <div className="space-y-4">
                <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <h3 className="text-sm font-semibold text-slate-900">Upload Image</h3>
                  <div className="mt-3 space-y-3">
                    <div className="relative h-48 w-full overflow-hidden rounded-lg border border-slate-200 bg-white">
                      <img
                        src={editPreviewSource}
                        alt="Product preview"
                        className="h-full w-full object-cover"
                        onError={() => setEditImageError(true)}
                      />
                    </div>
                    <label className="space-y-1">
                      <span className="text-xs font-medium text-slate-600">Image URL (optional)</span>
                      <input
                        name="imageUrl"
                        value={editImageUrlValue}
                        onChange={(event) => {
                          setEditImageError(false);
                          setEditImageUrlValue(event.target.value);
                        }}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs font-medium text-slate-600">Upload File (optional)</span>
                      <input
                        name="imageFile"
                        type="file"
                        accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                        onChange={handleEditFileChange}
                      />
                    </label>
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <h3 className="text-sm font-semibold text-slate-900">Category</h3>
                  <label className="mt-3 block space-y-1">
                    <span className="text-xs font-medium text-slate-600">Product Category</span>
                    <select
                      name="categoryId"
                      defaultValue={selectedProduct.categoryId || ""}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="">Select category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </section>
              </div>

              <div className="space-y-4">
                <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <h3 className="text-sm font-semibold text-slate-900">General Information</h3>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <label className="space-y-1">
                      <span className="text-xs font-medium text-slate-600">Code</span>
                      <input
                        name="code"
                        defaultValue={selectedProduct.code}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                        required
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs font-medium text-slate-600">Unit</span>
                      <input
                        name="unit"
                        defaultValue={selectedProduct.unit}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                        required
                      />
                    </label>
                    <label className="space-y-1 md:col-span-2">
                      <span className="text-xs font-medium text-slate-600">Product Name</span>
                      <input
                        name="name"
                        defaultValue={selectedProduct.name}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                        required
                      />
                    </label>
                    <label className="space-y-1 md:col-span-2">
                      <span className="text-xs font-medium text-slate-600">Description</span>
                      <textarea
                        name="description"
                        defaultValue={selectedProduct.description || ""}
                        className="min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="space-y-1 md:col-span-2">
                      <span className="text-xs font-medium text-slate-600">Tags</span>
                      <input
                        name="tags"
                        defaultValue={selectedProduct.tags.join(", ")}
                        placeholder="comma separated: choco, milk, nutty"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                    </label>
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <h3 className="text-sm font-semibold text-slate-900">Pricing And Stock</h3>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <label className="space-y-1">
                      <span className="text-xs font-medium text-slate-600">Price</span>
                      <input
                        name="price"
                        type="number"
                        step="0.01"
                        min="0.01"
                        defaultValue={selectedProduct.price}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                        required
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs font-medium text-slate-600">Stock</span>
                      <input
                        name="stock"
                        type="number"
                        step="1"
                        min="0"
                        defaultValue={selectedProduct.stock}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                        required
                      />
                    </label>
                  </div>
                </section>
              </div>

              <div className="xl:col-span-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">Delete Product</h3>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to delete <span className="font-semibold text-slate-800">{deleteTarget.name}</span>?
            </p>
            <p className="mt-1 text-xs text-slate-500">This action cannot be undone.</p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const target = deleteTarget;
                  setDeleteTarget(null);
                  if (target) {
                    await deleteProduct(target.id);
                  }
                }}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
