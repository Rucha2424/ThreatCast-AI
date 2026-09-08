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

const DEFAULT_AUTH = [
  { time: '15:10', successful_logins: 45, failed_logins: 4, privilege_escalations: 0 },
  { time: '15:15', successful_logins: 52, failed_logins: 6, privilege_escalations: 0 },
  { time: '15:20', successful_logins: 68, failed_logins: 14, privilege_escalations: 1 },
  { time: '15:25', successful_logins: 88, failed_logins: 28, privilege_escalations: 3 },
  { time: '15:30', successful_logins: 115, failed_logins: 45, privilege_escalations: 6 },
  { time: '15:35', successful_logins: 130, failed_logins: 58, privilege_escalations: 9 },
];

export default function AuthActivityChart({ authSeries }) {
  const data = authSeries && authSeries.length > 0 ? authSeries : DEFAULT_AUTH;
  const totalEscalations = data.reduce((acc, curr) => acc + (curr.privilege_escalations || 0), 0);

  return (
    <div className="p-6 md:p-7 rounded-2xl bg-cyber-surface border border-slate-800 shadow-soc-card space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
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
          <p className="text-xs sm:text-sm text-slate-400">
            Kerberos/NTLM logins, failed authentication attempts, and elevated token spawns.
          </p>
        </div>
        <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 font-bold">
          IAM Telemetry
        </span>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
            <Bar
              dataKey="successful_logins"
              name="Successful Logins"
              fill="#0ea5e9"
              radius={[4, 4, 0, 0]}
              stackId="a"
            />
            <Bar
              dataKey="failed_logins"
              name="Failed Login Attempts"
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
