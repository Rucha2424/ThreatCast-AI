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

const DEFAULT_TRAFFIC = [
  { time: '15:10', bytes_in_mbps: 115.0, bytes_out_mbps: 98.2, anomalous_mbps: 2.1 },
  { time: '15:15', bytes_in_mbps: 122.4, bytes_out_mbps: 105.0, anomalous_mbps: 3.4 },
  { time: '15:20', bytes_in_mbps: 140.8, bytes_out_mbps: 128.5, anomalous_mbps: 4.8 },
  { time: '15:25', bytes_in_mbps: 155.0, bytes_out_mbps: 142.0, anomalous_mbps: 8.2 },
  { time: '15:30', bytes_in_mbps: 178.2, bytes_out_mbps: 195.4, anomalous_mbps: 24.5 },
  { time: '15:35', bytes_in_mbps: 185.0, bytes_out_mbps: 210.0, anomalous_mbps: 42.0 },
];

export default function NetworkTrafficChart({ trafficSeries }) {
  const data = trafficSeries && trafficSeries.length > 0 ? trafficSeries : DEFAULT_TRAFFIC;
  const latest = data[data.length - 1];
  const hasAnomaly = latest?.anomalous_mbps > 5;

  return (
    <div className="p-6 md:p-7 rounded-2xl bg-cyber-surface border border-slate-800 shadow-soc-card space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
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
          <p className="text-xs sm:text-sm text-slate-400">
            Live neural flow telemetry (Mbps) across ingress, egress, and anomalous streams.
          </p>
        </div>
        <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 font-bold">
          Flow Telemetry
        </span>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 12, fill: '#94a3b8', fontFamily: 'monospace' }}
              axisLine={{ stroke: '#334155' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#94a3b8', fontFamily: 'monospace' }}
              axisLine={{ stroke: '#334155' }}
              tickLine={false}
              tickFormatter={(v) => `${v}M`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0d121c',
                border: '1px solid #334155',
                borderRadius: '0.75rem',
                fontSize: '12px',
                color: '#f8fafc',
                fontFamily: 'monospace',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
            <Area
              type="monotone"
              dataKey="bytes_in_mbps"
              name="Ingress Bandwidth (Mbps)"
              stroke="#0284c7"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#bytesInGradDark)"
            />
            <Area
              type="monotone"
              dataKey="bytes_out_mbps"
              name="Egress Bandwidth (Mbps)"
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
            ? `Anomalous flow rate detected (${latest?.anomalous_mbps || 42} Mbps), representing unauthorized cross-subnet socket activity.`
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
