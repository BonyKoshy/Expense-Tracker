import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { Transaction, Category } from "@/types";
import { formatINR } from "@/utils/formatters";

interface AnalyticsViewProps {
  transactions: Transaction[];
  categories: Category[];
}

// Android 17 / Material You Minimalist Pastel Palette (Tone 80 / Low Glare)
const ANDROID_17_PASTEL_PALETTE = [
  "#f3b791", // Soft Pastel Peach (Food)
  "#a8dab5", // Soft Pastel Sage (Groceries)
  "#d0bcff", // Soft Pastel Lavender (Housing/Rent)
  "#9fd3e6", // Soft Pastel Ice Cyan (Transport)
  "#eedc96", // Soft Pastel Buttercup (Shopping)
  "#e2b6e8", // Soft Pastel Orchid (Entertainment)
  "#f2b8b5", // Soft Pastel Coral (Debt/EMIs)
  "#a8c7fa", // Soft Pastel Sky (Financial Services)
  "#a1e5c0", // Soft Pastel Mint (Investments)
  "#bec6dc", // Soft Pastel Slate (General)
];

export function AnalyticsView({
  transactions,
  categories,
}: AnalyticsViewProps) {
  // 1. Spending by Category (using personalExpenseAmount to avoid inflating personal expense with friend shares!)
  const categorySpendingData = useMemo(() => {
    const map = new Map<string, number>();

    for (const tx of transactions) {
      if (
        (tx.type === "expense" || tx.type === "shared_expense") &&
        tx.categoryId &&
        tx.personalExpenseAmount > 0
      ) {
        map.set(
          tx.categoryId,
          (map.get(tx.categoryId) || 0) + tx.personalExpenseAmount,
        );
      }
    }

    return Array.from(map.entries())
      .map(([catId, amount], index) => {
        const cat = categories.find((c) => c.id === catId);
        return {
          name: cat?.name || "Other",
          amount: Math.round(amount * 100) / 100,
          color:
            cat?.color ||
            ANDROID_17_PASTEL_PALETTE[index % ANDROID_17_PASTEL_PALETTE.length],
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [transactions, categories]);

  return (
    <div className="bg-[#16171c] border border-[#23252c] rounded-[28px] p-5 flex flex-col">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-[#e2e2e7] m-0">
          Personal Spend by Category
        </h3>
        <p className="text-xs text-[#90929d] mt-0.5">
          Your personal share allocated per expense category
        </p>
      </div>

      {categorySpendingData.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-xs text-[#90929d] min-h-[220px]">
          No expense transactions recorded yet
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="h-56 w-full sm:w-1/2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categorySpendingData}
                  dataKey="amount"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {categorySpendingData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload as {
                        name: string;
                        amount: number;
                      };
                      return (
                        <div className="bg-[#111216] border border-[#23252c] rounded-2xl p-2.5 text-xs shadow-xl">
                          <span className="font-medium text-[#e2e2e7]">
                            {item.name}:
                          </span>{" "}
                          <span className="font-mono text-[#a8c7fa] font-semibold">
                            {formatINR(item.amount)}
                          </span>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend List */}
          <div className="w-full sm:w-1/2 space-y-2">
            {categorySpendingData.slice(0, 6).map((entry, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2 truncate">
                  <div
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-[#90929d] truncate">{entry.name}</span>
                </div>
                <span className="font-mono text-[#e2e2e7] font-medium">
                  {formatINR(entry.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
