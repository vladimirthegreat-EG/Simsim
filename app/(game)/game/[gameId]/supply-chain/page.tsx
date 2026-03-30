"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { use } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { trpc } from "@/lib/api/trpc";
import { toast } from "sonner";
import {
  Package,
  TruckIcon,
  Globe,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  ShoppingCart,
  Boxes,
  Factory,
  Ship,
  Plane,
  Truck,
  ChevronDown,
  ChevronRight,
  X,
  Zap,
  ArrowDown,
  BarChart3,
  Warehouse,
  CircleDot,
} from "lucide-react";
import {
  aggregateProductionRequirements,
  detectDeprecatedInventory,
} from "@/engine/materials/BillOfMaterials";
import type { AggregatedBOMEntry, SupplierOption } from "@/engine/materials/BillOfMaterials";
import type { TeamState } from "@/engine/types/state";
import {
  DEFAULT_SUPPLIERS,
  type MaterialType,
  type Region,
  type MaterialOrder,
  type SupplierTier,
} from "@/engine/materials";
import { SUPPLIER_TIER_CONFIG } from "@/engine/materials/suppliers";
import { SHIPPING_METHOD_ROUND_DELAYS } from "@/engine/logistics/routes";
import { SHIPPING_METHODS } from "@/engine/logistics";

// ─── Types ──────────────────────────────────────────────────────────
interface PageProps {
  params: Promise<{ gameId: string }>;
}

interface CartItem {
  id: string;
  materialType: MaterialType;
  spec: string;
  supplierId: string;
  supplierName: string;
  sourceRegion: Region;
  shippingMethod: "sea" | "air" | "land" | "rail";
  quantity: number;
  unitCost: number;
  landedCost: number;
  shippingCostEst: number;
  tariffCostEst: number;
  totalCost: number;
}

// ─── Constants ──────────────────────────────────────────────────────
const MATERIAL_LABELS: Record<MaterialType, string> = {
  display: "Display",
  processor: "Processor",
  memory: "Memory",
  storage: "Storage",
  camera: "Camera",
  battery: "Battery",
  chassis: "Chassis",
  other: "Other",
};

const MATERIAL_ICONS: Record<MaterialType, React.ElementType> = {
  display: Globe,
  processor: Factory,
  memory: Boxes,
  storage: Package,
  camera: CircleDot,
  battery: Zap,
  chassis: Warehouse,
  other: Boxes,
};

const SHIP_METHOD_ICONS: Record<string, React.ElementType> = {
  sea: Ship,
  air: Plane,
  land: Truck,
  rail: TruckIcon,
};

const SHIP_METHOD_LABELS: Record<string, string> = {
  sea: "Sea Freight",
  air: "Air Freight",
  land: "Land Transport",
  rail: "Rail Freight",
};

const TIER_COLORS: Record<SupplierTier, string> = {
  bronze: "#CD7F32",
  silver: "#C0C0C0",
  gold: "#FFD700",
};

// ─── Page Component ─────────────────────────────────────────────────
export default function SupplyChainPage({ params }: PageProps) {
  const { gameId } = use(params);
  const [activeTab, setActiveTab] = useState("source");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [expandedMaterials, setExpandedMaterials] = useState<Set<string>>(
    new Set()
  );
  const [vendorShipMethods, setVendorShipMethods] = useState<
    Record<string, "sea" | "air" | "land" | "rail">
  >({});
  const [vendorQuantities, setVendorQuantities] = useState<
    Record<string, number>
  >({});
  const vendorSectionRef = useRef<HTMLDivElement>(null);

  // ─── Data Fetching ──────────────────────────────────────────────
  const { data: teamState, isLoading: teamLoading } =
    trpc.team.getMyState.useQuery();
  const { data: materialsState, isLoading: materialsLoading } =
    trpc.material.getMaterialsState.useQuery();
  const utils = trpc.useUtils();

  const placeOrderMutation = trpc.material.placeOrder.useMutation({
    onSuccess: (result) => {
      toast.success(result.message);
      utils.team.getMyState.invalidate();
      utils.material.getMaterialsState.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // ─── Parse Team State ──────────────────────────────────────────
  // teamState from tRPC is { team, game, state: JSON_STRING, marketState, ... }
  // We need to parse state from JSON string into TeamState object
  const parsedState = useMemo<TeamState | null>(() => {
    if (!teamState) return null;
    try {
      const raw = (teamState as any).state;
      if (!raw) return null;
      return (typeof raw === "string" ? JSON.parse(raw) : raw) as TeamState;
    } catch {
      return null;
    }
  }, [teamState]);

  const inventory = materialsState?.inventory ?? parsedState?.materials?.inventory ?? [];
  const activeOrders = (materialsState?.activeOrders ?? parsedState?.materials?.activeOrders ?? []) as MaterialOrder[];
  const currentRound = (teamState as any)?.game?.currentRound ?? 1;
  const cash = parsedState?.cash ?? 0;
  const teamRegion: Region = materialsState?.region ?? (parsedState?.materials as any)?.region ?? "North America";

  // Aggregate BOM from all active factory lines
  const bom = useMemo(() => {
    if (!parsedState) return null;
    try {
      return aggregateProductionRequirements(parsedState);
    } catch {
      return null;
    }
  }, [parsedState]);

  // Deprecated inventory check
  const deprecatedItems = useMemo(() => {
    if (!parsedState) return [];
    try {
      return detectDeprecatedInventory(parsedState);
    } catch {
      return [];
    }
  }, [parsedState]);

  // Build stock status for all 8 materials
  const stockStatus = useMemo(() => {
    const allTypes: MaterialType[] = [
      "display",
      "processor",
      "memory",
      "storage",
      "camera",
      "battery",
      "chassis",
      "other",
    ];
    return allTypes.map((mat) => {
      const bomEntry = bom?.entries.find((e) => e.materialType === mat);
      const inStock =
        inventory
          .filter((i) => i.materialType === mat)
          .reduce((s, i) => s + i.quantity, 0) ?? 0;
      const needed = bomEntry?.totalQuantityNeeded ?? 0;
      const shortfall = bomEntry?.shortfall ?? 0;
      const ratio = needed > 0 ? inStock / needed : inStock > 0 ? 2 : 1;
      return { materialType: mat, inStock, needed, shortfall, ratio, bomEntry };
    });
  }, [bom, inventory]);

  const inStockCount = inventory.reduce((s, i) => s + i.quantity, 0);
  const inTransitCount = activeOrders
    .filter((o) => o.status !== "delivered" && o.status !== "cancelled")
    .reduce((s, o) => s + o.quantity, 0);

  // Materials that need ordering (have shortfall)
  const materialsNeedingOrders = useMemo(
    () => stockStatus.filter((s) => s.shortfall > 0 && s.bomEntry),
    [stockStatus]
  );

  // Cart totals
  const cartTotals = useMemo(() => {
    const materials = cart.reduce((s, i) => s + i.unitCost * i.quantity, 0);
    const shipping = cart.reduce((s, i) => s + i.shippingCostEst, 0);
    const tariffs = cart.reduce((s, i) => s + i.tariffCostEst, 0);
    const total = cart.reduce((s, i) => s + i.totalCost, 0);
    return { materials, shipping, tariffs, total };
  }, [cart]);

  // ─── Handlers ───────────────────────────────────────────────────
  const toggleMaterial = useCallback((mat: string) => {
    setExpandedMaterials((prev) => {
      const next = new Set(prev);
      if (next.has(mat)) next.delete(mat);
      else next.add(mat);
      return next;
    });
  }, []);

  const getVendorShipMethod = (vendorKey: string) =>
    vendorShipMethods[vendorKey] ?? "sea";

  const setVendorShipMethod = (
    vendorKey: string,
    method: "sea" | "air" | "land" | "rail"
  ) => {
    setVendorShipMethods((prev) => ({ ...prev, [vendorKey]: method }));
  };

  const getVendorQty = (vendorKey: string, defaultQty: number) =>
    vendorQuantities[vendorKey] ?? defaultQty;

  const setVendorQty = (vendorKey: string, qty: number) => {
    setVendorQuantities((prev) => ({ ...prev, [vendorKey]: qty }));
  };

  const addToCart = useCallback(
    (
      entry: AggregatedBOMEntry,
      supplier: SupplierOption,
      shippingMethod: "sea" | "air" | "land" | "rail",
      quantity: number
    ) => {
      const shipMethodConfig = SHIPPING_METHODS[shippingMethod];
      const shippingCostEst =
        supplier.shippingCostEstimate * quantity * (shipMethodConfig?.costMultiplier ?? 1);
      const tariffCostEst = supplier.tariffCostEstimate * quantity;
      const materialCost = supplier.unitCost * quantity;
      const totalCost = supplier.totalLandedCostPerUnit * quantity;

      const item: CartItem = {
        id: `${entry.materialType}-${supplier.supplier.id}-${Date.now()}`,
        materialType: entry.materialType,
        spec: entry.spec,
        supplierId: supplier.supplier.id,
        supplierName: supplier.supplier.name,
        sourceRegion: supplier.supplier.region,
        shippingMethod,
        quantity,
        unitCost: supplier.unitCost,
        landedCost: supplier.totalLandedCostPerUnit,
        shippingCostEst,
        tariffCostEst,
        totalCost,
      };

      setCart((prev) => [...prev, item]);
      toast.success(
        `Added ${formatNumber(quantity)} ${MATERIAL_LABELS[entry.materialType]} to cart`
      );
    },
    []
  );

  const removeFromCart = useCallback((id: string) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const autoFillCart = useCallback(() => {
    if (!bom) return;
    const newItems: CartItem[] = [];

    for (const entry of bom.entries) {
      if (entry.shortfall <= 0 || entry.eligibleSuppliers.length === 0)
        continue;
      const best = entry.eligibleSuppliers[0];
      const qty = entry.shortfall;
      const totalCost = best.totalLandedCostPerUnit * qty;

      newItems.push({
        id: `${entry.materialType}-${best.supplier.id}-${Date.now()}-auto`,
        materialType: entry.materialType,
        spec: entry.spec,
        supplierId: best.supplier.id,
        supplierName: best.supplier.name,
        sourceRegion: best.supplier.region,
        shippingMethod: "sea",
        quantity: qty,
        unitCost: best.unitCost,
        landedCost: best.totalLandedCostPerUnit,
        shippingCostEst: best.shippingCostEstimate * qty,
        tariffCostEst: best.tariffCostEstimate * qty,
        totalCost,
      });
    }

    if (newItems.length === 0) {
      toast.info("No shortfalls detected - nothing to auto-fill");
      return;
    }

    setCart(newItems);
    toast.success(`Auto-filled ${newItems.length} material orders`);
  }, [bom]);

  const submitAllOrders = useCallback(async () => {
    if (cart.length === 0) return;

    let successCount = 0;
    let failCount = 0;

    for (const item of cart) {
      try {
        await placeOrderMutation.mutateAsync({
          materialType: item.materialType,
          spec: item.spec,
          supplierId: item.supplierId,
          region: item.sourceRegion,
          quantity: item.quantity,
          shippingMethod: item.shippingMethod,
        });
        successCount++;
      } catch {
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} order(s) placed successfully`);
      setCart([]);
    }
    if (failCount > 0) {
      toast.error(`${failCount} order(s) failed`);
    }
  }, [cart, placeOrderMutation]);

  const scrollToVendors = () => {
    vendorSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // ─── Loading State ──────────────────────────────────────────────
  if (teamLoading || materialsLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <p className="text-sm text-muted-foreground">
            Loading supply chain...
          </p>
        </div>
      </div>
    );
  }

  // ─── Render Helpers ─────────────────────────────────────────────
  const renderStockBar = (
    mat: (typeof stockStatus)[0],
    index: number
  ) => {
    const Icon = MATERIAL_ICONS[mat.materialType];
    const pct = Math.min(mat.ratio * 100, 200);
    const barColor =
      mat.ratio >= 1
        ? "bg-emerald-500"
        : mat.ratio >= 0.4
          ? "bg-amber-500"
          : "bg-red-500";
    const textColor =
      mat.ratio >= 1
        ? "text-emerald-400"
        : mat.ratio >= 0.4
          ? "text-amber-400"
          : "text-red-400";

    return (
      <div
        key={mat.materialType}
        className="flex items-center gap-3 rounded-lg border border-border/50 bg-card/50 px-3 py-2"
      >
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-[72px]">
          <p className="text-xs font-medium">
            {MATERIAL_LABELS[mat.materialType]}
          </p>
          <p className={`text-xs font-mono ${textColor}`}>
            {formatNumber(mat.inStock)}/{formatNumber(mat.needed)}
          </p>
        </div>
        <div className="flex-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted/30">
            <div
              className={`h-full rounded-full ${barColor} transition-all duration-500`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
        </div>
        <span className={`text-xs font-mono font-bold ${textColor}`}>
          {Math.round(mat.ratio * 100)}%
        </span>
        {mat.shortfall > 0 && (
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-[10px] font-bold border-red-500/30 text-red-400 hover:bg-red-500/10"
            onClick={() => {
              setExpandedMaterials(
                (prev) => new Set([...prev, mat.materialType])
              );
              scrollToVendors();
            }}
          >
            ORDER {formatNumber(mat.shortfall)}
          </Button>
        )}
      </div>
    );
  };

  const renderTierBadge = (tier: SupplierTier) => {
    const config = SUPPLIER_TIER_CONFIG[tier];
    return (
      <Badge
        variant="outline"
        className="text-[10px] font-bold border-0 px-1.5 py-0"
        style={{
          backgroundColor: `${config.color}20`,
          color: config.color,
          borderColor: `${config.color}40`,
          borderWidth: 1,
        }}
      >
        {config.label}
      </Badge>
    );
  };

  const renderShippingPicker = (
    vendorKey: string,
    currentMethod: "sea" | "air" | "land" | "rail"
  ) => {
    const methods: ("sea" | "air" | "land" | "rail")[] = [
      "sea",
      "air",
      "land",
      "rail",
    ];
    return (
      <div className="flex gap-1">
        {methods.map((m) => {
          const Icon = SHIP_METHOD_ICONS[m];
          const delay = SHIPPING_METHOD_ROUND_DELAYS[m] ?? 0;
          const isActive = currentMethod === m;
          return (
            <button
              key={m}
              onClick={() => setVendorShipMethod(vendorKey, m)}
              className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium transition-all duration-200 ${
                isActive
                  ? "bg-emerald-600/20 text-emerald-400 ring-1 ring-emerald-500/40"
                  : "bg-muted/20 text-muted-foreground hover:bg-muted/40"
              }`}
            >
              <Icon className="h-3 w-3" />
              <span className="hidden sm:inline">{m}</span>
              <span className="text-[9px] opacity-70">
                {delay === 0 ? "now" : `+${delay}R`}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  const renderVendorCard = (
    entry: AggregatedBOMEntry,
    supplier: SupplierOption,
    idx: number
  ) => {
    const vendorKey = `${entry.materialType}-${supplier.supplier.id}`;
    const shipMethod = getVendorShipMethod(vendorKey);
    const quantity = getVendorQty(vendorKey, entry.shortfall);
    const tier = supplier.tier;
    const delay = SHIPPING_METHOD_ROUND_DELAYS[shipMethod] ?? 0;

    // Recalculate landed cost with selected shipping method
    const shipMultiplier = SHIPPING_METHODS[shipMethod]?.costMultiplier ?? 1;
    const adjustedShipping = supplier.shippingCostEstimate * shipMultiplier;
    const adjustedLanded =
      supplier.unitCost * supplier.fxMultiplier +
      adjustedShipping +
      supplier.tariffCostEstimate;

    return (
      <div
        key={supplier.supplier.id}
        className="rounded-lg border border-border/60 bg-card/70 p-4 transition-all duration-200 hover:border-border"
      >
        {/* Vendor header */}
        <div className="mb-3 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">
                {supplier.supplier.name}
              </span>
              {renderTierBadge(tier)}
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
              <Globe className="h-3 w-3" />
              {supplier.supplier.region}
              <span className="opacity-50">|</span>
              <span>Q: {supplier.qualityRating}/100</span>
              <span className="opacity-50">|</span>
              <span>
                {Math.round(supplier.supplier.onTimeDeliveryRate * 100)}%
                on-time
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold font-mono text-emerald-400">
              {formatCurrency(adjustedLanded)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              landed cost / unit
            </p>
          </div>
        </div>

        {/* Cost breakdown */}
        <div className="mb-3 grid grid-cols-4 gap-2 rounded-md bg-muted/10 p-2 text-xs">
          <div>
            <p className="text-muted-foreground">Material</p>
            <p className="font-mono font-medium">
              {formatCurrency(supplier.unitCost)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Shipping</p>
            <p className="font-mono font-medium">
              {formatCurrency(adjustedShipping)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Tariff</p>
            <p className="font-mono font-medium">
              {supplier.tariffRate > 0
                ? `${Math.round(supplier.tariffRate * 100)}%`
                : "0%"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">FX</p>
            <p className="font-mono font-medium">
              {supplier.fxMultiplier !== 1
                ? `x${supplier.fxMultiplier.toFixed(2)}`
                : "1.00"}
            </p>
          </div>
        </div>

        {/* Warnings */}
        {supplier.warnings.length > 0 && (
          <div className="mb-3 space-y-1">
            {supplier.warnings.map((w, i) => (
              <p key={i} className="flex items-center gap-1 text-[11px] text-amber-400">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                {w}
              </p>
            ))}
          </div>
        )}

        {/* Shipping method picker + qty + add */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <p className="mb-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Shipping Method
            </p>
            {renderShippingPicker(vendorKey, shipMethod)}
          </div>
          <div className="w-[120px]">
            <p className="mb-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Quantity
            </p>
            <Input
              type="number"
              min={supplier.supplier.minimumOrder}
              step={1000}
              value={quantity}
              onChange={(e) =>
                setVendorQty(vendorKey, parseInt(e.target.value) || 0)
              }
              className="h-8 font-mono text-sm bg-muted/10"
            />
          </div>
          <div className="flex flex-col items-end gap-1">
            <p className="text-xs font-mono font-bold">
              {formatCurrency(adjustedLanded * quantity)}
            </p>
            <Button
              size="sm"
              className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5"
              onClick={() => addToCart(entry, supplier, shipMethod, quantity)}
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              Add to Cart
            </Button>
          </div>
        </div>

        {/* Lead time note */}
        <p className="mt-2 text-[10px] text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          ETA: Round {currentRound + delay}
          {delay === 0
            ? " (arrives this round)"
            : ` (+${delay} round${delay > 1 ? "s" : ""})`}
          {" | "}MOQ: {formatNumber(supplier.supplier.minimumOrder)}
        </p>
      </div>
    );
  };

  // ─── TAB 1: Source Materials ────────────────────────────────────
  const renderSourceTab = () => (
    <div className="space-y-6">
      {/* Production Needs Overview */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-emerald-500" />
                Production Needs Overview
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Stock levels vs. factory requirements for this round
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
              onClick={autoFillCart}
            >
              <Zap className="h-3.5 w-3.5" />
              Auto-fill Cart
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2">
            {stockStatus.map((mat, i) => renderStockBar(mat, i))}
          </div>
          {bom && bom.warnings.length > 0 && (
            <div className="mt-4 space-y-1 rounded-md bg-muted/10 p-3">
              {bom.warnings.map((w, i) => (
                <p key={i} className="text-xs text-muted-foreground">
                  {w}
                </p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vendor Section */}
      <div ref={vendorSectionRef} className="space-y-4">
        {materialsNeedingOrders.length === 0 ? (
          <Card className="border-border/50 bg-card/80">
            <CardContent className="py-8 text-center">
              <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
              <p className="font-medium">All materials stocked</p>
              <p className="text-sm text-muted-foreground">
                Your factories have enough materials for this round.
              </p>
            </CardContent>
          </Card>
        ) : (
          materialsNeedingOrders.map((mat) => {
            const entry = mat.bomEntry!;
            const isExpanded = expandedMaterials.has(mat.materialType);
            const Icon = MATERIAL_ICONS[mat.materialType];

            return (
              <Card
                key={mat.materialType}
                className="border-border/50 bg-card/80 overflow-hidden"
              >
                {/* Material header - always visible */}
                <button
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/5 transition-colors"
                  onClick={() => toggleMaterial(mat.materialType)}
                >
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {MATERIAL_LABELS[mat.materialType]}
                      </span>
                      <Badge
                        variant="destructive"
                        className="text-[10px] px-1.5 py-0"
                      >
                        NEED {formatNumber(mat.shortfall)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {entry.eligibleSuppliers.length} vendor
                      {entry.eligibleSuppliers.length !== 1 ? "s" : ""}{" "}
                      available | Best landed:{" "}
                      <span className="font-mono font-medium text-foreground">
                        {formatCurrency(entry.bestLandedCost)}
                      </span>
                      /unit
                    </p>
                  </div>
                  <div className="text-right mr-2">
                    <p className="text-sm font-mono font-bold text-red-400">
                      ~{formatCurrency(entry.bestLandedCost * mat.shortfall)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      est. to fill
                    </p>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>

                {/* Vendor cards */}
                {isExpanded && (
                  <div className="border-t border-border/30 px-4 py-3 space-y-3 bg-muted/5">
                    {entry.eligibleSuppliers.map((supplier, idx) =>
                      renderVendorCard(entry, supplier, idx)
                    )}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );

  // ─── TAB 2: Inventory & Orders ──────────────────────────────────
  const renderInventoryTab = () => {
    const inTransitOrders = activeOrders.filter(
      (o) => o.status !== "delivered" && o.status !== "cancelled"
    );

    return (
      <div className="space-y-6">
        {/* Incoming Shipments */}
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TruckIcon className="h-4 w-4 text-blue-400" />
              Incoming Shipments
              {inTransitOrders.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  {inTransitOrders.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {inTransitOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No orders in transit.
              </p>
            ) : (
              <div className="space-y-3">
                {inTransitOrders.map((order) => {
                  const isDelayed = order.status === "delayed";
                  const totalRounds =
                    order.estimatedArrivalRound - order.orderRound;
                  const elapsed = currentRound - order.orderRound;
                  const progress =
                    totalRounds > 0
                      ? Math.min((elapsed / totalRounds) * 100, 100)
                      : 100;

                  return (
                    <div
                      key={order.id}
                      className={`rounded-lg border p-3 ${
                        isDelayed
                          ? "border-red-500/40 bg-red-500/5"
                          : "border-border/50 bg-card/50"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-sm flex items-center gap-2">
                            {MATERIAL_LABELS[order.materialType as MaterialType] ??
                              order.materialType}
                            <Badge
                              variant={isDelayed ? "destructive" : "secondary"}
                              className="text-[10px] px-1.5 py-0"
                            >
                              {order.status.toUpperCase()}
                            </Badge>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {order.supplierName} | {order.sourceRegion} via{" "}
                            {order.shippingMethod}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-mono font-bold">
                            {formatNumber(order.quantity)} units
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(order.totalCost)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-muted/30 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isDelayed ? "bg-red-500" : "bg-blue-500"
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <p className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">
                          ETA R{order.estimatedArrivalRound}
                          {isDelayed && order.delayRounds
                            ? ` (+${order.delayRounds} delayed)`
                            : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Deprecated Parts Warning */}
        {deprecatedItems.length > 0 && (
          <Card className="border-red-500/30 bg-red-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-red-400">
                <AlertTriangle className="h-4 w-4" />
                Deprecated Parts
              </CardTitle>
              <CardDescription>
                Tech upgrades have made these materials obsolete. Value decays
                each round.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {deprecatedItems.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-md border border-red-500/20 bg-card/40 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {MATERIAL_LABELS[item.materialType]} -{" "}
                        {item.spec}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Tier gap: {item.tierGap} |{" "}
                        {item.roundsUntilScrapped} rounds until scrapped
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono text-red-400">
                        {formatNumber(item.quantity)} units
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        -{formatCurrency(item.valueLossPerRound)}/round
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current Inventory Table */}
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Warehouse className="h-4 w-4 text-emerald-500" />
              Current Inventory
            </CardTitle>
          </CardHeader>
          <CardContent>
            {inventory.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No materials in inventory.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30 text-xs text-muted-foreground">
                      <th className="py-2 text-left font-medium">Material</th>
                      <th className="py-2 text-right font-medium">In Stock</th>
                      <th className="py-2 text-right font-medium">
                        Need/Round
                      </th>
                      <th className="py-2 text-right font-medium">
                        Rounds of Supply
                      </th>
                      <th className="py-2 text-right font-medium">
                        Avg Cost
                      </th>
                      <th className="py-2 text-right font-medium">
                        Holding Value
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map((item, i) => {
                      const bomEntry = bom?.entries.find(
                        (e) => e.materialType === item.materialType
                      );
                      const needPerRound =
                        bomEntry?.totalQuantityNeeded ?? 0;
                      const roundsSupply =
                        needPerRound > 0
                          ? Math.floor(item.quantity / needPerRound)
                          : item.quantity > 0
                            ? 999
                            : 0;
                      const supplyColor =
                        roundsSupply >= 3
                          ? "text-emerald-400"
                          : roundsSupply >= 1
                            ? "text-amber-400"
                            : "text-red-400";

                      return (
                        <tr
                          key={i}
                          className="border-b border-border/10 hover:bg-muted/5"
                        >
                          <td className="py-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {MATERIAL_LABELS[
                                  item.materialType as MaterialType
                                ] ?? item.materialType}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {item.spec}
                              </span>
                            </div>
                          </td>
                          <td className="py-2 text-right font-mono">
                            {formatNumber(item.quantity)}
                          </td>
                          <td className="py-2 text-right font-mono text-muted-foreground">
                            {formatNumber(needPerRound)}
                          </td>
                          <td
                            className={`py-2 text-right font-mono font-bold ${supplyColor}`}
                          >
                            {roundsSupply >= 999 ? "--" : roundsSupply}
                          </td>
                          <td className="py-2 text-right font-mono text-muted-foreground">
                            {formatCurrency(item.averageCost)}
                          </td>
                          <td className="py-2 text-right font-mono">
                            {formatCurrency(item.quantity * item.averageCost)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // ─── TAB 3: Market Intel ────────────────────────────────────────
  const renderMarketTab = () => {
    const tariffs = parsedState?.tariffs ?? (teamState as any)?.tariffs;
    const marketState = (teamState as any)?.marketState;
    const fx = marketState?.fxRates ?? (parsedState as any)?.fxRates;

    return (
      <div className="space-y-6">
        {/* Active Events */}
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              Active Events & Disruptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tariffs?.activeEvents && tariffs.activeEvents.length > 0 ? (
              <div className="space-y-2">
                {tariffs.activeEvents.map((event: any, i: number) => (
                  <div
                    key={i}
                    className="rounded-md border border-amber-500/20 bg-amber-500/5 p-3"
                  >
                    <p className="font-medium text-sm text-amber-400">
                      {event.name || event.type || "Trade Event"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {event.description || "Active trade policy affecting supply routes."}
                    </p>
                    {event.affectedRoutes && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Routes: {event.affectedRoutes.join(", ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-3 text-center">
                No active trade events or disruptions.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Tariff Info */}
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              Tariff Rates by Route
            </CardTitle>
            <CardDescription className="text-xs">
              Your factories are in {teamRegion}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  "North America",
                  "South America",
                  "Europe",
                  "Africa",
                  "Asia",
                  "Oceania",
                  "Middle East",
                ] as Region[]
              )
                .filter((r) => r !== teamRegion)
                .map((region) => {
                  const isFriendly =
                    (
                      (
                        {
                          "North America": ["Europe", "Oceania"],
                          "South America": ["North America"],
                          Europe: ["North America", "Middle East"],
                          Africa: ["Europe", "Middle East"],
                          Asia: ["Oceania", "Middle East"],
                          Oceania: ["Asia", "North America"],
                          "Middle East": ["Europe", "Asia", "Africa"],
                        } as Record<string, string[]>
                      )[teamRegion] ?? []
                    ).includes(region);

                  return (
                    <div
                      key={region}
                      className="flex items-center justify-between rounded-md border border-border/30 px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">{region}</span>
                      </div>
                      <Badge
                        variant={isFriendly ? "secondary" : "outline"}
                        className={`text-[10px] ${
                          isFriendly
                            ? "text-emerald-400 border-emerald-500/30"
                            : "text-amber-400 border-amber-500/30"
                        }`}
                      >
                        {isFriendly ? "LOW TARIFF" : "STANDARD"}
                      </Badge>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>

        {/* FX Rates */}
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-400" />
              FX Impact Estimates
            </CardTitle>
            <CardDescription className="text-xs">
              Currency multipliers applied to material costs from each region
            </CardDescription>
          </CardHeader>
          <CardContent>
            {bom && bom.entries.length > 0 ? (
              <div className="space-y-2">
                {Array.from(
                  new Set(
                    bom.entries.flatMap((e) =>
                      e.eligibleSuppliers.map(
                        (s) =>
                          `${s.supplier.region}|${s.fxMultiplier.toFixed(3)}`
                      )
                    )
                  )
                ).map((key) => {
                  const [region, mult] = key.split("|");
                  const fxVal = parseFloat(mult);
                  const isUp = fxVal > 1.02;
                  const isDown = fxVal < 0.98;
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between rounded-md border border-border/30 px-3 py-2"
                    >
                      <span className="text-sm">{region}</span>
                      <span
                        className={`font-mono font-bold text-sm ${
                          isUp
                            ? "text-red-400"
                            : isDown
                              ? "text-emerald-400"
                              : "text-muted-foreground"
                        }`}
                      >
                        x{fxVal.toFixed(3)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-3 text-center">
                FX data available after first production round.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Shipping Comparison */}
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Ship className="h-4 w-4 text-blue-400" />
              Shipping Method Reference
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {(["sea", "air", "land", "rail"] as const).map((method) => {
                const Icon = SHIP_METHOD_ICONS[method];
                const config = SHIPPING_METHODS[method];
                const delay = SHIPPING_METHOD_ROUND_DELAYS[method] ?? 0;
                return (
                  <div
                    key={method}
                    className="flex items-center gap-3 rounded-md border border-border/30 px-3 py-2"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {SHIP_METHOD_LABELS[method]}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {config?.description ?? ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-mono font-bold">
                        +{delay}R
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        x{config?.costMultiplier.toFixed(1)} cost
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // ─── Cart Panel (sticky bottom) ─────────────────────────────────
  const renderCart = () => {
    if (cart.length === 0) return null;
    const cashAfter = cash - cartTotals.total;

    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
        <div className="mx-auto max-w-7xl px-4 py-3">
          {/* Cart items - horizontal scrollable */}
          <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
            {cart.map((item) => (
              <div
                key={item.id}
                className="flex shrink-0 items-center gap-2 rounded-md border border-border/50 bg-card/80 px-2.5 py-1.5"
              >
                <span className="text-xs font-medium">
                  {MATERIAL_LABELS[item.materialType]}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {formatNumber(item.quantity)}x
                </span>
                <span className="text-xs font-mono">
                  {formatCurrency(item.totalCost)}
                </span>
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="ml-1 rounded p-0.5 text-muted-foreground hover:bg-destructive/20 hover:text-red-400 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>

          {/* Cart summary + submit */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-4 text-xs">
              <div>
                <span className="text-muted-foreground">Materials</span>{" "}
                <span className="font-mono font-medium">
                  {formatCurrency(cartTotals.materials)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Shipping</span>{" "}
                <span className="font-mono font-medium">
                  {formatCurrency(cartTotals.shipping)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Tariffs</span>{" "}
                <span className="font-mono font-medium">
                  {formatCurrency(cartTotals.tariffs)}
                </span>
              </div>
              <div className="border-l border-border/50 pl-4">
                <span className="text-muted-foreground">Total</span>{" "}
                <span className="text-sm font-mono font-bold">
                  {formatCurrency(cartTotals.total)}
                </span>
              </div>
              <div className="border-l border-border/50 pl-4">
                <span className="text-muted-foreground">Cash After</span>{" "}
                <span
                  className={`text-sm font-mono font-bold ${
                    cashAfter < 0 ? "text-red-400" : "text-emerald-400"
                  }`}
                >
                  {formatCurrency(cashAfter)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => setCart([])}
              >
                Clear
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 px-6"
                disabled={placeOrderMutation.isPending || cashAfter < 0}
                onClick={submitAllOrders}
              >
                {placeOrderMutation.isPending ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <ShoppingCart className="h-3.5 w-3.5" />
                )}
                Submit {cart.length} Order{cart.length !== 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ─── Main Render ────────────────────────────────────────────────
  return (
    <div className={`pb-${cart.length > 0 ? "32" : "4"} space-y-4`}>
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 -mx-4 border-b border-border/50 bg-background/95 backdrop-blur-md px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Package className="h-5 w-5 text-emerald-500" />
              Supply Chain
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Round {currentRound} | {teamRegion}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Cash
              </p>
              <p className="text-lg font-bold font-mono text-emerald-400">
                {formatCurrency(cash)}
              </p>
            </div>
            <div className="h-8 w-px bg-border/50" />
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                In Stock
              </p>
              <p className="text-lg font-bold font-mono">
                {formatNumber(inStockCount)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                In Transit
              </p>
              <p className="text-lg font-bold font-mono text-blue-400">
                {formatNumber(inTransitCount)}
              </p>
            </div>
            {cart.length > 0 && (
              <>
                <div className="h-8 w-px bg-border/50" />
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Cart
                  </p>
                  <p className="text-lg font-bold font-mono text-amber-400">
                    {cart.length}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-3 bg-muted/20">
          <TabsTrigger value="source" className="gap-1.5 text-xs">
            <Factory className="h-3.5 w-3.5" />
            Source Materials
          </TabsTrigger>
          <TabsTrigger value="inventory" className="gap-1.5 text-xs">
            <Warehouse className="h-3.5 w-3.5" />
            Inventory & Orders
          </TabsTrigger>
          <TabsTrigger value="intel" className="gap-1.5 text-xs">
            <BarChart3 className="h-3.5 w-3.5" />
            Market Intel
          </TabsTrigger>
        </TabsList>

        <TabsContent value="source" className="mt-4">
          {renderSourceTab()}
        </TabsContent>
        <TabsContent value="inventory" className="mt-4">
          {renderInventoryTab()}
        </TabsContent>
        <TabsContent value="intel" className="mt-4">
          {renderMarketTab()}
        </TabsContent>
      </Tabs>

      {/* Sticky Cart */}
      {renderCart()}
    </div>
  );
}
