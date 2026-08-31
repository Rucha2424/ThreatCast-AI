import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export default function RiskTrendChart({ riskTrend = [] }) {
  if (!riskTrend || riskTrend.length === 0) return null;

  return (
    <div className="p-6 md:p-7 rounded-2xl bg-white border border-[#ebdcc7] shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-[#221207] tracking-tight">
            Temporal Network Risk Score & Threat Count
          </h3>
          <p className="text-xs text-[#7a644c]">
            Aggregated threat score evolution over neural observation windows.
          </p>
        </div>
        <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-[#fef3c7] text-[#b45309] border border-[#fde68a] font-bold">
          Risk Dynamics
        </span>
      </div>

      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={riskTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f5efe6" vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 11, fill: '#7a644c', fontFamily: 'monospace' }}
              axisLine={{ stroke: '#ded0bc' }}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: '#7a644c', fontFamily: 'monospace' }}
              axisLine={{ stroke: '#ded0bc' }}
              tickLine={false}
              tickFormatter={(v) => `${v}`}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 40]}
              tick={{ fontSize: 11, fill: '#7a644c', fontFamily: 'monospace' }}
              axisLine={{ stroke: '#ded0bc' }}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #ebdcc7',
                borderRadius: '0.75rem',
                fontSize: '11px',
                color: '#221207',
                fontFamily: 'monospace',
                boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '8px', fontFamily: 'monospace' }}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="risk_score"
              name="Composite Risk Score"
              stroke="#EA580C"
              strokeWidth={3}
              dot={{ r: 4, fill: '#EA580C' }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="threat_events"
              name="Threat Events"
              stroke="#D97706"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={{ r: 3, fill: '#D97706' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
