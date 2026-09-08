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
import InfoTooltip from '../common/InfoTooltip';
import SecurityInsightBanner from '../common/SecurityInsightBanner';

const DEFAULT_RISK = [
  { time: '15:10', risk_score: 32, threat_events: 2 },
  { time: '15:15', risk_score: 40, threat_events: 4 },
  { time: '15:20', risk_score: 55, threat_events: 7 },
  { time: '15:25', risk_score: 72, threat_events: 11 },
  { time: '15:30', risk_score: 84, threat_events: 15 },
  { time: '15:35', risk_score: 92, threat_events: 20 },
];

export default function RiskTrendChart({ riskTrend }) {
  const data = riskTrend && riskTrend.length > 0 ? riskTrend : DEFAULT_RISK;
  const latest = data[data.length - 1];
  const isElevated = latest?.risk_score > 60;

  return (
    <div className="p-6 md:p-7 rounded-2xl bg-cyber-surface border border-slate-800 shadow-soc-card space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Temporal Network Risk Score & Threat Count
            </h3>
            <InfoTooltip
              title="Temporal Risk Score Evolution"
              whatItMeasures="Rolling network risk index (0-100) and correlated threat event counts over time."
              whyItMatters="Shows whether active threat mitigation is lowering exposure or if adversary activity is escalating."
              interpretation="Upward slopes indicate active lateral spread or staging."
              size="sm"
            />
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Aggregated threat score evolution over neural observation windows.
          </p>
        </div>
        <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 font-bold">
          Risk Dynamics
        </span>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 12, fill: '#94a3b8', fontFamily: 'monospace' }}
              axisLine={{ stroke: '#334155' }}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              domain={[0, 100]}
              tick={{ fontSize: 12, fill: '#94a3b8', fontFamily: 'monospace' }}
              axisLine={{ stroke: '#334155' }}
              tickLine={false}
              tickFormatter={(v) => `${v}`}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 40]}
              tick={{ fontSize: 12, fill: '#94a3b8', fontFamily: 'monospace' }}
              axisLine={{ stroke: '#334155' }}
              tickLine={false}
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
            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '8px', fontFamily: 'monospace' }}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="risk_score"
              name="Composite Risk Score (0-100)"
              stroke="#ef4444"
              strokeWidth={3}
              dot={{ r: 4, fill: '#ef4444' }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="threat_events"
              name="Threat Events Count"
              stroke="#38bdf8"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={{ r: 3, fill: '#38bdf8' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <SecurityInsightBanner
        title="Key Risk Takeaway"
        insight={
          isElevated
            ? `Risk score is currently elevated at ${latest?.risk_score || 82}/100 with ${latest?.threat_events || 4} active threat events in the latest window.`
            : 'Network risk score remains within controlled baseline thresholds with low anomalous event frequency.'
        }
        recommendation={
          isElevated
            ? 'Execute proactive isolation on high-risk nodes to bend the risk curve downward.'
            : 'Maintain continuous temporal baseline monitoring.'
        }
        type={isElevated ? 'warning' : 'success'}
      />
    </div>
  );
}
