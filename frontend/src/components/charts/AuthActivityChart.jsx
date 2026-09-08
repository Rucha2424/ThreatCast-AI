import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import InfoTooltip from '../common/InfoTooltip';
import SecurityInsightBanner from '../common/SecurityInsightBanner';

export default function AuthActivityChart({ authSeries = [] }) {
  if (!authSeries || authSeries.length === 0) return null;

  const totalEscalations = authSeries.reduce((acc, curr) => acc + (curr.privilege_escalations || 0), 0);

  return (
    <div className="p-6 md:p-7 rounded-2xl bg-cyber-surface border border-slate-800 shadow-soc-card space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
              Authentication Activity & Privilege Escalation Events
            </h3>
            <InfoTooltip
              title="IAM & Authentication Activity"
              whatItMeasures="Successful logins, failed auth spikes, and elevated token impersonation events."
              whyItMatters="Adversaries rely on credential dumping and token manipulation to jump across accounts."
              interpretation="Spikes in privilege escalations are a strong indicator of an active credential theft attack."
              size="sm"
            />
          </div>
          <p className="text-xs text-slate-400">
            Kerberos/NTLM logins, failed authentication attempts, and elevated token spawns.
          </p>
        </div>
        <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 font-bold">
          IAM Telemetry
        </span>
      </div>

      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={authSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
            <Bar
              dataKey="successful_logins"
              name="Successful Auth"
              fill="#10b981"
              radius={[4, 4, 0, 0]}
              stackId="a"
            />
            <Bar
              dataKey="failed_logins"
              name="Failed Attempts"
              fill="#f59e0b"
              radius={[4, 4, 0, 0]}
              stackId="a"
            />
            <Bar
              dataKey="privilege_escalations"
              name="Privilege Escalations"
              fill="#ef4444"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <SecurityInsightBanner
        title="Key IAM Insight"
        insight={
          totalEscalations > 0
            ? `${totalEscalations} anomalous privilege escalation events observed in recent windows, indicating process token impersonation attempts.`
            : 'Authentication volume matches expected operational shift patterns with normal success ratios.'
        }
        recommendation={
          totalEscalations > 0
            ? 'Revoke active Kerberos TGT tickets for affected accounts and enforce LSA protection.'
            : 'No account lockdowns required.'
        }
        type={totalEscalations > 0 ? 'warning' : 'success'}
      />
    </div>
  );
}
