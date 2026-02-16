"use client";

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

interface FeatureScores {
  battery: number;
  camera: number;
  ai: number;
  durability: number;
  display: number;
  connectivity: number;
}

interface FeatureRadarChartProps {
  features: FeatureScores;
  segmentPreferences?: FeatureScores;
  compareFeatures?: FeatureScores;
  size?: number;
  label?: string;
}

const FEATURE_LABELS: Record<keyof FeatureScores, string> = {
  battery: "Battery",
  camera: "Camera",
  ai: "AI",
  durability: "Durability",
  display: "Display",
  connectivity: "Connectivity",
};

const FEATURE_KEYS: (keyof FeatureScores)[] = [
  "battery",
  "camera",
  "ai",
  "durability",
  "display",
  "connectivity",
];

interface RadarDataPoint {
  feature: string;
  product: number;
  segment?: number;
  compare?: number;
}

export function FeatureRadarChart({
  features,
  segmentPreferences,
  compareFeatures,
  size = 300,
  label,
}: FeatureRadarChartProps) {
  const data: RadarDataPoint[] = FEATURE_KEYS.map((key) => {
    const point: RadarDataPoint = {
      feature: FEATURE_LABELS[key],
      product: features[key],
    };

    if (segmentPreferences) {
      // Scale 0-1 weights to 0-100 for visual comparison
      point.segment = segmentPreferences[key] * 100;
    }

    if (compareFeatures) {
      point.compare = compareFeatures[key];
    }

    return point;
  });

  return (
    <div className="flex flex-col items-center">
      {label && (
        <h3 className="text-sm font-medium text-slate-300 mb-2">{label}</h3>
      )}
      <ResponsiveContainer width="100%" height={size}>
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#334155" />
          <PolarAngleAxis
            dataKey="feature"
            tick={{ fill: "#94a3b8", fontSize: 12 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: "#64748b", fontSize: 10 }}
            tickCount={5}
            stroke="#334155"
          />

          {/* Segment preferences - lightest layer, rendered first (behind) */}
          {segmentPreferences && (
            <Radar
              name="Segment Preference"
              dataKey="segment"
              stroke="#f59e0b"
              fill="#f59e0b"
              fillOpacity={0.1}
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          )}

          {/* Compare features - ghost overlay */}
          {compareFeatures && (
            <Radar
              name="Comparison"
              dataKey="compare"
              stroke="#94a3b8"
              fill="#94a3b8"
              fillOpacity={0.08}
              strokeWidth={1.5}
              strokeDasharray="6 3"
            />
          )}

          {/* Product features - primary layer, rendered last (on top) */}
          <Radar
            name="Product"
            dataKey="product"
            stroke="#8b5cf6"
            fill="#7c3aed"
            fillOpacity={0.25}
            strokeWidth={2}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "8px",
              color: "#f1f5f9",
            }}
            labelStyle={{ color: "#94a3b8", fontWeight: 600 }}
            formatter={(value: number, name: string) => {
              if (name === "Segment Preference") {
                return [`${(value / 100).toFixed(2)} weight`, name];
              }
              return [`${value}`, name];
            }}
          />

          <Legend
            wrapperStyle={{ paddingTop: "8px" }}
            formatter={(value: string) => (
              <span style={{ color: "#94a3b8", fontSize: 12 }}>{value}</span>
            )}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
