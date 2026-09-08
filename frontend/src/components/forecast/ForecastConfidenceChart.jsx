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
import InfoTooltip from '../common/InfoTooltip';
import SecurityInsightBanner from '../common/SecurityInsightBanner';

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

  const nearestStage = data[0];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      return (
        <div className="p-3 bg-cyber-surface text-slate-100 rounded-xl border border-slate-700 shadow-xl text-xs font-mono">
          <p className="font-bold text-sky-400">{p.horizon}: {p.stageName}</p>
          <p className="text-slate-300 mt-1">Confidence: {p.confidencePct}%</p>
          <p className="text-slate-400">Impact Window: {p.time}</p>
          <p className="text-slate-400">Tactic: {p.tactic}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 md:p-7 rounded-2xl bg-cyber-surface border border-slate-800 shadow-soc-card space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
              Forecast Confidence Decay Curve
            </h3>
            <InfoTooltip
              title="Confidence Decay Across Horizons"
              whatItMeasures="Confidence probability at T+1, T+2, and T+3."
              whyItMatters="Predictions closer in time (T+1) have the highest certainty (>88%), making them the most reliable targets for automated defensive blocking."
              interpretation="Natural temporal decay occurs as future possibilities branch out."
              size="sm"
            />
          </div>
          <p className="text-xs text-slate-400">
            Neural model certainty distribution across forecasted time horizons (T+1 to T+3).
          </p>
        </div>
        <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 font-bold">
          Temporal Model
        </span>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="confidenceGradDark" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="horizon"
              tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'monospace' }}
              axisLine={{ stroke: '#334155' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'monospace' }}
              axisLine={{ stroke: '#334155' }}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="confidencePct"
              stroke="#38bdf8"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#confidenceGradDark)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {nearestStage && (
        <SecurityInsightBanner
          title="Key Forecast Insight"
          insight={`ThreatCast AI exhibits highest certainty at T+1 (${Math.round((nearestStage.confidence || 0.94) * 100)}% for ${nearestStage.stage_name || 'Lateral Pivoting'}) within an estimated ${nearestStage.estimated_time_to_impact || '<3 mins'}.`}
          recommendation="Intervening at T+1 collapses the remaining forecasted attack steps (T+2 and T+3) before target assets can be breached."
          type="info"
        />
      )}
    </div>
  );
}
