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
    <div className="p-6 md:p-7 rounded-2xl bg-gradient-to-br from-cyber-maroon-950 via-cyber-black to-cyber-burgundy-950 border border-cyber-maroon-800 shadow-2xl space-y-4 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight">
            Authentication Activity & Privilege Escalation Events
          </h3>
          <p className="text-xs text-cyber-grey-400">
            Kerberos/NTLM logins, failed authentication attempts, and elevated token spawns.
          </p>
        </div>
        <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-cyber-maroon-900 text-rose-300 border border-cyber-maroon-700 font-bold">
          IAM Telemetry
        </span>
      </div>

      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={authSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#260817" vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 11, fill: '#94A3B8', fontFamily: 'monospace' }}
              axisLine={{ stroke: '#340b20' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#94A3B8', fontFamily: 'monospace' }}
              axisLine={{ stroke: '#340b20' }}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#12030a',
                border: '1px solid #6e1644',
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
            <Bar
              dataKey="successful_logins"
              name="Successful Auth"
              fill="#10B981"
              radius={[4, 4, 0, 0]}
              stackId="a"
            />
            <Bar
              dataKey="failed_logins"
              name="Failed Attempts"
              fill="#F59E0B"
              radius={[4, 4, 0, 0]}
              stackId="a"
            />
            <Bar
              dataKey="privilege_escalations"
              name="Privilege Escalations"
              fill="#F43F5E"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
