import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from 'recharts';
import type { Transaction, Category, Account, Person } from '@/types';
import { formatINR } from '@/utils/formatters';

interface AnalyticsViewProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  people: Person[];
}

// Material 3 Dark Theme Tonal Palette for Categories
const M3_TONAL_PALETTE = [
  '#a8c7fa', // M3 Primary Soft Blue
  '#ffb77c', // M3 Warm Ochre
  '#a8dab5', // M3 Sage Green
  '#d0bcff', // M3 Soft Lavender
  '#f2b8b5', // M3 Muted Coral
  '#bec6dc', // M3 Slate Blue
  '#ffdcc2', // M3 Peach
  '#c4eed0', // M3 Mint
];

export function AnalyticsView({
  transactions,
  categories,
  people,
}: AnalyticsViewProps) {
  // 1. Spending by Category (using personalExpenseAmount to avoid inflating personal expense with friend shares!)
  const categorySpendingData = useMemo(() => {
    const map = new Map<string, number>();

    for (const tx of transactions) {
      if (
        (tx.type === 'expense' || tx.type === 'shared_expense') &&
        tx.categoryId &&
        tx.personalExpenseAmount > 0
      ) {
        map.set(
          tx.categoryId,
          (map.get(tx.categoryId) || 0) + tx.personalExpenseAmount
        );
      }
    }

    return Array.from(map.entries())
      .map(([catId, amount], index) => {
        const cat = categories.find((c) => c.id === catId);
        return {
          name: cat?.name || 'Other',
          amount: Math.round(amount * 100) / 100,
          color: M3_TONAL_PALETTE[index % M3_TONAL_PALETTE.length],
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [transactions, categories]);

  // 2. Friend Receivables Distribution
  const peopleReceivablesData = useMemo(() => {
    return people
      .filter((p) => p.netBalance > 0)
      .map((p) => ({
        name: p.name,
        receivable: p.netBalance,
      }))
      .sort((a, b) => b.receivable - a.receivable);
  }, [people]);

  // 3. Total Personal Spending vs Bulk Bill Total
  const totalStats = useMemo(() => {
    let personalSpend = 0;
    let bulkSpend = 0;
    let receivablesCollected = 0;

    for (const tx of transactions) {
      if (tx.type === 'expense' || tx.type === 'shared_expense') {
        personalSpend += tx.personalExpenseAmount || 0;
        bulkSpend += tx.amount || 0;
      }
      if (tx.type === 'settlement_received') {
        receivablesCollected += tx.amount || 0;
      }
    }

    return { personalSpend, bulkSpend, receivablesCollected };
  }, [transactions]);

  return (
    <div className="space-y-4">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#1e2026] border border-[#2d3139] rounded-[24px] p-4">
          <div className="text-xs text-[#c4c6d0]">True Personal Spend</div>
          <div className="text-2xl font-normal text-[#e2e2e9] mt-1 font-mono">
            {formatINR(totalStats.personalSpend)}
          </div>
          <div className="text-[11px] text-[#a8dab5] mt-1">
            Excludes friend shares on shared bills
          </div>
        </div>

        <div className="bg-[#1e2026] border border-[#2d3139] rounded-[24px] p-4">
          <div className="text-xs text-[#c4c6d0]">Gross Swiped Upfront</div>
          <div className="text-2xl font-normal text-[#e2e2e9] mt-1 font-mono">
            {formatINR(totalStats.bulkSpend)}
          </div>
          <div className="text-[11px] text-[#ffb77c] mt-1">
            Includes group purchases
          </div>
        </div>

        <div className="bg-[#1e2026] border border-[#2d3139] rounded-[24px] p-4">
          <div className="text-xs text-[#c4c6d0]">Repayments Recovered</div>
          <div className="text-2xl font-normal text-[#a8dab5] mt-1 font-mono">
            {formatINR(totalStats.receivablesCollected)}
          </div>
          <div className="text-[11px] text-[#8e9099] mt-1">
            Pure balance settlements
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category Breakdown Donut */}
        <div className="bg-[#1e2026] border border-[#2d3139] rounded-[28px] p-5 flex flex-col">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-[#e2e2e9] m-0">
              Personal Spend by Category
            </h3>
            <p className="text-xs text-[#8e9099] mt-0.5">
              Exact personal share allocated per category
            </p>
          </div>

          {categorySpendingData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-xs text-[#8e9099] min-h-[220px]">
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
                      innerRadius={50}
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
                            <div className="bg-[#111318] border border-[#44474f] rounded-2xl p-2.5 text-xs shadow-xl">
                              <span className="font-medium text-[#e2e2e9]">
                                {item.name}:
                              </span>{' '}
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
                {categorySpendingData.slice(0, 5).map((entry, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-[#c4c6d0] truncate">
                        {entry.name}
                      </span>
                    </div>
                    <span className="font-mono text-[#e2e2e9] font-medium">
                      {formatINR(entry.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Friend Receivables Bar Chart */}
        <div className="bg-[#1e2026] border border-[#2d3139] rounded-[28px] p-5 flex flex-col">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-[#e2e2e9] m-0">
              Outstanding Friend Receivables
            </h3>
            <p className="text-xs text-[#8e9099] mt-0.5">
              Net balance owed across roommates
            </p>
          </div>

          {peopleReceivablesData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-xs text-[#8e9099] min-h-[220px]">
              No outstanding receivables from friends
            </div>
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={peopleReceivablesData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <XAxis
                    dataKey="name"
                    stroke="#8e9099"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#8e9099"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(v: number) => `₹${v}`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload as {
                          name: string;
                          receivable: number;
                        };
                        return (
                          <div className="bg-[#111318] border border-[#44474f] rounded-2xl p-2.5 text-xs shadow-xl">
                            <span className="font-medium text-[#e2e2e9]">
                              {item.name}:
                            </span>{' '}
                            <span className="font-mono text-[#ffb77c] font-semibold">
                              Owes {formatINR(item.receivable)}
                            </span>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="receivable"
                    fill="#a8c7fa"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
