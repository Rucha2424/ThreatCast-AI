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
        <div className="p-3 bg-white text-[#221207] rounded-xl border border-[#ebdcc7] shadow-lg text-xs font-mono">
          <p className="font-bold text-[#b45309]">{p.horizon}: {p.stageName}</p>
          <p className="text-[#544230] mt-1">Confidence: {p.confidencePct}%</p>
          <p className="text-[#7a644c]">Impact Window: {p.time}</p>
          <p className="text-[#7a644c]">Tactic: {p.tactic}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 md:p-7 rounded-2xl bg-white border border-[#ebdcc7] shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-[#221207] tracking-tight">
            Forecast Confidence Decay Curve
          </h3>
          <p className="text-xs text-[#7a644c]">
            Neural model certainty distribution across forecasted time horizons (T+1 to T+3).
          </p>
        </div>
        <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-[#fef3c7] text-[#b45309] border border-[#fde68a] font-bold">
          Temporal Model
        </span>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="confidenceGradLight" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#d97706" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#d97706" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f5efe6" vertical={false} />
            <XAxis
              dataKey="horizon"
              tick={{ fontSize: 11, fill: '#7a644c', fontFamily: 'monospace' }}
              axisLine={{ stroke: '#ded0bc' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: '#7a644c', fontFamily: 'monospace' }}
              axisLine={{ stroke: '#ded0bc' }}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="confidencePct"
              stroke="#d97706"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#confidenceGradLight)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
