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
    <div className="p-6 md:p-7 rounded-2xl bg-white border border-[#ebdcc7] shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[#221207] tracking-tight">
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
          <p className="text-xs text-[#7a644c]">
            Kerberos/NTLM logins, failed authentication attempts, and elevated token spawns.
          </p>
        </div>
        <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-[#fef3c7] text-[#b45309] border border-[#fde68a] font-bold">
          IAM Telemetry
        </span>
      </div>

      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={authSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
            <Bar
              dataKey="successful_logins"
              name="Successful Auth"
              fill="#65A30D"
              radius={[4, 4, 0, 0]}
              stackId="a"
            />
            <Bar
              dataKey="failed_logins"
              name="Failed Attempts"
              fill="#D97706"
              radius={[4, 4, 0, 0]}
              stackId="a"
            />
            <Bar
              dataKey="privilege_escalations"
              name="Privilege Escalations"
              fill="#EA580C"
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
