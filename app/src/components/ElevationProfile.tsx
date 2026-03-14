import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export interface ElevationPoint {
  distanceKm: number;
  elevationM: number;
}

interface ElevationProfileProps {
  /** Route geometry coordinates as [lng, lat, elevation?][] */
  coordinates: number[][];
  onHover?: (index: number | null) => void;
}

export function ElevationProfile({ coordinates, onHover }: ElevationProfileProps) {
  const data = useMemo(() => {
    if (!coordinates || coordinates.length < 2) return [];

    const points: ElevationPoint[] = [];
    let cumulativeDistance = 0;

    for (let i = 0; i < coordinates.length; i++) {
      const coord = coordinates[i]!;
      const elevation = coord[2] ?? 0;

      if (i > 0) {
        const prev = coordinates[i - 1]!;
        cumulativeDistance += haversineKm(prev[1]!, prev[0]!, coord[1]!, coord[0]!);
      }

      points.push({
        distanceKm: Math.round(cumulativeDistance * 100) / 100,
        elevationM: Math.round(elevation),
      });
    }

    return points;
  }, [coordinates]);

  if (data.length < 2) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-neutral-500">
        No elevation data available
      </div>
    );
  }

  const minElevation = Math.min(...data.map((d) => d.elevationM));
  const maxElevation = Math.max(...data.map((d) => d.elevationM));
  const padding = Math.max(10, (maxElevation - minElevation) * 0.1);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={data}
        margin={{ top: 4, right: 8, bottom: 4, left: 0 }}
        onMouseMove={(state) => {
          const idx = state?.activeTooltipIndex;
          if (typeof idx === "number") {
            onHover?.(idx);
          }
        }}
        onMouseLeave={() => onHover?.(null)}
      >
        <defs>
          <linearGradient id="elevGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#2563eb" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="distanceKm"
          tick={{ fontSize: 10 }}
          tickFormatter={(v: number) => `${v.toFixed(1)}`}
          label={{ value: "km", position: "insideBottomRight", offset: -2, fontSize: 10 }}
        />
        <YAxis
          tick={{ fontSize: 10 }}
          domain={[minElevation - padding, maxElevation + padding]}
          tickFormatter={(v: number) => `${v}`}
          width={40}
          label={{ value: "m", position: "insideTopLeft", offset: -2, fontSize: 10 }}
        />
        <Tooltip
          formatter={(value) => [`${value} m`, "Elevation"]}
          labelFormatter={(label) => `${label} km`}
          contentStyle={{ fontSize: 12 }}
        />
        <Area
          type="monotone"
          dataKey="elevationM"
          stroke="#2563eb"
          strokeWidth={1.5}
          fill="url(#elevGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
