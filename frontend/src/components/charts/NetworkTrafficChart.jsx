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
    <div className="p-6 md:p-7 rounded-2xl bg-threatcast-card border border-tc-border shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-threatcast-text tracking-tight">
            Network Bandwidth Throughput & Anomaly Telemetry
          </h3>
          <p className="text-xs text-threatcast-muted">
            Live neural flow telemetry (Mbps) across ingress, egress, and anomalous streams.
          </p>
        </div>
        <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-threatcast-elevated text-threatcast-cyan border border-threatcast-amber font-bold">
          Flow Telemetry
        </span>
      </div>

      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trafficSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="bytesInGradLight" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--tc-muted)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="var(--tc-muted)" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="bytesOutGradLight" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--tc-cyan)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="var(--tc-cyan)" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="anomGradLight" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--tc-amber)" stopOpacity={0.5} />
                <stop offset="95%" stopColor="var(--tc-amber)" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--tc-card-elevated)" vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 11, fill: 'var(--tc-muted)', fontFamily: 'monospace' }}
              axisLine={{ stroke: 'var(--tc-border)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--tc-muted)', fontFamily: 'monospace' }}
              axisLine={{ stroke: 'var(--tc-border)' }}
              tickLine={false}
              tickFormatter={(v) => `${v}M`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--tc-text)',
                border: '1px solid var(--tc-border)',
                borderRadius: '0.75rem',
                fontSize: '11px',
                color: 'var(--tc-text)',
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
              stroke="var(--tc-muted)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#bytesInGradLight)"
            />
            <Area
              type="monotone"
              dataKey="bytes_out_mbps"
              name="Egress Traffic"
              stroke="var(--tc-cyan)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#bytesOutGradLight)"
            />
            <Area
              type="monotone"
              dataKey="anomalous_mbps"
              name="Anomalous Bandwidth"
              stroke="var(--tc-amber)"
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
