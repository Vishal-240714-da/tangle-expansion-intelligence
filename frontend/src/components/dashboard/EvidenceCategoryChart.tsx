import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';

interface EvidenceCategoryChartProps {
  categories: Record<string, number>;
  totalEvidence: number;
  verifiedLocal: number;
  globalOnly: number;
}

export const EvidenceCategoryChart: React.FC<EvidenceCategoryChartProps> = ({
  categories,
  totalEvidence,
  verifiedLocal,
  globalOnly,
}) => {
  const data = Object.entries(categories).map(([name, count]) => ({
    name,
    count,
  }));

  const colors = ['#4f46e5', '#0ea5e9', '#0d9488', '#8b5cf6', '#f59e0b', '#ec4899'];

  const verifiedLocalPercent = totalEvidence > 0 ? Math.round((verifiedLocal / totalEvidence) * 100) : 0;

  return (
    <div className="card h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h4 className="text-sm font-bold text-slate-900 tracking-tight">
              Evidence Category Coverage
            </h4>
            <p className="text-xs text-slate-500">Distribution of affinity and cultural signals</p>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono font-bold text-slate-900">{totalEvidence}</span>
            <span className="text-[11px] text-slate-500 block">Total Signals</span>
          </div>
        </div>

        {/* Local vs Global ratio bar */}
        <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200/60">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-medium text-slate-700">Geographic Specificity Ratio</span>
            <span className="font-mono font-bold text-emerald-700">
              {verifiedLocalPercent}% Local ({verifiedLocal}/{totalEvidence})
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden flex">
            <div
              className="bg-emerald-500 h-full transition-all duration-300"
              style={{ width: `${verifiedLocalPercent}%` }}
              title={`Verified Local: ${verifiedLocal}`}
            />
            <div
              className="bg-sky-400 h-full transition-all duration-300"
              style={{ width: `${100 - verifiedLocalPercent}%` }}
              title={`Global Signals: ${globalOnly}`}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Verified Local: {verifiedLocal}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              Global Only: {globalOnly}
            </span>
          </div>
        </div>

        {/* Category Bar Chart */}
        <div className="mt-5 h-48 w-full">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#475569' }}
                  width={110}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(0, 0, 0, 0.03)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-slate-900 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg">
                          <span className="font-semibold">{payload[0].payload.name}: </span>
                          <span className="font-mono text-brand-300">{payload[0].value} signals</span>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={16}>
                  {data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              No category signals available
            </div>
          )}
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span>Signal Provenance: Qloo Insights & Local Curations</span>
        <span className="font-mono text-[10px]">VERIFIED TELEMETRY</span>
      </div>
    </div>
  );
};
