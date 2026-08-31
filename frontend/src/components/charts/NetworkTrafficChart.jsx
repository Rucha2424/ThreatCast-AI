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
    <div className="p-6 md:p-7 rounded-2xl bg-gradient-to-br from-cyber-brown-950 via-cyber-black to-cyber-amber-950 border border-cyber-brown-800 shadow-2xl space-y-4 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight">
            Network Bandwidth Throughput & Anomaly Telemetry
          </h3>
          <p className="text-xs text-cyber-beige-400">
            Live neural flow telemetry (Mbps) across ingress, egress, and anomalous streams.
          </p>
        </div>
        <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-cyber-brown-900 text-amber-300 border border-cyber-brown-700 font-bold">
          Flow Telemetry
        </span>
      </div>

      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trafficSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="bytesInGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#cbab83" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#cbab83" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="bytesOutGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#d97706" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#d97706" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="anomGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.65} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#22140c" vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 11, fill: '#cbab83', fontFamily: 'monospace' }}
              axisLine={{ stroke: '#311c10' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#cbab83', fontFamily: 'monospace' }}
              axisLine={{ stroke: '#311c10' }}
              tickLine={false}
              tickFormatter={(v) => `${v}M`}
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
            <Area
              type="monotone"
              dataKey="bytes_in_mbps"
              name="Ingress Traffic"
              stroke="#cbab83"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#bytesInGrad)"
            />
            <Area
              type="monotone"
              dataKey="bytes_out_mbps"
              name="Egress Traffic"
              stroke="#d97706"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#bytesOutGrad)"
            />
            <Area
              type="monotone"
              dataKey="anomalous_mbps"
              name="Anomalous Bandwidth"
              stroke="#f97316"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#anomGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
