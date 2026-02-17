"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCartStore } from "@/store/cart-store";
import { useProductPreferencesStore } from "@/store/product-preferences-store";
import {
  Cog,
  Edit3,
  Heart,
  ListFilter,
  MapPin,
  PackageCheck,
  Package,
  Trash2,
  Search,
  ShoppingBag,
  ShoppingCart,
  Star,
  UtensilsCrossed,
  X,
} from "lucide-react";

type ProductItem = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  unit: string;
  imageUrl: string | null;
  category: string;
};

type OrderingClientProps = {
  products: ProductItem[];
  categories: string[];
  initialCartOpen?: boolean;
};

type AddressForm = {
  floorBlockLotStreet: string;
  subdivisionVillageDistrict: string;
  barangay: string;
  city: string;
  province: string;
  zipCode: string;
};

type Coordinates = { lat: number; lng: number };

type PaymentMethod = "" | "CARD" | "GCASH" | "QR_PH" | "BANK_TRANSFER" | "COD";

type PaymentForm = {
  cardHolderName: string;
  cardLast4: string;
  cardExpiry: string;
  gcashNumber: string;
  gcashAccountName: string;
  qrReference: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  codReceiverName: string;
  codContactNumber: string;
};

type SnackbarType = "info" | "success";

const paymentMethodLabel: Record<Exclude<PaymentMethod, "">, string> = {
  CARD: "Debit/Credit Card",
  GCASH: "GCash",
  QR_PH: "QR PH",
  BANK_TRANSFER: "Bank Transfer",
  COD: "Cash on Delivery",
};

type GoogleMapClickEvent = {
  latLng?: {
    lat: () => number;
    lng: () => number;
  };
};

type GoogleMapInstance = {
  addListener: (eventName: "click", listener: (event: GoogleMapClickEvent) => void) => void;
};

type GoogleMarkerInstance = {
  setMap: (map: GoogleMapInstance | null) => void;
};

type GoogleMapsApi = {
  maps: {
    Map: new (
      container: HTMLDivElement,
      options: { center: Coordinates; zoom: number },
    ) => GoogleMapInstance;
    Marker: new (options: { map: GoogleMapInstance; position: Coordinates }) => GoogleMarkerInstance;
  };
};

export function OrderingClient({
  products,
  categories,
  initialCartOpen = false,
}: OrderingClientProps) {
  const router = useRouter();
  const [catalogProducts, setCatalogProducts] = useState<ProductItem[]>(products);
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeProductId, setActiveProductId] = useState<number | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [addressEditMode, setAddressEditMode] = useState(false);
  const [paymentEditMode, setPaymentEditMode] = useState(false);
  const [addressForm, setAddressForm] = useState<AddressForm>({
    floorBlockLotStreet: "",
    subdivisionVillageDistrict: "",
    barangay: "",
    city: "",
    province: "",
    zipCode: "",
  });
  const [savedAddressLabel, setSavedAddressLabel] = useState("No delivery address saved.");
  const [savedCoordinatesLabel, setSavedCoordinatesLabel] = useState("No coordinates selected.");
  const [deliveryAddressSaved, setDeliveryAddressSaved] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>("");
  const [paymentSaved, setPaymentSaved] = useState(false);
  const [savedPaymentSummary, setSavedPaymentSummary] = useState("No payment method selected.");
  const [paymentForm, setPaymentForm] = useState<PaymentForm>({
    cardHolderName: "",
    cardLast4: "",
    cardExpiry: "",
    gcashNumber: "",
    gcashAccountName: "",
    qrReference: "",
    bankName: "",
    bankAccountName: "",
    bankAccountNumber: "",
    codReceiverName: "",
    codContactNumber: "",
  });
  const [shippingFeeInput, setShippingFeeInput] = useState("50");
  const [discountInput, setDiscountInput] = useState("30");
  const [selectedCoordinates, setSelectedCoordinates] = useState<Coordinates | null>(null);
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [tempCoordinates, setTempCoordinates] = useState<Coordinates | null>(null);
  const [mapError, setMapError] = useState("");
  const [viewportWidth, setViewportWidth] = useState<number | null>(null);
  const [cartReady, setCartReady] = useState(false);
  const [snackbar, setSnackbar] = useState<{ message: string; type: SnackbarType } | null>(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const cart = useCartStore((state) => state.items);
  const addCartItem = useCartStore((state) => state.addToCart);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const clearCart = useCartStore((state) => state.clearCart);
  const cartTotal = useCartStore((state) => state.totalAmount());
  const toggleFavorite = useProductPreferencesStore((state) => state.toggleFavorite);
  const toggleWishlist = useProductPreferencesStore((state) => state.toggleWishlist);
  const isFavorite = useProductPreferencesStore((state) => state.isFavorite);
  const isWishlisted = useProductPreferencesStore((state) => state.isWishlisted);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const markerRef = useRef<GoogleMarkerInstance | null>(null);
  const selectedCoordinatesRef = useRef<Coordinates | null>(null);
  const tempCoordinatesRef = useRef<Coordinates | null>(null);
  const snackbarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  useEffect(() => {
    setCatalogProducts(products);
  }, [products]);

  useEffect(() => {
    return () => {
      if (snackbarTimeoutRef.current) {
        clearTimeout(snackbarTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const stream = new EventSource("/api/products/stream");
    stream.onmessage = () => {
      router.refresh();
    };
    stream.onerror = () => {
      stream.close();
    };
    return () => stream.close();
  }, [router]);

  useEffect(() => {
    setCartReady(true);
  }, []);

  useEffect(() => {
    const updateViewport = () => setViewportWidth(window.innerWidth);
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    if (cart.length === 0) {
      setSummaryOpen(false);
      setCheckoutMode(false);
    }
  }, [cart.length]);

  useEffect(() => {
    if (initialCartOpen) {
      setSummaryOpen(true);
    }
  }, [initialCartOpen]);

  useEffect(() => {
    const handleOpenSummary = () => setSummaryOpen(true);
    window.addEventListener("zagu:open-order-summary", handleOpenSummary);
    return () => window.removeEventListener("zagu:open-order-summary", handleOpenSummary);
  }, []);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("zagu:order-summary-state", {
        detail: { open: summaryOpen },
      }),
    );
    if (!summaryOpen) {
      setCheckoutMode(false);
    }
  }, [summaryOpen]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (!target.closest("[data-product-tile]")) {
        setActiveProductId(null);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    selectedCoordinatesRef.current = selectedCoordinates;
  }, [selectedCoordinates]);

  useEffect(() => {
    tempCoordinatesRef.current = tempCoordinates;
  }, [tempCoordinates]);

  const getGoogleMapsApi = useCallback((): GoogleMapsApi | null => {
    if (typeof window === "undefined") return null;
    const withGoogle = window as Window & { google?: unknown };
    const googleValue = withGoogle.google;
    if (!googleValue || typeof googleValue !== "object") return null;
    const mapsValue = (googleValue as { maps?: unknown }).maps;
    if (!mapsValue || typeof mapsValue !== "object") return null;
    return googleValue as GoogleMapsApi;
  }, []);

  const visibleCart = cartReady ? cart : [];
  const visibleCartTotal = cartReady ? cartTotal : 0;
  const visibleItemCount = visibleCart.reduce((sum, line) => sum + line.quantity, 0);
  const parsedShippingFee = Number.parseFloat(shippingFeeInput);
  const parsedDiscount = Number.parseFloat(discountInput);
  const shippingFee = visibleCart.length > 0 && Number.isFinite(parsedShippingFee) && parsedShippingFee >= 0
    ? parsedShippingFee
    : 0;
  const taxAmount = visibleCartTotal * 0.12;
  const discount = visibleCart.length > 0 && Number.isFinite(parsedDiscount) && parsedDiscount >= 0
    ? parsedDiscount
    : 0;
  const checkoutTotal = Math.max(0, visibleCartTotal + shippingFee + taxAmount - discount);
  const showHeadingCategoryButton = viewportWidth !== null && viewportWidth < 1280 && viewportWidth >= 400;
  const showFloatingCategoryButton = viewportWidth !== null && viewportWidth < 400;

  const getCategoryIcon = (category: string) => {
    const normalized = category.toLowerCase();
    if (normalized.includes("food") || normalized.includes("beverage")) return UtensilsCrossed;
    if (normalized.includes("merch")) return ShoppingBag;
    if (normalized.includes("pack")) return PackageCheck;
    if (normalized.includes("spare")) return Cog;
    if (normalized.includes("store") || normalized.includes("equipment")) return Package;
    return Package;
  };

  const filteredProducts = useMemo(() => {
    return catalogProducts.filter((product) => {
      const categoryMatch = activeCategory === "All" || product.category === activeCategory;
      const term = search.toLowerCase();
      const searchMatch =
        product.name.toLowerCase().includes(term) ||
        product.code.toLowerCase().includes(term) ||
        product.description?.toLowerCase().includes(term);
      return categoryMatch && searchMatch;
    });
  }, [activeCategory, catalogProducts, search]);

  const formatCoordinates = (coords: Coordinates) =>
    `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;

  const showSnackbar = useCallback((message: string, type: SnackbarType) => {
    if (snackbarTimeoutRef.current) {
      clearTimeout(snackbarTimeoutRef.current);
    }
    setSnackbar({ message, type });
    snackbarTimeoutRef.current = setTimeout(() => {
      setSnackbar(null);
      snackbarTimeoutRef.current = null;
    }, 10000);
  }, []);

  const loadGoogleMapsScript = useCallback(
    () =>
      new Promise<void>((resolve, reject) => {
        if (typeof window === "undefined") {
          reject(new Error("Window is not available."));
          return;
        }

        if (getGoogleMapsApi()) {
          resolve();
          return;
        }

        const scriptId = "google-maps-js";
        const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
        if (existing) {
          existing.addEventListener("load", () => resolve(), { once: true });
          existing.addEventListener("error", () => reject(new Error("Failed to load Google Maps.")), {
            once: true,
          });
          return;
        }

        const script = document.createElement("script");
        script.id = scriptId;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsKey}`;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load Google Maps."));
        document.head.appendChild(script);
      }),
    [getGoogleMapsApi, googleMapsKey],
  );

  useEffect(() => {
    if (!mapModalOpen) return;

    let cancelled = false;
    const initialize = async () => {
      setMapError("");
      if (!googleMapsKey) {
        setMapError("Google Maps API key is missing. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.");
        return;
      }

      try {
        await loadGoogleMapsScript();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to load Google Maps right now.";
        setMapError(message);
        return;
      }

      const mapsApi = getGoogleMapsApi();
      if (cancelled || !mapContainerRef.current || !mapsApi) return;
      const fallbackCenter = { lat: 14.5995, lng: 120.9842 };
      const center = tempCoordinatesRef.current || selectedCoordinatesRef.current || fallbackCenter;
      const map = new mapsApi.maps.Map(mapContainerRef.current, {
        center,
        zoom: 14,
      });
      const pin = tempCoordinatesRef.current || selectedCoordinatesRef.current;
      if (pin) {
        markerRef.current = new mapsApi.maps.Marker({
          map,
          position: pin,
        });
      } else {
        markerRef.current = null;
      }

      map.addListener("click", (event) => {
        const lat = event.latLng?.lat();
        const lng = event.latLng?.lng();
        if (typeof lat !== "number" || typeof lng !== "number") return;

        const nextPin = { lat, lng };
        setTempCoordinates(nextPin);
        if (markerRef.current) markerRef.current.setMap(null);
        markerRef.current = new mapsApi.maps.Marker({
          map,
          position: nextPin,
        });
      });
    };

    void initialize();
    return () => {
      cancelled = true;
    };
  }, [getGoogleMapsApi, googleMapsKey, loadGoogleMapsScript, mapModalOpen]);

  const addToCart = (product: ProductItem) => {
    setError("");
    setSuccess("");
    const currentQty = cart.find((line) => line.productId === product.id)?.quantity ?? 0;
    if (product.stock <= 0) {
      setError(`${product.name} is out of stock.`);
      return;
    }
    if (currentQty >= product.stock) {
      setError(`Only ${product.stock} stock available for ${product.name}.`);
      return;
    }
    addCartItem({
      productId: product.id,
      code: product.code,
      name: product.name,
      imageUrl: product.imageUrl,
      unit: product.unit,
      price: product.price,
    });
    setActiveProductId(null);
    showSnackbar(`${product.name} added to cart`, "info");
  };

  const updateQty = (productId: number, nextQty: number) => {
    const product = catalogProducts.find((item) => item.id === productId);
    if (product && nextQty > product.stock) {
      setError(`Only ${product.stock} stock available for ${product.name}.`);
      return;
    }
    updateQuantity(productId, nextQty);
  };

  const submitOrder = async () => {
    if (!cart.length) {
      setError("Add at least one product before submitting.");
      return;
    }
    if (!deliveryAddressSaved) {
      setSuccess("");
      setError("Please complete the delivery address.");
      return;
    }
    if (!paymentSaved) {
      setSuccess("");
      setError("Please select a payment method.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      setSuccess("");
      const itemsToSubmit = cart.map((line) => ({ productId: line.productId, quantity: line.quantity }));

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          remarks,
          items: itemsToSubmit,
          checkoutDetails: {
            deliveryAddress: savedAddressLabel,
            deliveryCoordinates:
              savedCoordinatesLabel === "No coordinates selected." ? "" : savedCoordinatesLabel,
            paymentMethod:
              selectedPaymentMethod && paymentMethodLabel[selectedPaymentMethod]
                ? paymentMethodLabel[selectedPaymentMethod]
                : "",
            paymentDetails: savedPaymentSummary,
            shippingFee,
            taxAmount,
            discountAmount: discount,
            grandTotal: checkoutTotal,
          },
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error || "Failed to submit order.");
        return;
      }

      setSuccess("");
      setCatalogProducts((prev) =>
        prev.map((product) => {
          const line = itemsToSubmit.find((item) => item.productId === product.id);
          if (!line) return product;
          return { ...product, stock: Math.max(0, product.stock - line.quantity) };
        }),
      );
      showSnackbar("Order has been done successfully.", "success");
      clearCart();
      setRemarks("");
      router.refresh();
    } catch {
      setError("Unable to submit order right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddressFieldChange = (field: keyof AddressForm, value: string) => {
    setAddressForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePaymentFieldChange = (field: keyof PaymentForm, value: string) => {
    setPaymentForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveDeliveryAddress = () => {
    const fields = [
      addressForm.floorBlockLotStreet.trim(),
      addressForm.subdivisionVillageDistrict.trim(),
      addressForm.barangay.trim(),
      addressForm.city.trim(),
      addressForm.province.trim(),
      addressForm.zipCode.trim(),
    ];
    const isCompleteAddress = fields.every(Boolean);
    if (!isCompleteAddress) {
      setSuccess("");
      setError("Please complete the delivery address.");
      return;
    }
    const merged = fields.join(", ");

    setSavedAddressLabel(merged);
    setSavedCoordinatesLabel(
      selectedCoordinates ? formatCoordinates(selectedCoordinates) : "No coordinates selected.",
    );
    setDeliveryAddressSaved(true);
    setAddressEditMode(false);
    setError("");
    setSuccess("Delivery address saved.");
  };

  const handleClearDeliveryAddress = () => {
    setAddressForm({
      floorBlockLotStreet: "",
      subdivisionVillageDistrict: "",
      barangay: "",
      city: "",
      province: "",
      zipCode: "",
    });
    setSelectedCoordinates(null);
    setTempCoordinates(null);
    setSavedAddressLabel("No delivery address saved.");
    setSavedCoordinatesLabel("No coordinates selected.");
    setDeliveryAddressSaved(false);
    setAddressEditMode(false);
    setError("");
    setSuccess("");
  };

  const handleSavePaymentMethod = () => {
    if (!selectedPaymentMethod) {
      setSuccess("");
      setError("Please select a payment method.");
      return;
    }

    const trimmed = {
      cardHolderName: paymentForm.cardHolderName.trim(),
      cardLast4: paymentForm.cardLast4.trim(),
      cardExpiry: paymentForm.cardExpiry.trim(),
      gcashNumber: paymentForm.gcashNumber.trim(),
      gcashAccountName: paymentForm.gcashAccountName.trim(),
      qrReference: paymentForm.qrReference.trim(),
      bankName: paymentForm.bankName.trim(),
      bankAccountName: paymentForm.bankAccountName.trim(),
      bankAccountNumber: paymentForm.bankAccountNumber.trim(),
      codReceiverName: paymentForm.codReceiverName.trim(),
      codContactNumber: paymentForm.codContactNumber.trim(),
    };

    let summary = "";
    if (selectedPaymentMethod === "CARD") {
      if (!trimmed.cardHolderName || !trimmed.cardLast4 || !trimmed.cardExpiry) {
        setSuccess("");
        setError("Please select a payment method.");
        return;
      }
      summary = `${paymentMethodLabel.CARD} - ${trimmed.cardHolderName} (****${trimmed.cardLast4})`;
    }
    if (selectedPaymentMethod === "GCASH") {
      if (!trimmed.gcashNumber || !trimmed.gcashAccountName) {
        setSuccess("");
        setError("Please select a payment method.");
        return;
      }
      summary = `${paymentMethodLabel.GCASH} - ${trimmed.gcashAccountName} (${trimmed.gcashNumber})`;
    }
    if (selectedPaymentMethod === "QR_PH") {
      if (!trimmed.qrReference) {
        setSuccess("");
        setError("Please select a payment method.");
        return;
      }
      summary = `${paymentMethodLabel.QR_PH} - Ref: ${trimmed.qrReference}`;
    }
    if (selectedPaymentMethod === "BANK_TRANSFER") {
      if (!trimmed.bankName || !trimmed.bankAccountName || !trimmed.bankAccountNumber) {
        setSuccess("");
        setError("Please select a payment method.");
        return;
      }
      summary = `${paymentMethodLabel.BANK_TRANSFER} - ${trimmed.bankName} (${trimmed.bankAccountNumber})`;
    }
    if (selectedPaymentMethod === "COD") {
      if (!trimmed.codReceiverName || !trimmed.codContactNumber) {
        setSuccess("");
        setError("Please select a payment method.");
        return;
      }
      summary = `${paymentMethodLabel.COD} - ${trimmed.codReceiverName} (${trimmed.codContactNumber})`;
    }

    setSavedPaymentSummary(summary || "No payment method selected.");
    setPaymentSaved(true);
    setPaymentEditMode(false);
    setError("");
    setSuccess("Payment method saved.");
  };

  const handleClearPaymentMethod = () => {
    setSelectedPaymentMethod("");
    setPaymentForm({
      cardHolderName: "",
      cardLast4: "",
      cardExpiry: "",
      gcashNumber: "",
      gcashAccountName: "",
      qrReference: "",
      bankName: "",
      bankAccountName: "",
      bankAccountNumber: "",
      codReceiverName: "",
      codContactNumber: "",
    });
    setSavedPaymentSummary("No payment method selected.");
    setPaymentSaved(false);
    setPaymentEditMode(false);
    setError("");
    setSuccess("");
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[230px_1fr]">
      {snackbar && (
        <div className="xl:col-span-2">
          <div
            className={`rounded-xl border px-4 py-2 text-sm font-semibold shadow-sm ${
              snackbar.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-slate-50 text-slate-700"
            }`}
          >
            {snackbar.message}
          </div>
        </div>
      )}
      <aside className="hidden rounded-2xl border border-slate-200 bg-white p-4 xl:block">

        <p className="mb-3 text-xs font-semibold uppercase text-slate-500">Product Categories</p>
        <div className="max-h-[560px] space-y-2 overflow-auto pr-1">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`w-full rounded-xl border px-3 py-2 text-left text-sm font-semibold transition ${activeCategory === category
                  ? "border-[#f4b133] bg-[#fff6e4] text-[#cc8d18]"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
            >
              {category}
            </button>
          ))}
        </div>
      </aside>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-3xl font-black tracking-tight text-slate-800">Product Catalog</h2>
          {showHeadingCategoryButton && (
            <button
              type="button"
              onClick={() => setCategoriesOpen(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ListFilter className="h-4 w-4" />
              Categories
            </button>
          )}
        </div>
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by Item or Name"
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none ring-[#f4b133] focus:ring-2"
          />
        </div>
        <div className="max-h-[calc(100vh-270px)] overflow-auto">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredProducts.map((product) => {
              const favorite = isFavorite(product.id);
              const wishlisted = isWishlisted(product.id);
              const active = activeProductId === product.id;
              return (
                <article
                  key={product.id}
                  onClick={() => setActiveProductId((prev) => (prev === product.id ? null : product.id))}
                  data-product-tile="true"
                  className="relative min-w-0 cursor-pointer overflow-visible rounded-xl border border-slate-200 bg-white p-2 shadow-sm transition hover:shadow-md"
                >
                  <div className="h-36 w-full overflow-hidden rounded-lg bg-slate-100">
                    <Image
                      src={product.imageUrl || "/products/not-available.png"}
                      alt={product.name}
                      width={400}
                      height={220}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="px-1 pb-1 pt-2">
                    <p className="truncate text-xs font-semibold text-slate-700">{product.code}</p>
                    <p className="line-clamp-1 text-sm font-semibold text-slate-800">{product.name}</p>
                    <p className="text-xs text-slate-500">PHP {product.price.toFixed(2)}</p>
                    <p className="text-xs text-slate-500">Units: {product.unit}</p>
                    <p
                      className={`mt-1 text-[11px] font-semibold ${product.stock > 0 ? "text-emerald-700" : "text-rose-600"
                        }`}
                    >
                      {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
                    </p>
                  </div>

                  {active && (
                    <div className="absolute left-1/2 top-[132px] z-30 w-[230px] -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            addToCart(product);
                          }}
                          disabled={product.stock <= 0}
                          className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#f4b133] px-2 py-2 text-xs font-semibold text-white hover:bg-[#e7a221] disabled:bg-slate-300"
                        >
                          <ShoppingCart className="h-3.5 w-3.5" />
                          Add to Cart
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleFavorite(product.id);
                            setActiveProductId(null);
                          }}
                          className={`inline-flex items-center justify-center rounded-lg border p-2 ${favorite ? "border-rose-300 bg-rose-50 text-rose-600" : "border-slate-300 text-slate-500"
                            }`}
                          title={favorite ? "Remove from favorites" : "Add to favorites"}
                        >
                          <Heart className={`h-4 w-4 ${favorite ? "fill-current" : ""}`} />
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleWishlist(product.id);
                            setActiveProductId(null);
                          }}
                          className={`inline-flex items-center justify-center rounded-lg border p-2 ${wishlisted
                              ? "border-amber-300 bg-amber-50 text-amber-600"
                              : "border-slate-300 text-slate-500"
                            }`}
                          title={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
                        >
                          <Star className={`h-4 w-4 ${wishlisted ? "fill-current" : ""}`} />
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <button
        type="button"
        onClick={() =>
          setSummaryOpen((prev) => {
            const next = !prev;
            if (!next) setCheckoutMode(false);
            return next;
          })
        }
        className="fixed bottom-16 right-3 z-30 rounded-full border border-slate-300 bg-white p-3 text-slate-700 shadow-lg hover:bg-slate-50"
        title={summaryOpen ? "Hide order summary" : "Show order summary"}
      >
        <ShoppingCart className="h-4 w-4" />
        {visibleItemCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {visibleItemCount}
          </span>
        )}
      </button>

      <aside
        className={`fixed bottom-4 right-0 top-20 z-20 overflow-y-auto rounded-l-2xl border border-r-0 border-slate-200 bg-white p-3 sm:p-4 shadow-xl transition-all duration-300 ${checkoutMode ? "w-[780px] max-w-[96vw]" : "w-[320px]"
          } ${summaryOpen ? "translate-x-0" : "translate-x-full"
          }`}
      >
        {!checkoutMode ? (
          <>
            <h2 className="text-lg font-bold text-slate-900">Cart</h2>
            <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
              {visibleCart.length} item(s)
            </div>
            <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
              PHP {visibleCartTotal.toFixed(2)}
            </div>
            <div className="max-h-[360px] space-y-3 overflow-auto pr-1">
              {visibleCart.length === 0 && <p className="text-sm text-slate-500">No items yet.</p>}
              {visibleCart.map((line) => (
                <div key={line.productId} className="rounded-xl bg-slate-50 p-3">
                  <div className="flex items-start gap-2">
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-slate-200">
                      <Image
                        src={line.imageUrl || "/products/not-available.png"}
                        alt={line.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">{line.name}</p>
                      <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                        <span>{line.unit}</span>
                        <span>PHP {line.price.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => updateQty(line.productId, line.quantity - 1)}
                      className="rounded border border-slate-200 px-2 py-1 text-xs"
                    >
                      -
                    </button>
                    <span className="text-sm font-semibold">{line.quantity}</span>
                    <button
                      onClick={() => updateQty(line.productId, line.quantity + 1)}
                      className="rounded border border-slate-200 px-2 py-1 text-xs"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <textarea
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              className="mt-4 h-20 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none ring-[#f4b133] focus:ring-2"
              placeholder="Remarks (optional)"
            />

            <div className="mt-4 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Total</span>
                <span className="font-bold text-slate-900">
                  PHP {visibleCartTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            {success && <p className="mt-3 text-sm text-green-600">{success}</p>}

            <button
              onClick={() => setCheckoutMode(true)}
              disabled={visibleCart.length === 0}
              className="mt-4 w-full rounded-xl bg-[#f4b133] px-4 py-3 text-sm font-semibold text-white hover:bg-[#e7a221] disabled:opacity-70"
            >
              Proceed Checkout
            </button>
          </>
        ) : (
          <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr]">
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="text-lg font-bold text-slate-900 sm:text-xl lg:text-2xl">Items Ordered</h3>
              <div className="mt-4 max-h-[38vh] space-y-3 overflow-auto pr-1 sm:max-h-[46vh] lg:max-h-[520px]">
                {visibleCart.map((line) => (
                  <div key={line.productId} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-slate-200">
                        <Image
                          src={line.imageUrl || "/products/not-available.png"}
                          alt={line.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800 sm:text-base">{line.name}</p>
                        <p className="text-xs text-slate-500 sm:text-sm">
                          UOM: {line.unit} / PHP {line.price.toFixed(2)}
                        </p>
                      </div>
                      <p className="text-xs font-semibold text-slate-600 sm:text-sm">x {line.quantity}</p>
                      <p className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 sm:text-sm">
                        PHP {(line.price * line.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-lg font-bold text-slate-900 sm:text-xl lg:text-2xl">Order Details</h4>
                  {!addressEditMode && (
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAddressEditMode(true);
                          setError("");
                          setSuccess("");
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                        title="Edit delivery address"
                        aria-label="Edit delivery address"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleClearDeliveryAddress}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                        title="Clear delivery address"
                        aria-label="Clear delivery address"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-700">Delivery Address</p>

                {!addressEditMode ? (
                  <div className="mt-2 space-y-2">
                    <p className="text-sm text-slate-600">{savedAddressLabel}</p>
                    <p className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                      <MapPin className="h-3.5 w-3.5" />
                      {savedCoordinatesLabel}
                    </p>
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    <input
                      value={addressForm.floorBlockLotStreet}
                      onChange={(event) =>
                        handleAddressFieldChange("floorBlockLotStreet", event.target.value)
                      }
                      placeholder="Floor, block, lot and street"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-[#f4b133] focus:outline-none"
                    />
                    <input
                      value={addressForm.subdivisionVillageDistrict}
                      onChange={(event) =>
                        handleAddressFieldChange("subdivisionVillageDistrict", event.target.value)
                      }
                      placeholder="Subdivision, village, district"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-[#f4b133] focus:outline-none"
                    />
                    <input
                      value={addressForm.barangay}
                      onChange={(event) => handleAddressFieldChange("barangay", event.target.value)}
                      placeholder="Barangay"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-[#f4b133] focus:outline-none"
                    />
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <input
                        value={addressForm.city}
                        onChange={(event) => handleAddressFieldChange("city", event.target.value)}
                        placeholder="City"
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-[#f4b133] focus:outline-none"
                      />
                      <input
                        value={addressForm.province}
                        onChange={(event) => handleAddressFieldChange("province", event.target.value)}
                        placeholder="Province"
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-[#f4b133] focus:outline-none"
                      />
                    </div>
                    <input
                      value={addressForm.zipCode}
                      onChange={(event) => handleAddressFieldChange("zipCode", event.target.value)}
                      placeholder="Zip code"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-[#f4b133] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setTempCoordinates(selectedCoordinates);
                        setMapModalOpen(true);
                      }}
                      className="flex w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <span className="truncate text-left">
                        Coordinates:{" "}
                        {selectedCoordinates ? formatCoordinates(selectedCoordinates) : "Click to pin on map"}
                      </span>
                      <MapPin className="h-4 w-4 shrink-0" />
                    </button>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={handleSaveDeliveryAddress}
                        className="w-full rounded-xl bg-[#f4b133] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e7a221]"
                      >
                        Save Delivery Address
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddressEditMode(false)}
                        className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                <div className="mt-3">
                  <p className="mb-1 text-sm font-semibold text-slate-700">Remarks (optional)</p>
                  <textarea
                    value={remarks}
                    onChange={(event) => setRemarks(event.target.value)}
                    className="h-20 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none ring-[#f4b133] focus:ring-2"
                    placeholder="Remarks (optional)"
                  />
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-lg font-bold text-slate-900 sm:text-xl lg:text-2xl">Payment Method</h4>
                  {!paymentEditMode && (
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentEditMode(true);
                          setError("");
                          setSuccess("");
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                        title="Edit payment method"
                        aria-label="Edit payment method"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleClearPaymentMethod}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                        title="Clear payment method"
                        aria-label="Clear payment method"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                {!paymentEditMode ? (
                  <p className="mt-3 text-sm text-slate-500">{savedPaymentSummary}</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    <select
                      value={selectedPaymentMethod}
                      onChange={(event) => setSelectedPaymentMethod(event.target.value as PaymentMethod)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-[#f4b133] focus:outline-none"
                    >
                      <option value="">Select payment method</option>
                      <option value="CARD">Debit/Credit Card</option>
                      <option value="GCASH">GCash</option>
                      <option value="QR_PH">QR PH</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="COD">Cash on Delivery</option>
                    </select>

                    {selectedPaymentMethod === "CARD" && (
                      <div className="space-y-2">
                        <input
                          value={paymentForm.cardHolderName}
                          onChange={(event) => handlePaymentFieldChange("cardHolderName", event.target.value)}
                          placeholder="Card holder name"
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-[#f4b133] focus:outline-none"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            value={paymentForm.cardLast4}
                            onChange={(event) => handlePaymentFieldChange("cardLast4", event.target.value)}
                            placeholder="Last 4 digits"
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-[#f4b133] focus:outline-none"
                          />
                          <input
                            value={paymentForm.cardExpiry}
                            onChange={(event) => handlePaymentFieldChange("cardExpiry", event.target.value)}
                            placeholder="Expiry (MM/YY)"
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-[#f4b133] focus:outline-none"
                          />
                        </div>
                      </div>
                    )}

                    {selectedPaymentMethod === "GCASH" && (
                      <div className="space-y-2">
                        <input
                          value={paymentForm.gcashAccountName}
                          onChange={(event) =>
                            handlePaymentFieldChange("gcashAccountName", event.target.value)
                          }
                          placeholder="GCash account name"
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-[#f4b133] focus:outline-none"
                        />
                        <input
                          value={paymentForm.gcashNumber}
                          onChange={(event) => handlePaymentFieldChange("gcashNumber", event.target.value)}
                          placeholder="GCash number"
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-[#f4b133] focus:outline-none"
                        />
                      </div>
                    )}

                    {selectedPaymentMethod === "QR_PH" && (
                      <input
                        value={paymentForm.qrReference}
                        onChange={(event) => handlePaymentFieldChange("qrReference", event.target.value)}
                        placeholder="QR PH reference number"
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-[#f4b133] focus:outline-none"
                      />
                    )}

                    {selectedPaymentMethod === "BANK_TRANSFER" && (
                      <div className="space-y-2">
                        <input
                          value={paymentForm.bankName}
                          onChange={(event) => handlePaymentFieldChange("bankName", event.target.value)}
                          placeholder="Bank name"
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-[#f4b133] focus:outline-none"
                        />
                        <input
                          value={paymentForm.bankAccountName}
                          onChange={(event) =>
                            handlePaymentFieldChange("bankAccountName", event.target.value)
                          }
                          placeholder="Account name"
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-[#f4b133] focus:outline-none"
                        />
                        <input
                          value={paymentForm.bankAccountNumber}
                          onChange={(event) =>
                            handlePaymentFieldChange("bankAccountNumber", event.target.value)
                          }
                          placeholder="Account number"
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-[#f4b133] focus:outline-none"
                        />
                      </div>
                    )}

                    {selectedPaymentMethod === "COD" && (
                      <div className="space-y-2">
                        <input
                          value={paymentForm.codReceiverName}
                          onChange={(event) =>
                            handlePaymentFieldChange("codReceiverName", event.target.value)
                          }
                          placeholder="Receiver full name"
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-[#f4b133] focus:outline-none"
                        />
                        <input
                          value={paymentForm.codContactNumber}
                          onChange={(event) =>
                            handlePaymentFieldChange("codContactNumber", event.target.value)
                          }
                          placeholder="Receiver contact number"
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-[#f4b133] focus:outline-none"
                        />
                      </div>
                    )}
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={handleSavePaymentMethod}
                        className="w-full rounded-xl bg-[#f4b133] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e7a221]"
                      >
                        Save Payment Method
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentEditMode(false)}
                        className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h4 className="text-lg font-bold text-slate-900 sm:text-xl lg:text-2xl">Order Total</h4>
                <div className="mt-3 space-y-1 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span>PHP {visibleCartTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Tax (12%)</span>
                    <span>PHP {taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Discount (-)</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={discountInput}
                      onChange={(event) => setDiscountInput(event.target.value)}
                      className="w-28 rounded-lg border border-slate-300 px-2 py-1 text-right text-sm text-slate-700 focus:border-[#f4b133] focus:outline-none"
                    />
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Shipping Fee</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={shippingFeeInput}
                      onChange={(event) => setShippingFeeInput(event.target.value)}
                      className="w-28 rounded-lg border border-slate-300 px-2 py-1 text-right text-sm text-slate-700 focus:border-[#f4b133] focus:outline-none"
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-lg font-bold text-slate-900">
                    <span>Total Amount</span>
                    <span>PHP {checkoutTotal.toFixed(2)}</span>
                  </div>
                </div>
                {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
                {success && <p className="mt-3 text-sm text-green-600">{success}</p>}
                <div className="mt-4 grid gap-2">
                  <button
                    onClick={submitOrder}
                    disabled={isSubmitting || visibleCart.length === 0}
                    className="w-full rounded-xl bg-[#f4b133] px-4 py-3 text-sm font-semibold text-white hover:bg-[#e7a221] disabled:opacity-70"
                  >
                    {isSubmitting ? "Submitting..." : "Confirm Order"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCheckoutMode(false)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Back to Cart
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}
      </aside>

      {showFloatingCategoryButton && (
        <button
          type="button"
          onClick={() => setCategoriesOpen((prev) => !prev)}
          className="fixed bottom-32 right-3 z-30 rounded-full border border-slate-300 bg-white p-3 text-slate-700 shadow-lg hover:bg-slate-50"
          title={categoriesOpen ? "Hide categories" : "Show categories"}
        >
          <ListFilter className="h-4 w-4" />
        </button>
      )}

      {categoriesOpen && (
        <>
          <div className="fixed inset-0 z-30 bg-black/30" onClick={() => setCategoriesOpen(false)} />
          <aside className="fixed bottom-4 left-3 top-20 z-40 w-[260px] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase text-slate-500">Product Categories</p>
              <button
                type="button"
                onClick={() => setCategoriesOpen(false)}
                className="rounded-md border border-slate-200 p-1 text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[calc(100%-20px)] space-y-2 overflow-auto pr-1">
              {categories.map((category) => (
                (() => {
                  const CategoryIcon = getCategoryIcon(category);
                  return (
                    <button
                      key={category}
                      onClick={() => {
                        setActiveCategory(category);
                        setCategoriesOpen(false);
                      }}
                      className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-semibold transition ${activeCategory === category
                          ? "border-[#f4b133] bg-[#fff6e4] text-[#cc8d18]"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                    >
                      <CategoryIcon className="h-4 w-4" />
                      <span className="truncate">{category}</span>
                    </button>
                  );
                })()
              ))}
            </div>
          </aside>
        </>
      )}
      {mapModalOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setMapModalOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-5xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold text-slate-900">Pin Delivery Coordinates</p>
                  <p className="text-xs text-slate-500">
                    Left-click on the map to place a pin, then confirm.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMapModalOpen(false)}
                  className="rounded-md border border-slate-300 p-1 text-slate-600 hover:bg-slate-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {mapError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {mapError}
                </div>
              ) : (
                <div ref={mapContainerRef} className="h-[460px] w-full rounded-xl border border-slate-200" />
              )}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-slate-600">
                  Selected pin:{" "}
                  <span className="font-semibold text-slate-800">
                    {tempCoordinates ? formatCoordinates(tempCoordinates) : "None"}
                  </span>
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (!tempCoordinates) return;
                    setSelectedCoordinates(tempCoordinates);
                    setMapModalOpen(false);
                  }}
                  disabled={!tempCoordinates}
                  className="rounded-xl bg-[#f4b133] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e7a221] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Confirm Pin
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
