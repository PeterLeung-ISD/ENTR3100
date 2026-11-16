"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useLocale } from "@/lib/LocaleProvider";
import type { EvaluationDimensions } from "@/types/simulation";

interface CompetencyRadarProps {
  dimensions: EvaluationDimensions;
}

/** 以 key 為 id，顯示名稱一律取自字典（與報告頁清單用同一組字）。 */
const AXIS_KEYS = [
  "criticalVerification",
  "pressureResilience",
  "crossReferencing",
  "upwardCommunication",
] as const satisfies readonly (keyof EvaluationDimensions)[];

/** Institutional Light 圖表色：鈷藍資料、淺灰格線、石板灰標籤。 */
const CHART = {
  data: "#2563eb",
  grid: "#e2e8f0",
  axis: "#475569",
  tick: "#94a3b8",
  surface: "#ffffff",
  hair: "#e2e8f0",
  text: "#0f172a",
} as const;

export default function CompetencyRadar({ dimensions }: CompetencyRadarProps) {
  const { c } = useLocale();
  const t = c.report;

  const data = AXIS_KEYS.map((key) => ({
    axis: t.dimensions[key],
    score: Math.round(dimensions[key]),
    fullMark: 100,
  }));

  const summary = data.map((item) => `${item.axis} ${item.score}`).join(" · ");

  return (
    <div
      className="h-[280px] w-full"
      role="img"
      aria-label={`${t.radar.title}: ${summary}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke={CHART.grid} />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fill: CHART.axis, fontSize: 12, fontWeight: 500 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tickCount={5}
            tick={{ fill: CHART.tick, fontSize: 9 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: CHART.surface,
              border: `1px solid ${CHART.hair}`,
              borderRadius: 8,
              fontSize: 12,
              color: CHART.text,
              boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
            }}
            labelStyle={{ color: CHART.text, fontWeight: 600 }}
            formatter={(value) => [`${value} / 100`, t.radar.score]}
          />
          <Radar
            name={t.radar.seriesName}
            dataKey="score"
            stroke={CHART.data}
            strokeWidth={2}
            fill={CHART.data}
            fillOpacity={0.25}
            dot={{ r: 3, fill: CHART.data, strokeWidth: 0 }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DimensionBars({ dimensions }: CompetencyRadarProps) {
  const { c } = useLocale();
  const t = c.report;

  return (
    <div className="space-y-2.5">
      {AXIS_KEYS.map((key) => {
        const value = Math.round(dimensions[key]);
        const tone =
          value >= 75
            ? "bg-unlocked"
            : value >= 55
              ? "bg-cobalt"
              : value >= 40
                ? "bg-warn"
                : "bg-critical";
        return (
          <div key={key}>
            <div className="flex items-baseline justify-between gap-3 text-[11px]">
              <span className="text-navy">{t.dimensions[key]}</span>
              <span className="tabular-telemetry font-semibold text-navy">{value}</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-hair">
              <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(2, value)}%` }} />
            </div>
            <div className="mt-0.5 text-[9px] text-muted">
              {t.radar.focusPrefix}
              {t.dimensions.focus[key]}
            </div>
          </div>
        );
      })}
    </div>
  );
}
