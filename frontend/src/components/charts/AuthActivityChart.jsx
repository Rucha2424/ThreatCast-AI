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

export default function AuthActivityChart({ authSeries = [] }) {
  if (!authSeries || authSeries.length === 0) return null;

  return (
    <div className="p-6 md:p-7 rounded-2xl bg-threatcast-card border border-tc-border shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-threatcast-text tracking-tight">
            Authentication Activity & Privilege Escalation Events
          </h3>
          <p className="text-xs text-threatcast-muted">
            Kerberos/NTLM logins, failed authentication attempts, and elevated token spawns.
          </p>
        </div>
        <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-threatcast-elevated text-threatcast-cyan border border-threatcast-amber font-bold">
          IAM Telemetry
        </span>
      </div>

      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={authSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
            <Bar
              dataKey="successful_logins"
              name="Successful Auth"
              fill="var(--tc-green)"
              radius={[4, 4, 0, 0]}
              stackId="a"
            />
            <Bar
              dataKey="failed_logins"
              name="Failed Attempts"
              fill="var(--tc-cyan)"
              radius={[4, 4, 0, 0]}
              stackId="a"
            />
            <Bar
              dataKey="privilege_escalations"
              name="Privilege Escalations"
              fill="var(--tc-amber)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
