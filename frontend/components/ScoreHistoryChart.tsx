"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { EpdsSubmission } from "@/lib/api";

interface ScoreHistoryChartProps {
  submissions: EpdsSubmission[];
  threshold: number;
}

export default function ScoreHistoryChart({
  submissions,
  threshold,
}: ScoreHistoryChartProps) {
  // recharts expects data in chronological order
  const chartData = [...submissions]
    .reverse()
    .map((s) => ({
      date: s.date ? new Date(s.date).toLocaleDateString() : "—",
      score: s.score,
      risk: s.risk,
    }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={[0, 30]}
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
          width={28}
        />
        <Tooltip
          contentStyle={{
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          formatter={(value: number) => [`${value}/30`, "Score"]}
        />
        <ReferenceLine
          y={threshold}
          stroke="#f87171"
          strokeDasharray="6 3"
          label={{ value: `Threshold (${threshold})`, position: "right", fontSize: 11, fill: "#f87171" }}
        />
        <Line
          type="monotone"
          dataKey="score"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ fill: "#3b82f6", r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
