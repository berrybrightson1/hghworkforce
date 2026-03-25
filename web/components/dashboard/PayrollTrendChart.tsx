"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TrendData {
  month: string;
  gross: number;
  net: number;
  deductions: number;
}

export function PayrollTrendChart({ data }: { data: TrendData[] }) {
  const formatCurrency = (value: number) => {
    return value.toLocaleString("en-GH", {
      notation: "compact",
      compactDisplay: "short",
    });
  };

  return (
    <Card className="h-[400px]">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Payroll Cost Trend (GHS)</CardTitle>
      </CardHeader>
      <CardContent className="h-[320px] pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              tickFormatter={formatCurrency}
            />
            <Tooltip
              cursor={{ fill: "#f8fafc" }}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                fontSize: "12px",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
              formatter={(val) => [
                "GHS " + (typeof val === "number" ? val.toLocaleString() : String(val ?? "")),
                "",
              ]}
            />
            <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: "20px" }} iconType="circle" iconSize={8} />
            <Bar dataKey="gross" fill="#0f172a" name="Gross Pay" radius={[4, 4, 0, 0]} />
            <Bar dataKey="net" fill="#f59e0b" name="Net Pay" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
