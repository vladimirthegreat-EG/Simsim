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
import { LogisticsEngine, SHIPPING_METHODS } from "@/engine/logistics";
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

export default function SupplyChainPage({ params }: PageProps) {
  const { gameId } = use(params);
  const [activeTab, setActiveTab] = useState("requirements");
  const [selectedSegment, setSelectedSegment] = useState<Segment>("General");
  const [selectedMaterialType, setSelectedMaterialType] = useState<MaterialType>("display");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [orderQuantity, setOrderQuantity] = useState<number>(10000);
  const [shippingMethod, setShippingMethod] = useState<"sea" | "air" | "land" | "rail">("sea");

  // Fetch live game state
  const { data: teamState, isLoading: teamStateLoading } = trpc.team.getMyState.useQuery();
  const { data: materialsState, isLoading: materialsLoading } = trpc.material.getMaterialsState.useQuery();

  // Extract state values with defaults
  const inventory = materialsState?.inventory ?? [];
  const activeOrders = materialsState?.activeOrders ?? [];
  const currentRound = teamState?.game.currentRound ?? 1;
  const teamRegion: Region = materialsState?.region ?? "North America";
  const cash = teamState?.cash ?? 0;

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

  // Show loading state
  if (teamStateLoading || materialsLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <PageHeader
          title="Supply Chain Management"
          subtitle="Source materials, manage suppliers, and optimize logistics"
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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="requirements">Material Requirements</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="order">Place Order</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="active-orders">Active Orders</TabsTrigger>
        </TabsList>

        {/* Material Requirements Tab */}
        <TabsContent value="requirements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Material Requirements by Segment</CardTitle>
              <CardDescription>
                View the complete material specifications needed for each phone segment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Segment Selector */}
                <div className="flex items-center gap-2">
                  <Label>Phone Segment:</Label>
                  <Select value={selectedSegment} onValueChange={(v) => setSelectedSegment(v as Segment)}>
                    <SelectTrigger className="w-[200px]">
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
                </div>

                {/* Segment Overview */}
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
                      <CardTitle className="text-sm font-medium">Quality Tier</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <div className="text-2xl font-bold">Tier {requirements.qualityTier}</div>
                        <Badge variant={requirements.qualityTier >= 4 ? "default" : "secondary"}>
                          {requirements.qualityTier >= 4 ? "Premium" : "Standard"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Material Breakdown */}
                <div className="space-y-2">
                  <SectionHeader title="Material Components" />
                  <div className="grid gap-3">
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
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Suppliers Tab */}
        <TabsContent value="suppliers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Supplier Directory</CardTitle>
              <CardDescription>
                Browse suppliers across all regions and compare their offerings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Material Type Filter */}
                <div className="flex items-center gap-2">
                  <Label>Material Type:</Label>
                  <Select
                    value={selectedMaterialType}
                    onValueChange={(v) => setSelectedMaterialType(v as MaterialType)}
                  >
                    <SelectTrigger className="w-[200px]">
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

                {/* Supplier Cards */}
                <div className="grid gap-4">
                  {availableSuppliers.map((supplier) => (
                    <Card key={supplier.id} className="p-4">
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

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">Reliability</div>
                            <div className="font-medium">{Math.round(supplier.onTimeDeliveryRate * 100)}%</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Defect Rate</div>
                            <div className="font-medium">{(supplier.defectRate * 100).toFixed(2)}%</div>
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
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Place Order Tab */}
        <TabsContent value="order" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Place Material Order</CardTitle>
              <CardDescription>
                Configure your order and compare costs with different shipping options
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Order Configuration */}
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Material Type</Label>
                      <Select
                        value={selectedMaterialType}
                        onValueChange={(v) => {
                          setSelectedMaterialType(v as MaterialType);
                          setSelectedSupplier("");
                        }}
                      >
                        <SelectTrigger>
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

                    <div className="space-y-2">
                      <Label>Supplier</Label>
                      <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select supplier" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableSuppliers.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name} ({s.region})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

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
                </div>

                {/* Order Preview */}
                {orderPreview && supplierDetails && (
                  <Card className="bg-muted/50">
                    <CardHeader>
                      <CardTitle className="text-lg">Order Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
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
                    Select a supplier to see order preview
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Material Inventory</CardTitle>
              <CardDescription>
                Current stock levels and inventory valuation
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
                  {inventory.map((item, idx) => (
                    <Card key={idx} className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium capitalize">{item.materialType}</div>
                          <div className="text-sm text-muted-foreground">{item.spec}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{formatNumber(item.quantity)} units</div>
                          <div className="text-sm text-muted-foreground">
                            Avg Cost: {formatCurrency(item.averageCost)}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Orders Tab */}
        <TabsContent value="active-orders" className="space-y-4">
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
                  {activeOrders.map((order) => (
                    <Card key={order.id} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium capitalize">{order.materialType}</div>
                            <div className="text-sm text-muted-foreground">{order.spec}</div>
                          </div>
                          <Badge
                            variant={
                              order.status === "delivered"
                                ? "default"
                                : order.status === "delayed"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {order.status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">Quantity</div>
                            <div className="font-medium">{formatNumber(order.quantity)}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">ETA</div>
                            <div className="font-medium">Round {order.estimatedArrivalRound}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Total Cost</div>
                            <div className="font-medium">{formatCurrency(order.totalCost)}</div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Material orders are submitted directly via API - no decision bar needed */}
    </div>
  );
}
