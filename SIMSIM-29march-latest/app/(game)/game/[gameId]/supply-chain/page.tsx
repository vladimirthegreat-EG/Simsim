"use client";

import { useState, useEffect, useMemo } from "react";
import { use } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { PageHeader, SectionHeader } from "@/components/ui/section-header";
import { trpc } from "@/lib/api/trpc";
import { useDecisionStore } from "@/lib/stores/decisionStore";
// DecisionSubmitBar not needed - material orders are submitted directly via API
import { toast } from "sonner";
import {
  Package,
  TruckIcon,
  Globe,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  TrendingUp,
  TrendingDown,
  MapPin,
  ShoppingCart,
  Boxes,
  Factory,
  Percent,
  Ship,
  Plane,
  Truck,
  Leaf,
  Anchor,
} from "lucide-react";
import type { Segment } from "@/engine/types";
import {
  MaterialEngine,
  DEFAULT_SUPPLIERS,
  REGIONAL_CAPABILITIES,
  type Material,
  type MaterialInventory,
  type MaterialOrder,
  type Supplier,
  type Region,
  type MaterialType,
} from "@/engine/materials";
import { LogisticsEngine, SHIPPING_METHODS, SHIPPING_ROUTES, MAJOR_PORTS, type ShippingMethod } from "@/engine/logistics";
import { TariffEngine } from "@/engine/tariffs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface PageProps {
  params: Promise<{ gameId: string }>;
}

const SEGMENT_OPTIONS: Segment[] = ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"];

const MATERIAL_ICONS: Record<MaterialType, React.ElementType> = {
  display: Globe,
  processor: Factory,
  memory: Boxes,
  storage: Package,
  camera: Globe,
  battery: TrendingUp,
  chassis: Package,
  other: Boxes,
};

// Default production capacity per segment per round (units)
const DEFAULT_PRODUCT_CAPACITY = 50_000;

export default function SupplyChainPage({ params }: PageProps) {
  const { gameId } = use(params);
  const [activeTab, setActiveTab] = useState("source-order");
  const [selectedSegment, setSelectedSegment] = useState<Segment>("General");
  const [selectedMaterialType, setSelectedMaterialType] = useState<MaterialType>("display");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [orderQuantity, setOrderQuantity] = useState<number>(10000);
  const [shippingMethod, setShippingMethod] = useState<"sea" | "air" | "land" | "rail">("sea");
  // Logistics state
  const [routeFrom, setRouteFrom] = useState<Region>("North America");
  const [routeTo, setRouteTo] = useState<Region>("Asia");
  const [shipWeight, setShipWeight] = useState(10);
  const [shipVolume, setShipVolume] = useState(20);

  // Fetch live game state
  const { data: teamState, isLoading: teamStateLoading } = trpc.team.getMyState.useQuery();
  const { data: materialsState, isLoading: materialsLoading } = trpc.material.getMaterialsState.useQuery();

  // Extract state values with defaults
  const inventory = materialsState?.inventory ?? [];
  const activeOrders = materialsState?.activeOrders ?? [];
  const currentRound = teamState?.game.currentRound ?? 1;
  const teamRegion: Region = materialsState?.region ?? "North America";
  const cash = (teamState as any)?.cash ?? 0;

  // Get material requirements for selected segment
  const requirements = useMemo(
    () => MaterialEngine.getMaterialRequirements(selectedSegment),
    [selectedSegment]
  );

  // Get suppliers for selected material type
  const availableSuppliers = useMemo(() => {
    return DEFAULT_SUPPLIERS.filter(s => s.materials.includes(selectedMaterialType));
  }, [selectedMaterialType]);

  // Get selected supplier details
  const supplierDetails = useMemo(() => {
    return DEFAULT_SUPPLIERS.find(s => s.id === selectedSupplier);
  }, [selectedSupplier]);

  // Calculate order preview
  const orderPreview = useMemo(() => {
    if (!supplierDetails) return null;

    const material = requirements.materials.find(m => m.type === selectedMaterialType);
    if (!material) return null;

    const regional = REGIONAL_CAPABILITIES[supplierDetails.region];
    const baseCost = material.costPerUnit * regional.costMultiplier;
    const materialCost = baseCost * orderQuantity;

    // Estimate logistics (simplified)
    const weight = orderQuantity * 0.001; // kg to tons
    const volume = orderQuantity * 0.0001; // to cubic meters

    try {
      const logistics = LogisticsEngine.calculateLogistics(
        supplierDetails.region,
        teamRegion,
        shippingMethod,
        weight,
        volume,
        20 // production time
      );

      // Estimate tariff (simplified - would use full TariffEngine in real integration)
      // Note: Tariff rates are simplified estimates. Actual rates calculated by TariffEngine during round processing.
      const tariffRate = supplierDetails.region === "Asia" && teamRegion === "North America" ? 0.25 : 0.10;
      const tariffCost = materialCost * tariffRate;

      return {
        materialCost,
        shippingCost: logistics.totalLogisticsCost,
        tariffCost,
        totalCost: materialCost + logistics.totalLogisticsCost + tariffCost,
        leadTime: logistics.totalLeadTime,
        reliability: logistics.onTimeProbability,
      };
    } catch (error) {
      return null;
    }
  }, [supplierDetails, requirements, selectedMaterialType, orderQuantity, shippingMethod, teamRegion]);

  // Logistics: compare shipping methods for selected route
  const shippingComparison = useMemo(() => {
    try {
      return LogisticsEngine.compareShippingOptions(routeFrom, routeTo, shipWeight, shipVolume, 1);
    } catch {
      return [];
    }
  }, [routeFrom, routeTo, shipWeight, shipVolume]);

  // Logistics: route recommendations
  const routeRecommendations = useMemo(() => {
    try {
      return LogisticsEngine.getRecommendations(routeFrom, routeTo, shipWeight, shipVolume, 50000, 30);
    } catch {
      return null;
    }
  }, [routeFrom, routeTo, shipWeight, shipVolume]);

  const METHOD_ICONS: Record<string, React.ElementType> = {
    sea: Ship, air: Plane, land: Truck, rail: TruckIcon,
  };

  // Calculate inventory value
  const inventoryValue = useMemo(() => {
    return inventory.reduce((sum, inv) => sum + inv.quantity * inv.averageCost, 0);
  }, [inventory]);

  // Place order mutation
  const placeOrderMutation = trpc.material.placeOrder.useMutation({
    onSuccess: (result) => {
      toast.success(result.message);
      // Reset form
      setOrderQuantity(10000);
      setSelectedSupplier("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Handle order placement
  const handlePlaceOrder = () => {
    if (!supplierDetails || !orderPreview) return;

    const material = requirements.materials.find(m => m.type === selectedMaterialType);
    if (!material) return;

    placeOrderMutation.mutate({
      materialType: selectedMaterialType,
      spec: material.spec,
      supplierId: supplierDetails.id,
      region: supplierDetails.region,
      quantity: orderQuantity,
      shippingMethod,
    });
  };

  // Get all material requirements across all segments for inventory matching
  const allSegmentRequirements = useMemo(() => {
    const map: Record<string, { segment: Segment; materials: Material[] }> = {};
    for (const seg of SEGMENT_OPTIONS) {
      const reqs = MaterialEngine.getMaterialRequirements(seg);
      map[seg] = { segment: seg, materials: reqs.materials };
    }
    return map;
  }, []);

  // Map inventory items to their segment by matching spec
  const inventoryWithSegment = useMemo(() => {
    return inventory.map((item) => {
      let matchedSegment: Segment | null = null;
      for (const seg of SEGMENT_OPTIONS) {
        const segReqs = allSegmentRequirements[seg];
        if (segReqs?.materials.some(m => m.type === item.materialType && m.spec === item.spec)) {
          matchedSegment = seg;
          break;
        }
      }
      return { ...item, segment: matchedSegment };
    });
  }, [inventory, allSegmentRequirements]);

  // Estimate rounds of production remaining per segment
  const roundsRemainingBySegment = useMemo(() => {
    const result: Record<string, number> = {};
    for (const seg of SEGMENT_OPTIONS) {
      const segReqs = allSegmentRequirements[seg];
      if (!segReqs) continue;
      const segInventory = inventoryWithSegment.filter(inv => inv.segment === seg);
      if (segInventory.length === 0) {
        result[seg] = 0;
        continue;
      }
      // The bottleneck material determines rounds remaining
      // Each material needed: 1 unit per phone, capacity = DEFAULT_PRODUCT_CAPACITY phones/round
      // So for each material type, rounds = inventory qty / DEFAULT_PRODUCT_CAPACITY
      const materialRounds = segReqs.materials.map(mat => {
        const inv = segInventory.find(i => i.materialType === mat.type && i.spec === mat.spec);
        if (!inv || inv.quantity === 0) return 0;
        return Math.floor(inv.quantity / DEFAULT_PRODUCT_CAPACITY);
      });
      result[seg] = Math.min(...materialRounds);
    }
    return result;
  }, [allSegmentRequirements, inventoryWithSegment]);

  // Find the last order for the selected segment (for Quick Reorder)
  const lastOrderForSegment = useMemo(() => {
    const segReqs = allSegmentRequirements[selectedSegment];
    if (!segReqs) return null;
    const segSpecs = segReqs.materials.map(m => m.spec);
    // Find most recent order matching any spec for this segment
    const matching = activeOrders.filter((o: MaterialOrder) => segSpecs.includes(o.spec));
    if (matching.length === 0) return null;
    // Return the most recent one (highest orderRound, or last in array)
    return matching.reduce((latest: MaterialOrder, o: MaterialOrder) =>
      o.orderRound >= latest.orderRound ? o : latest
    , matching[0]);
  }, [activeOrders, selectedSegment, allSegmentRequirements]);

  // Handle quick reorder
  const handleQuickReorder = () => {
    if (!lastOrderForSegment) return;
    // Find supplier by ID or name
    const supplier = DEFAULT_SUPPLIERS.find(s =>
      s.id === (lastOrderForSegment as Record<string, unknown>).supplierId ||
      s.name === (lastOrderForSegment as Record<string, unknown>).supplierName
    );
    if (!supplier) {
      toast.error("Could not find original supplier for reorder");
      return;
    }
    placeOrderMutation.mutate({
      materialType: lastOrderForSegment.materialType ?? "display",
      spec: lastOrderForSegment.spec ?? "",
      supplierId: supplier.id,
      region: supplier.region,
      quantity: lastOrderForSegment.quantity ?? 10000,
      shippingMethod: (lastOrderForSegment as Record<string, unknown>).shippingMethod as string ?? "sea",
    });
  };

  // Show loading state
  if (teamStateLoading || materialsLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <PageHeader
          title="Supply Chain & Logistics"
          subtitle="Source materials, manage suppliers, compare shipping routes, and track FX exposure"
          icon={<Package className="h-6 w-6" />}
        />
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading supply chain data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Supply Chain Management"
        subtitle="Source materials, manage suppliers, and optimize logistics"
        icon={<Package className="h-6 w-6" />}
      />

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          label="Inventory Value"
          value={formatCurrency(inventoryValue)}
          icon={<Package className="h-5 w-5" />}
          trend={inventoryValue > 0 ? "up" : "neutral"}
        />
        <StatCard
          label="Active Orders"
          value={activeOrders.length.toString()}
          icon={<ShoppingCart className="h-5 w-5" />}
          trend="neutral"
        />
        <StatCard
          label="Active Suppliers"
          value={DEFAULT_SUPPLIERS.length.toString()}
          icon={<Factory className="h-5 w-5" />}
          trend="neutral"
        />
        <StatCard
          label="Available Cash"
          value={formatCurrency(cash)}
          icon={<DollarSign className="h-5 w-5" />}
          trend="neutral"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="source-order">Source &amp; Order</TabsTrigger>
          <TabsTrigger value="inventory-orders">Inventory &amp; Orders</TabsTrigger>
          <TabsTrigger value="costs-logistics">Costs &amp; Logistics</TabsTrigger>
        </TabsList>

        {/* ============================================================ */}
        {/* TAB 1: Source & Order                                        */}
        {/* ============================================================ */}
        <TabsContent value="source-order" className="space-y-4">
          {/* Step 1 — Segment Selector */}
          <Card>
            <CardHeader>
              <CardTitle>1. Select Segment</CardTitle>
              <CardDescription>
                Choose which phone segment you are sourcing materials for
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Label>Phone Segment:</Label>
                <Select value={selectedSegment} onValueChange={(v) => setSelectedSegment(v as Segment)}>
                  <SelectTrigger className="w-[240px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEGMENT_OPTIONS.map((seg) => (
                      <SelectItem key={seg} value={seg}>
                        {seg}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Quick Reorder button */}
                {lastOrderForSegment && (
                  <Button
                    variant="outline"
                    onClick={handleQuickReorder}
                    disabled={placeOrderMutation.isPending}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    {placeOrderMutation.isPending
                      ? "Reordering..."
                      : `Quick Order: Reorder last quantities (${formatNumber(lastOrderForSegment.quantity)} ${lastOrderForSegment.materialType})`}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Step 2 — Material Requirements for Selected Segment */}
          <Card>
            <CardHeader>
              <CardTitle>2. Material Requirements — {selectedSegment}</CardTitle>
              <CardDescription>
                Specifications and per-unit costs for every material needed
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Segment summary stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Total Material Cost</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(requirements.totalCost)}</div>
                    <p className="text-xs text-muted-foreground">per unit</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Lead Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{requirements.leadTime} days</div>
                    <p className="text-xs text-muted-foreground">maximum across all materials</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Components</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{requirements.materials.length}</div>
                    <p className="text-xs text-muted-foreground">unique materials required</p>
                  </CardContent>
                </Card>
              </div>

              {/* Material breakdown table */}
              <SectionHeader title="Material Components" />
              <div className="grid gap-3 mt-2">
                {requirements.materials.map((material) => {
                  const Icon = MATERIAL_ICONS[material.type];
                  return (
                    <Card key={material.type} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium capitalize">{material.type}</div>
                            <div className="text-sm text-muted-foreground">{material.spec}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{formatCurrency(material.costPerUnit)}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {material.source}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Step 3 — Material Type + Supplier Picker */}
          <Card>
            <CardHeader>
              <CardTitle>3. Choose Material &amp; Supplier</CardTitle>
              <CardDescription>
                Pick a material type, then select a supplier
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Material type selector */}
              <div className="flex items-center gap-2">
                <Label>Material Type:</Label>
                <Select
                  value={selectedMaterialType}
                  onValueChange={(v) => {
                    setSelectedMaterialType(v as MaterialType);
                    setSelectedSupplier("");
                  }}
                >
                  <SelectTrigger className="w-[220px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="display">Display</SelectItem>
                    <SelectItem value="processor">Processor</SelectItem>
                    <SelectItem value="memory">Memory</SelectItem>
                    <SelectItem value="storage">Storage</SelectItem>
                    <SelectItem value="camera">Camera</SelectItem>
                    <SelectItem value="battery">Battery</SelectItem>
                    <SelectItem value="chassis">Chassis</SelectItem>
                    <SelectItem value="other">Other Components</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <p className="text-sm text-muted-foreground mb-2">
                Higher quality suppliers reduce your factory defect rate and improve product reliability
              </p>

              {/* Supplier cards */}
              <div className="grid gap-4">
                {availableSuppliers.map((supplier) => {
                  const isSelected = selectedSupplier === supplier.id;
                  return (
                    <Card
                      key={supplier.id}
                      className={`p-4 cursor-pointer transition-colors ${isSelected ? "border-primary border-2 bg-primary/5" : "hover:border-muted-foreground/40"}`}
                      onClick={() => setSelectedSupplier(supplier.id)}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-bold text-lg">{supplier.name}</div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="h-4 w-4" />
                              {supplier.region}
                            </div>
                          </div>
                          <Badge variant={supplier.qualityRating >= 90 ? "default" : "secondary"}>
                            Quality: {supplier.qualityRating}/100
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">Cost Multiplier</div>
                            <div className="font-medium">{REGIONAL_CAPABILITIES[supplier.region].costMultiplier.toFixed(2)}x</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Defect Rate</div>
                            <div className="font-medium">{(supplier.defectRate * 100).toFixed(2)}%</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Reliability</div>
                            <div className="font-medium">{Math.round(supplier.onTimeDeliveryRate * 100)}%</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Capacity</div>
                            <div className="font-medium">{formatNumber(supplier.monthlyCapacity)}/mo</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Min Order</div>
                            <div className="font-medium">{formatNumber(supplier.minimumOrder)}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {supplier.paymentTerms === "immediate" ? "Immediate Payment" : supplier.paymentTerms.toUpperCase()}
                          </Badge>
                          <Badge variant="outline">
                            Contract Discount: {Math.round(supplier.contractDiscount * 100)}%
                          </Badge>
                          {supplier.costCompetitiveness > 0.7 && (
                            <Badge variant="default" className="bg-green-500">
                              <DollarSign className="h-3 w-3 mr-1" />
                              Cost Competitive
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Step 4 — Quantity, Shipping, Preview, Place Order */}
          <Card>
            <CardHeader>
              <CardTitle>4. Configure &amp; Place Order</CardTitle>
              <CardDescription>
                Set quantity and shipping method, review the cost breakdown, then submit
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    value={orderQuantity}
                    onChange={(e) => setOrderQuantity(Number(e.target.value))}
                    min={supplierDetails?.minimumOrder ?? 1000}
                    step={1000}
                  />
                  {supplierDetails && (
                    <p className="text-xs text-muted-foreground">
                      Minimum: {formatNumber(supplierDetails.minimumOrder)}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Shipping Method</Label>
                  <Select
                    value={shippingMethod}
                    onValueChange={(v) => setShippingMethod(v as typeof shippingMethod)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sea">
                        <div className="flex items-center gap-2">
                          <Ship className="h-4 w-4" />
                          Sea Freight (Cheapest, Slowest)
                        </div>
                      </SelectItem>
                      <SelectItem value="air">Air Freight (Fastest, Most Expensive)</SelectItem>
                      <SelectItem value="land">Land Transport (Moderate)</SelectItem>
                      <SelectItem value="rail">Rail Transport (Eco-friendly)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Order Preview */}
              {orderPreview && supplierDetails && (
                <Card className="bg-muted/50">
                  <CardHeader>
                    <CardTitle className="text-lg">Order Preview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Material Cost</div>
                        <div className="text-lg font-bold">{formatCurrency(orderPreview.materialCost)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Shipping Cost</div>
                        <div className="text-lg font-bold">{formatCurrency(orderPreview.shippingCost)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Tariff Cost</div>
                        <div className="text-lg font-bold text-orange-500">
                          {formatCurrency(orderPreview.tariffCost)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Total Cost</div>
                        <div className="text-xl font-bold text-primary">
                          {formatCurrency(orderPreview.totalCost)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          Estimated Delivery: {orderPreview.leadTime} days
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-sm">
                          Reliability: {Math.round(orderPreview.reliability * 100)}%
                        </span>
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handlePlaceOrder}
                      disabled={
                        !selectedSupplier ||
                        orderQuantity < (supplierDetails?.minimumOrder ?? 0) ||
                        placeOrderMutation.isPending ||
                        teamStateLoading ||
                        materialsLoading
                      }
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      {placeOrderMutation.isPending
                        ? "Placing Order..."
                        : `Place Order - ${formatCurrency(orderPreview.totalCost)}`}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {!selectedSupplier && (
                <div className="text-center py-8 text-muted-foreground">
                  Select a supplier above to see order preview
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================ */}
        {/* TAB 2: Inventory & Orders                                    */}
        {/* ============================================================ */}
        <TabsContent value="inventory-orders" className="space-y-4">
          {/* Overview stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              label="Total Inventory Value"
              value={formatCurrency(inventoryValue)}
              icon={<Boxes className="h-5 w-5" />}
              trend={inventoryValue > 0 ? "up" : "neutral"}
            />
            <StatCard
              label="Items in Stock"
              value={formatNumber(inventory.reduce((sum, inv) => sum + inv.quantity, 0))}
              icon={<Package className="h-5 w-5" />}
              trend="neutral"
            />
            <StatCard
              label="Active Orders"
              value={activeOrders.length.toString()}
              icon={<ShoppingCart className="h-5 w-5" />}
              trend="neutral"
            />
          </div>

          {/* Current Inventory */}
          <Card>
            <CardHeader>
              <CardTitle>Current Inventory</CardTitle>
              <CardDescription>
                Per-material stock levels, costs, and estimated production rounds remaining
              </CardDescription>
            </CardHeader>
            <CardContent>
              {inventory.length === 0 ? (
                <div className="text-center py-12">
                  <Boxes className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No materials in inventory</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Place orders to build your material inventory
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Per-segment rounds remaining summary */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
                    {SEGMENT_OPTIONS.map((seg) => {
                      const rounds = roundsRemainingBySegment[seg] ?? 0;
                      return (
                        <Card key={seg} className="p-3">
                          <div className="text-xs text-muted-foreground">{seg}</div>
                          <div className="font-bold text-lg">
                            {rounds} {rounds === 1 ? "round" : "rounds"}
                          </div>
                          <div className="text-xs text-muted-foreground">of materials remaining</div>
                        </Card>
                      );
                    })}
                  </div>

                  {/* Inventory table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="py-2 pr-4 font-medium text-muted-foreground">Material</th>
                          <th className="py-2 pr-4 font-medium text-muted-foreground">Segment</th>
                          <th className="py-2 pr-4 font-medium text-muted-foreground text-right">Quantity</th>
                          <th className="py-2 pr-4 font-medium text-muted-foreground text-right">Avg Cost</th>
                          <th className="py-2 font-medium text-muted-foreground text-right">Total Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventoryWithSegment.map((item, idx) => (
                          <tr key={idx} className="border-b last:border-0">
                            <td className="py-3 pr-4">
                              <div className="font-medium capitalize">{item.materialType}</div>
                              <div className="text-xs text-muted-foreground">{item.spec}</div>
                            </td>
                            <td className="py-3 pr-4">
                              <Badge variant="outline">{item.segment ?? "Unknown"}</Badge>
                            </td>
                            <td className="py-3 pr-4 text-right font-medium">{formatNumber(item.quantity)}</td>
                            <td className="py-3 pr-4 text-right">{formatCurrency(item.averageCost)}</td>
                            <td className="py-3 text-right font-medium">{formatCurrency(item.quantity * item.averageCost)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Orders */}
          <Card>
            <CardHeader>
              <CardTitle>Active Orders</CardTitle>
              <CardDescription>
                Track your in-transit and pending material orders
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeOrders.length === 0 ? (
                <div className="text-center py-12">
                  <TruckIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No active orders</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Orders placed will appear here for tracking
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeOrders.map((order) => {
                    const statusColor =
                      order.status === "delivered"
                        ? "default"
                        : order.status === "delayed" || order.status === "cancelled"
                        ? "destructive"
                        : "secondary";
                    return (
                      <Card key={order.id} className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-medium capitalize">{order.materialType}</div>
                              <div className="text-sm text-muted-foreground">{order.spec}</div>
                            </div>
                            <Badge variant={statusColor}>
                              {order.status}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                            <div>
                              <div className="text-muted-foreground">Supplier</div>
                              <div className="font-medium">{order.supplierName}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Quantity</div>
                              <div className="font-medium">{formatNumber(order.quantity)}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">ETA</div>
                              <div className="font-medium">Round {order.estimatedArrivalRound}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Shipping</div>
                              <div className="font-medium capitalize">{order.shippingMethod}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Total Cost</div>
                              <div className="font-medium">{formatCurrency(order.totalCost)}</div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================ */}
        {/* TAB 3: Costs & Logistics                                     */}
        {/* ============================================================ */}
        <TabsContent value="costs-logistics" className="space-y-4">
          {/* Shipping Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Shipping Route Comparison</CardTitle>
              <CardDescription>Compare shipping methods between regions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label>From Region</Label>
                  <Select value={routeFrom} onValueChange={(v) => setRouteFrom(v as Region)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["North America", "Europe", "Asia", "MENA"] as Region[]).map(r => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>To Region</Label>
                  <Select value={routeTo} onValueChange={(v) => setRouteTo(v as Region)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["North America", "Europe", "Asia", "MENA"] as Region[]).map(r => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Weight (tons)</Label>
                  <Input type="number" value={shipWeight} onChange={(e) => setShipWeight(Number(e.target.value))} min={1} />
                </div>
                <div>
                  <Label>Volume (m3)</Label>
                  <Input type="number" value={shipVolume} onChange={(e) => setShipVolume(Number(e.target.value))} min={1} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Default values shown. Actual weight depends on order quantity and material type.</p>

              {shippingComparison.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                  {shippingComparison.map((option) => {
                    const Icon = METHOD_ICONS[option.method] || Ship;
                    const isRecommended = (routeRecommendations as any)?.bestOverall === option.method;
                    return (
                      <Card key={option.method} className={isRecommended ? "border-primary border-2" : ""}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Icon className="h-5 w-5" />
                              <CardTitle className="text-base capitalize">{option.method}</CardTitle>
                            </div>
                            {isRecommended && <Badge variant="default">Recommended</Badge>}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Cost</span>
                            <span className="font-medium">{formatCurrency(option.logistics.totalLogisticsCost)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Lead Time</span>
                            <span className="font-medium">{option.logistics.totalLeadTime} days</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Reliability</span>
                            <span className="font-medium">{Math.round(option.logistics.onTimeProbability * 100)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">CO2</span>
                            <span className="font-medium flex items-center gap-1">
                              <Leaf className="h-3 w-3" />
                              {(option.logistics as any).carbonEmissions?.toFixed(1) ?? "N/A"} tons
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {shippingComparison.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  Select regions to compare shipping methods
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cost Breakdown Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Supply Chain Cost Summary</CardTitle>
              <CardDescription>Breakdown of all material, shipping, tariff, and holding costs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  label="Total Material Cost"
                  value={formatCurrency(inventory.reduce((sum: number, inv: MaterialInventory) => sum + (inv.averageCost * inv.quantity), 0))}
                  icon={<Package className="h-5 w-5" />}
                  trend="neutral"
                />
                <StatCard
                  label="Active Orders Value"
                  value={formatCurrency(activeOrders.reduce((sum: number, o: MaterialOrder) => sum + o.totalCost, 0))}
                  icon={<ShoppingCart className="h-5 w-5" />}
                  trend="neutral"
                />
                <StatCard
                  label="Factory Region"
                  value={teamRegion}
                  icon={<MapPin className="h-5 w-5" />}
                  trend="neutral"
                />
                <StatCard
                  label="FX Exposure"
                  value={teamRegion === "North America" ? "Domestic" : "Foreign"}
                  icon={<Globe className="h-5 w-5" />}
                  trend={teamRegion === "North America" ? "neutral" : "down"}
                />
              </div>

              {/* Shipping + Tariff totals from active orders */}
              {activeOrders.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="p-4">
                    <div className="text-sm text-muted-foreground">Total Shipping Costs</div>
                    <div className="text-2xl font-bold mt-1">
                      {formatCurrency(activeOrders.reduce((sum: number, o: MaterialOrder) => sum + o.shippingCost, 0))}
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-sm text-muted-foreground">Total Tariff Costs</div>
                    <div className="text-2xl font-bold mt-1 text-orange-500">
                      {formatCurrency(activeOrders.reduce((sum: number, o: MaterialOrder) => sum + o.tariffCost, 0))}
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-sm text-muted-foreground">Holding Cost (Inventory)</div>
                    <div className="text-2xl font-bold mt-1">
                      {formatCurrency(inventoryValue * 0.02)}
                    </div>
                    <div className="text-xs text-muted-foreground">~2% of inventory value per round</div>
                  </Card>
                </div>
              )}

              {/* Cost Breakdown by Order */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Cost Breakdown by Order</CardTitle>
                </CardHeader>
                <CardContent>
                  {activeOrders.length === 0 ? (
                    <div className="text-center text-muted-foreground py-4">No active orders to summarize</div>
                  ) : (
                    <div className="space-y-2">
                      {activeOrders.map((order: MaterialOrder, idx: number) => (
                        <div key={idx} className="flex justify-between items-center py-2 border-b last:border-0">
                          <div>
                            <span className="font-medium capitalize">{order.materialType}</span>
                            <span className="text-muted-foreground ml-2">x{formatNumber(order.quantity)}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{formatCurrency(order.totalCost)}</div>
                            <div className="text-xs text-muted-foreground">ETA Round {order.estimatedArrivalRound}</div>
                          </div>
                        </div>
                      ))}
                      {/* Grand total row */}
                      <div className="flex justify-between items-center py-3 border-t-2 font-bold">
                        <div>Total Supply Chain Costs</div>
                        <div className="text-primary">
                          {formatCurrency(
                            inventory.reduce((sum: number, inv: MaterialInventory) => sum + (inv.averageCost * inv.quantity), 0) +
                            activeOrders.reduce((sum: number, o: MaterialOrder) => sum + o.totalCost, 0) +
                            inventoryValue * 0.02
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Material orders are submitted directly via API - no decision bar needed */}
    </div>
  );
}
