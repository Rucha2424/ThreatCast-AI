import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { formatConfidence } from '../../utils/formatters';

export default function ForecastConfidenceChart({ futureStages = [] }) {
  if (!futureStages || futureStages.length === 0) return null;

  const data = futureStages.map((stg) => ({
    horizon: stg.horizon,
    confidencePct: Math.round(stg.confidence * 100),
    confidence: stg.confidence,
    stageName: stg.stage_name,
    tactic: stg.tactic,
    time: stg.estimated_time_to_impact,
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      return (
        <div className="p-3 bg-soc-navy-950 text-white rounded-xl border border-soc-navy-800 shadow-xl text-xs font-mono">
          <p className="font-bold text-indigo-300">{p.horizon}: {p.stageName}</p>
          <p className="text-soc-slate-300 mt-1">Confidence: {p.confidencePct}%</p>
          <p className="text-soc-slate-400">Impact Window: {p.time}</p>
          <p className="text-soc-slate-400">Tactic: {p.tactic}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 rounded-2xl bg-white border border-soc-slate-200 shadow-soc-card space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-soc-slate-900">
            Forecast Confidence Decay Curve
          </h3>
          <p className="text-xs text-soc-slate-500">
            Model certainty distribution across forecasted time horizons (T+1 to T+3).
          </p>
        </div>
        <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-50 text-soc-ai border border-indigo-200">
          Temporal Model
        </span>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="confidenceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis
              dataKey="horizon"
              tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'monospace' }}
              axisLine={{ stroke: '#E2E8F0' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'monospace' }}
              axisLine={{ stroke: '#E2E8F0' }}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="confidencePct"
              stroke="#4F46E5"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#confidenceGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
