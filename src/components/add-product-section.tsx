"use client";

import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useFormStatus } from "react-dom";
import { assetPath } from "@/lib/base-path";

type CategoryOption = {
  id: number;
  name: string;
};

type AddProductSectionProps = {
  categories: CategoryOption[];
  action: (formData: FormData) => void | Promise<void>;
};

const FALLBACK_IMAGE = "/products/not-available.png";

function AddProductSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-[#f4b133] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#e7a221] disabled:cursor-not-allowed disabled:opacity-70"
      aria-busy={pending}
    >
      {pending ? "Adding product..." : "Add Product"}
    </button>
  );
}

export function AddProductSection({ categories, action }: AddProductSectionProps) {
  const [collapsed, setCollapsed] = useState(true);
  const [imageUrlValue, setImageUrlValue] = useState("");
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    return () => {
      if (filePreviewUrl) {
        URL.revokeObjectURL(filePreviewUrl);
      }
    };
  }, [filePreviewUrl]);

  const previewSource = useMemo(() => {
    // Uploaded file must take priority over URL input.
    if (filePreviewUrl) return filePreviewUrl;
    const normalizedUrl = imageUrlValue.trim();
    if (normalizedUrl) return normalizedUrl;
    return FALLBACK_IMAGE;
  }, [filePreviewUrl, imageUrlValue]);

  const renderedPreviewSource = imageError ? FALLBACK_IMAGE : previewSource;

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setImageError(false);

    if (!file) {
      if (filePreviewUrl) {
        URL.revokeObjectURL(filePreviewUrl);
      }
      setFilePreviewUrl(null);
      return;
    }

    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setFilePreviewUrl(URL.createObjectURL(file));
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setCollapsed((prev) => !prev)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setCollapsed((prev) => !prev);
          }
        }}
        className="flex w-full cursor-pointer items-center text-left"
      >
        <h2 className="text-lg font-bold text-slate-900">Add New Product</h2>
        <span className="inline-flex ml-2 items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600">
          {collapsed ? (
            <>
              <ChevronRight className="h-3.5 w-3.5" />
              Expand
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              Collapse
            </>
          )}
        </span>
      </div>

      {!collapsed && (
        <form action={action} className="mt-4 grid gap-4 xl:grid-cols-[2fr_1fr]">
          <div className="space-y-4">
            <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <h3 className="text-sm font-semibold text-slate-900">General Information</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="space-y-1 md:col-span-1">
                  <span className="text-xs font-medium text-slate-600">Code</span>
                  <input
                    name="code"
                    placeholder="ZAGU-100"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    required
                  />
                </label>
                <label className="space-y-1 md:col-span-1">
                  <span className="text-xs font-medium text-slate-600">Unit</span>
                  <input
                    name="unit"
                    placeholder="Pack, Box"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    required
                  />
                </label>
                <label className="space-y-1 md:col-span-2">
                  <span className="text-xs font-medium text-slate-600">Product Name</span>
                  <input
                    name="name"
                    placeholder="Enter product name"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    required
                  />
                </label>
                <label className="space-y-1 md:col-span-2">
                  <span className="text-xs font-medium text-slate-600">Description</span>
                  <textarea
                    name="description"
                    placeholder="Add a short product description (optional)"
                    className="min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </label>
                <label className="space-y-1 md:col-span-2">
                  <span className="text-xs font-medium text-slate-600">Tags</span>
                  <input
                    name="tags"
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
                    min="1"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    required
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-slate-600">Stock</span>
                  <input
                    name="stock"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    required
                  />
                </label>
              </div>
            </section>
          </div>

          <div className="space-y-4">
            <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <h3 className="text-sm font-semibold text-slate-900">Upload Image</h3>
              <div className="mt-3 space-y-3">
                <div className="relative h-48 w-full overflow-hidden rounded-lg border border-slate-200 bg-white">
                  <img
                    src={assetPath(renderedPreviewSource)}
                    alt="Product preview"
                    className="h-full w-full object-cover"
                    onError={() => setImageError(true)}
                  />
                </div>

                <label className="space-y-1">
                  <span className="text-xs font-medium text-slate-600">Image URL (optional)</span>
                  <input
                    name="imageUrl"
                    placeholder="https://example.com/image.jpg"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    value={imageUrlValue}
                    onChange={(event) => {
                      setImageError(false);
                      setImageUrlValue(event.target.value);
                    }}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-slate-600">Upload File (optional)</span>
                  <input
                    name="imageFile"
                    type="file"
                    accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    onChange={handleFileChange}
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

          <div className="xl:col-span-2">
            <AddProductSubmitButton />
          </div>
        </form>
      )}
    </section>
  );
}
