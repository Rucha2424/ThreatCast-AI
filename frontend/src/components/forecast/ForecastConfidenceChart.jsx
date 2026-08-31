import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

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
        <div className="p-3 bg-cyber-black text-white rounded-xl border border-cyber-maroon-700 shadow-2xl text-xs font-mono">
          <p className="font-bold text-rose-400">{p.horizon}: {p.stageName}</p>
          <p className="text-cyber-grey-300 mt-1">Confidence: {p.confidencePct}%</p>
          <p className="text-cyber-grey-400">Impact Window: {p.time}</p>
          <p className="text-cyber-grey-400">Tactic: {p.tactic}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 md:p-7 rounded-2xl bg-gradient-to-br from-cyber-maroon-950 via-cyber-black to-cyber-burgundy-950 border border-cyber-maroon-800 shadow-2xl space-y-4 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight">
            Forecast Confidence Decay Curve
          </h3>
          <p className="text-xs text-cyber-grey-400">
            Neural model certainty distribution across forecasted time horizons (T+1 to T+3).
          </p>
        </div>
        <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold">
          Temporal Model
        </span>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="confidenceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#260817" vertical={false} />
            <XAxis
              dataKey="horizon"
              tick={{ fontSize: 11, fill: '#94A3B8', fontFamily: 'monospace' }}
              axisLine={{ stroke: '#340b20' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: '#94A3B8', fontFamily: 'monospace' }}
              axisLine={{ stroke: '#340b20' }}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="confidencePct"
              stroke="#f43f5e"
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
