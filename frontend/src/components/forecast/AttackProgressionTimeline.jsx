import React, { useState } from 'react';
import { Sparkles, Clock, ArrowRight, ShieldAlert, CheckCircle2, ChevronRight, Info } from 'lucide-react';
import { formatConfidence } from '../../utils/formatters';

export default function AttackProgressionTimeline({ forecastData, onSelectStage }) {
  const [activeStageId, setActiveStageId] = useState(null);

  if (!forecastData) return null;

  const current = forecastData.current_state;
  const futureStages = forecastData.future_stages || [];
  const allStages = [current, ...futureStages];

  const handleStageClick = (stage) => {
    setActiveStageId(stage.stage_id);
    if (onSelectStage) onSelectStage(stage);
  };

  return (
    <div className="p-6 rounded-2xl bg-white border border-soc-slate-200 shadow-soc-card space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-soc-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-soc-slate-900">
              Attack Progression Forecast Timeline
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 text-soc-ai border border-indigo-200">
              K=3 Horizon
            </span>
          </div>
          <p className="text-xs text-soc-slate-500 mt-0.5">
            See what the attacker is likely to do next. Step from current observed state into forecasted futures.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-soc-slate-500 font-mono">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-soc-navy-900" /> Observed (T_0)
          </span>
          <span className="flex items-center gap-1 pl-2">
            <span className="w-2 h-2 rounded-full bg-soc-ai" /> Forecasted (T+1..3)
          </span>
        </div>
      </div>

      {/* Interactive Horizontal / Responsive Stepper */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
        {allStages.map((stage, idx) => {
          const isObserved = stage.state_type === 'observed';
          const isSelected = activeStageId === stage.stage_id;

          return (
            <div
              key={stage.stage_id || idx}
              onClick={() => handleStageClick(stage)}
              className={`cursor-pointer rounded-xl p-4 transition-all border flex flex-col justify-between relative group ${
                isSelected
                  ? 'ring-2 ring-soc-ai border-soc-ai bg-indigo-50/40 shadow-md'
                  : isObserved
                  ? 'bg-gradient-to-b from-soc-navy-950 to-soc-navy-900 text-white border-soc-navy-800 shadow-sm'
                  : 'bg-soc-slate-50/80 hover:bg-white border-soc-slate-200 hover:border-indigo-300 shadow-sm'
              }`}
            >
              {/* Top Horizon Badge */}
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                    isObserved
                      ? 'bg-white/10 text-white border border-white/20'
                      : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                  }`}
                >
                  {stage.horizon}
                </span>

                <span
                  className={`text-[10px] font-mono font-semibold ${
                    isObserved ? 'text-emerald-400' : 'text-indigo-600'
                  }`}
                >
                  {isObserved ? 'OBSERVED' : `${formatConfidence(stage.confidence)} Conf`}
                </span>
              </div>

              {/* Stage Tactic & Name */}
              <div className="space-y-1.5 flex-1">
                <h4
                  className={`text-sm font-bold leading-snug ${
                    isObserved ? 'text-white' : 'text-soc-slate-900 group-hover:text-soc-ai'
                  }`}
                >
                  {stage.stage_name}
                </h4>
                <p
                  className={`text-[11px] font-mono truncate ${
                    isObserved ? 'text-soc-slate-300' : 'text-soc-slate-500'
                  }`}
                >
                  {stage.tactic}
                </p>
              </div>

              {/* Estimated Time & Node Count */}
              <div
                className={`mt-4 pt-3 border-t text-[10px] font-mono flex items-center justify-between ${
                  isObserved
                    ? 'border-white/10 text-soc-slate-400'
                    : 'border-soc-slate-200 text-soc-slate-500'
                }`}
              >
                <span>{stage.estimated_time_to_impact}</span>
                <span>{stage.affected_nodes?.length || 0} Assets</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Narrative Context */}
      {forecastData.summary_narrative && (
        <div className="p-4 rounded-xl bg-soc-slate-50 border border-soc-slate-200 text-xs text-soc-slate-700 leading-relaxed flex items-start gap-3">
          <Info className="w-4 h-4 text-soc-ai shrink-0 mt-0.5" />
          <div>
            <strong className="text-soc-slate-900">Forecasting Engine Analysis: </strong>
            {forecastData.summary_narrative}
          </div>
        </div>
      )}
    </div>
  );
}
