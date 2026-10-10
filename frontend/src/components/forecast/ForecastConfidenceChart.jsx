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
        <div className="p-3 bg-threatcast-card text-threatcast-text rounded-xl border border-tc-border shadow-lg text-xs font-mono">
          <p className="font-bold text-threatcast-cyan">{p.horizon}: {p.stageName}</p>
          <p className="text-threatcast-silver mt-1">Confidence: {p.confidencePct}%</p>
          <p className="text-threatcast-muted">Impact Window: {p.time}</p>
          <p className="text-threatcast-muted">Tactic: {p.tactic}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 md:p-7 rounded-2xl bg-threatcast-card border border-tc-border shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-threatcast-text tracking-tight">
            Forecast Confidence Decay Curve
          </h3>
          <p className="text-xs text-threatcast-muted">
            Neural model certainty distribution across forecasted time horizons (T+1 to T+3).
          </p>
        </div>
        <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-threatcast-elevated text-threatcast-cyan border border-threatcast-amber font-bold">
          Temporal Model
        </span>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="confidenceGradLight" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--tc-cyan)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="var(--tc-cyan)" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--tc-card-elevated)" vertical={false} />
            <XAxis
              dataKey="horizon"
              tick={{ fontSize: 11, fill: 'var(--tc-muted)', fontFamily: 'monospace' }}
              axisLine={{ stroke: 'var(--tc-border)' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: 'var(--tc-muted)', fontFamily: 'monospace' }}
              axisLine={{ stroke: 'var(--tc-border)' }}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="confidencePct"
              stroke="var(--tc-cyan)"
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
