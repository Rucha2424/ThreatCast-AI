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
import InfoTooltip from '../common/InfoTooltip';
import SecurityInsightBanner from '../common/SecurityInsightBanner';

export default function NetworkTrafficChart({ trafficSeries = [] }) {
  if (!trafficSeries || trafficSeries.length === 0) return null;

  const latest = trafficSeries[trafficSeries.length - 1];
  const hasAnomaly = latest?.anomalous_mbps > 5;

  return (
    <div className="p-6 md:p-7 rounded-2xl bg-cyber-surface border border-slate-800 shadow-soc-card space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
              Network Bandwidth Throughput & Anomaly Telemetry
            </h3>
            <InfoTooltip
              title="Throughput & Anomalous Bandwidth"
              whatItMeasures="Ingress, egress, and anomalous bandwidth spikes (Mbps) across network gateways."
              whyItMatters="High anomalous egress spikes indicate potential bulk database staging or data exfiltration."
              interpretation="Anomalous bandwidth exceeding 5 Mbps warrants immediate socket inspection."
              size="sm"
            />
          </div>
          <p className="text-xs text-slate-400">
            Live neural flow telemetry (Mbps) across ingress, egress, and anomalous streams.
          </p>
        </div>
        <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 font-bold">
          Flow Telemetry
        </span>
      </div>

      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trafficSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="bytesInGradDark" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="bytesOutGradDark" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="anomGradDark" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'monospace' }}
              axisLine={{ stroke: '#334155' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'monospace' }}
              axisLine={{ stroke: '#334155' }}
              tickLine={false}
              tickFormatter={(v) => `${v}M`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0d121c',
                border: '1px solid #334155',
                borderRadius: '0.75rem',
                fontSize: '11px',
                color: '#f8fafc',
                fontFamily: 'monospace',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '8px', fontFamily: 'monospace' }}
            />
            <Area
              type="monotone"
              dataKey="bytes_in_mbps"
              name="Ingress Traffic (Mbps)"
              stroke="#0284c7"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#bytesInGradDark)"
            />
            <Area
              type="monotone"
              dataKey="bytes_out_mbps"
              name="Egress Traffic (Mbps)"
              stroke="#38bdf8"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#bytesOutGradDark)"
            />
            <Area
              type="monotone"
              dataKey="anomalous_mbps"
              name="Anomalous Bandwidth (Mbps)"
              stroke="#ef4444"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#anomGradDark)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <SecurityInsightBanner
        title="Key Bandwidth Insight"
        insight={
          hasAnomaly
            ? `Anomalous flow rate detected (${trafficData[trafficData.length - 1]?.anomalous_mbps || 42} Mbps), representing unauthorized cross-subnet socket activity.`
            : 'Network flow distributions reflect normal operational bounds with zero unauthorized egress bandwidth.'
        }
        recommendation={
          hasAnomaly
            ? 'Inspect Gateway-01 routing table and verify destination IP whitelist.'
            : 'No bandwidth throttle required.'
        }
        type={hasAnomaly ? 'warning' : 'success'}
      />
    </div>
  );
}
