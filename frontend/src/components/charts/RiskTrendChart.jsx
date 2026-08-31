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
    <div className="p-6 md:p-7 rounded-2xl bg-gradient-to-br from-cyber-brown-950 via-cyber-black to-cyber-amber-950 border border-cyber-brown-800 shadow-2xl space-y-4 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight">
            Temporal Network Risk Score & Threat Count
          </h3>
          <p className="text-xs text-cyber-beige-400">
            Aggregated threat score evolution over neural observation windows.
          </p>
        </div>
        <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-bold">
          Risk Dynamics
        </span>
      </div>

      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={riskTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#22140c" vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 11, fill: '#cbab83', fontFamily: 'monospace' }}
              axisLine={{ stroke: '#311c10' }}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: '#cbab83', fontFamily: 'monospace' }}
              axisLine={{ stroke: '#311c10' }}
              tickLine={false}
              tickFormatter={(v) => `${v}`}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 40]}
              tick={{ fontSize: 11, fill: '#cbab83', fontFamily: 'monospace' }}
              axisLine={{ stroke: '#311c10' }}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#120a05',
                border: '1px solid #78350f',
                borderRadius: '0.75rem',
                fontSize: '11px',
                color: '#fff',
                fontFamily: 'monospace',
                boxShadow: '0 0 20px rgba(0,0,0,0.8)',
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
              stroke="#F59E0B"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={{ r: 3, fill: '#F59E0B' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
