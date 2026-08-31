import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export default function NetworkTrafficChart({ trafficSeries = [] }) {
  if (!trafficSeries || trafficSeries.length === 0) return null;

  return (
    <div className="p-6 md:p-7 rounded-2xl bg-white border border-[#ebdcc7] shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-[#221207] tracking-tight">
            Network Bandwidth Throughput & Anomaly Telemetry
          </h3>
          <p className="text-xs text-[#7a644c]">
            Live neural flow telemetry (Mbps) across ingress, egress, and anomalous streams.
          </p>
        </div>
        <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-[#fef3c7] text-[#b45309] border border-[#fde68a] font-bold">
          Flow Telemetry
        </span>
      </div>

      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trafficSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="bytesInGradLight" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#cbab83" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#cbab83" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="bytesOutGradLight" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#d97706" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#d97706" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="anomGradLight" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ea580c" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#ea580c" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f5efe6" vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 11, fill: '#7a644c', fontFamily: 'monospace' }}
              axisLine={{ stroke: '#ded0bc' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#7a644c', fontFamily: 'monospace' }}
              axisLine={{ stroke: '#ded0bc' }}
              tickLine={false}
              tickFormatter={(v) => `${v}M`}
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
            <Area
              type="monotone"
              dataKey="bytes_in_mbps"
              name="Ingress Traffic"
              stroke="#a37a58"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#bytesInGradLight)"
            />
            <Area
              type="monotone"
              dataKey="bytes_out_mbps"
              name="Egress Traffic"
              stroke="#d97706"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#bytesOutGradLight)"
            />
            <Area
              type="monotone"
              dataKey="anomalous_mbps"
              name="Anomalous Bandwidth"
              stroke="#ea580c"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#anomGradLight)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
