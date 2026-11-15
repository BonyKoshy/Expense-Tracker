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
      .map(([catId, amount]) => {
        const cat = categories.find((c) => c.id === catId);
        return {
          name: cat?.name || 'Other',
          amount: Math.round(amount * 100) / 100,
          color: cat?.color || '#6366f1',
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
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <div className="text-xs text-slate-400 font-medium">
            True Personal Expense
          </div>
          <div className="text-2xl font-bold text-white mt-1 font-mono">
            {formatINR(totalStats.personalSpend)}
          </div>
          <div className="text-[11px] text-emerald-400 mt-1">
            Excludes friend shares on shared bills
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <div className="text-xs text-slate-400 font-medium">
            Gross Outflow Swiped
          </div>
          <div className="text-2xl font-bold text-slate-200 mt-1 font-mono">
            {formatINR(totalStats.bulkSpend)}
          </div>
          <div className="text-[11px] text-amber-400 mt-1">
            Includes upfront group spending
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <div className="text-xs text-slate-400 font-medium">
            Friend Repayments Collected
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">
            {formatINR(totalStats.receivablesCollected)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Pure debt recoveries
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Category Breakdown Donut */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white m-0">
                Personal Spending by Category
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Exact personal share allocated per category
              </p>
            </div>
          </div>

          {categorySpendingData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-500 min-h-[220px]">
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
                            <div className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs shadow-xl">
                              <span className="font-semibold text-white">
                                {item.name}:
                              </span>{' '}
                              <span className="font-mono text-indigo-400 font-bold">
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
                      <span className="text-slate-300 truncate font-medium">
                        {entry.name}
                      </span>
                    </div>
                    <span className="font-mono text-white font-semibold">
                      {formatINR(entry.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Friend Receivables Bar Chart */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white m-0">
                Pending Friend Receivables
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Outstanding money owed across PG flatmates
              </p>
            </div>
          </div>

          {peopleReceivablesData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-500 min-h-[220px]">
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
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#64748b"
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
                          <div className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs shadow-xl">
                            <span className="font-semibold text-white">
                              {item.name}:
                            </span>{' '}
                            <span className="font-mono text-amber-400 font-bold">
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
                    fill="#f59e0b"
                    radius={[6, 6, 0, 0]}
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
