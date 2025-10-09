"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Flex } from "@/components/ui/flex";
import { Heading, Text } from "@/components/ui/typography";

type AccountBalance = {
  category: string;
  label: string;
  amount: number;
};

type PortfolioPieChartProps = {
  balances: AccountBalance[];
  defiAmount: number;
};

const CATEGORY_COLORS: Record<string, string> = {
  defi: "#667eea",
  savings: "#10b981",
  stocks: "#3b82f6",
  crypto: "#f59e0b",
  "real-estate": "#8b5cf6",
  angel: "#ec4899",
  retirement: "#6366f1",
  cash: "#6b7280",
};

const CATEGORY_LABELS: Record<string, string> = {
  defi: "DeFi",
  savings: "Savings",
  stocks: "Stocks & ETFs",
  crypto: "Crypto",
  "real-estate": "Real Estate",
  angel: "Angel Investing",
  retirement: "Retirement",
  cash: "Cash",
};

export function PortfolioPieChart({ balances, defiAmount }: PortfolioPieChartProps) {
  // Group by category and sum amounts
  const categoryTotals: Record<string, number> = balances.reduce((acc, balance) => {
    acc[balance.category] = (acc[balance.category] || 0) + balance.amount;
    return acc;
  }, {} as Record<string, number>);

  // Add DeFi if there's any
  if (defiAmount > 0) {
    categoryTotals.defi = defiAmount;
  }

  // Calculate total
  const total = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);

  if (total === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Heading size="4" className="mb-4">Portfolio Allocation</Heading>
          <div className="text-center py-8">
            <Text color="gray">No portfolio data yet</Text>
            <Text size="1" color="gray" className="mt-1 block">
              Add accounts or make DeFi deposits to see your allocation
            </Text>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate percentages and create chart data
  const chartData = Object.entries(categoryTotals)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: (amount / total) * 100,
      color: CATEGORY_COLORS[category] || "#64748b",
      label: CATEGORY_LABELS[category] || category,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Calculate pie slices
  let currentAngle = 0;
  const slices = chartData.map((item) => {
    const sliceAngle = (item.percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    currentAngle = endAngle;

    // Calculate path for pie slice
    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (endAngle - 90) * (Math.PI / 180);

    const x1 = 50 + 40 * Math.cos(startRad);
    const y1 = 50 + 40 * Math.sin(startRad);
    const x2 = 50 + 40 * Math.cos(endRad);
    const y2 = 50 + 40 * Math.sin(endRad);

    const largeArc = sliceAngle > 180 ? 1 : 0;

    const pathData = [
      `M 50 50`,
      `L ${x1} ${y1}`,
      `A 40 40 0 ${largeArc} 1 ${x2} ${y2}`,
      `Z`
    ].join(' ');

    return {
      ...item,
      pathData,
    };
  });

  return (
    <Card>
      <CardContent className="pt-6">
        <Heading size="4" className="mb-1">Portfolio Allocation</Heading>
        <Text size="2" color="gray" className="mb-6 block">
          Total: ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-full max-w-[280px]">
            {slices.map((slice, i) => (
              <g key={i}>
                <path
                  d={slice.pathData}
                  fill={slice.color}
                  stroke="white"
                  strokeWidth="0.5"
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                >
                  <title>{slice.label}: ${slice.amount.toLocaleString()} ({slice.percentage.toFixed(1)}%)</title>
                </path>
              </g>
            ))}
            {/* Center circle for donut effect */}
            <circle cx="50" cy="50" r="25" fill="white" />
            <text
              x="50"
              y="48"
              textAnchor="middle"
              className="text-xs font-semibold"
              fill="#374151"
            >
              Total
            </text>
            <text
              x="50"
              y="55"
              textAnchor="middle"
              className="text-xs font-bold"
              fill="#111827"
            >
              ${(total / 1000).toFixed(1)}k
            </text>
          </svg>
        </div>

        {/* Legend */}
        <div className="space-y-2">
          {chartData.map((item, i) => (
            <Flex key={i} align="center" justify="between" className="p-2 rounded hover:bg-gray-50 transition">
              <Flex align="center" gap="2">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <Text size="2">{item.label}</Text>
              </Flex>
              <Flex align="center" gap="3">
                <Text size="2" weight="bold">
                  ${item.amount.toLocaleString()}
                </Text>
                <Text size="1" color="gray" style={{ minWidth: "40px", textAlign: "right" }}>
                  {item.percentage.toFixed(1)}%
                </Text>
              </Flex>
            </Flex>
          ))}
        </div>
      </div>
      </CardContent>
    </Card>
  );
}
