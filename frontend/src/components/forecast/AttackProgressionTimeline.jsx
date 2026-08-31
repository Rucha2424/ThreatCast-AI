import React, { useState } from 'react';
import { Sparkles, Clock, ArrowRight, ShieldAlert, CheckCircle2, ChevronRight, Info, Zap } from 'lucide-react';
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
    <div className="p-6 md:p-7 rounded-2xl bg-gradient-to-br from-cyber-brown-950 via-cyber-black to-cyber-amber-950 border border-cyber-brown-800 shadow-2xl space-y-6 backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cyber-brown-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-base font-bold text-white tracking-tight">
              Attack Progression Forecast Timeline
            </h3>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-700/60 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
              K=3 Horizon
            </span>
          </div>
          <p className="text-xs text-cyber-beige-300 mt-0.5">
            Step from current observed state into forecasted multi-step attack futures.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-cyber-beige-400 font-mono">
          <span className="flex items-center gap-1.5 text-orange-300">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_#f97316]" /> Observed (T_0)
          </span>
          <span className="flex items-center gap-1.5 pl-2 text-amber-300">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]" /> Forecasted (T+1..3)
          </span>
        </div>
      </div>

      {/* Interactive Responsive Stepper */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
        {allStages.map((stage, idx) => {
          const isObserved = stage.state_type === 'observed';
          const isSelected = activeStageId === stage.stage_id;

          return (
            <div
              key={stage.stage_id || idx}
              onClick={() => handleStageClick(stage)}
              className={`cursor-pointer rounded-xl p-4 transition-all duration-300 border flex flex-col justify-between relative group ${
                isSelected
                  ? 'ring-2 ring-amber-500 border-amber-400 bg-amber-950/70 shadow-xl shadow-amber-950/80'
                  : isObserved
                  ? 'bg-gradient-to-b from-cyber-brown-900 via-cyber-black to-cyber-amber-950 text-white border-amber-600/50 shadow-md'
                  : 'bg-cyber-brown-950/70 hover:bg-cyber-brown-900/70 border-cyber-brown-800 hover:border-amber-500/60 shadow-md'
              }`}
            >
              {/* Top Horizon Badge */}
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded ${
                    isObserved
                      ? 'bg-amber-950 text-amber-300 border border-amber-600/60 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                      : 'bg-cyber-black text-amber-300 border border-amber-600/40'
                  }`}
                >
                  {stage.horizon}
                </span>

                <span
                  className={`text-[10px] font-mono font-bold ${
                    isObserved ? 'text-orange-400 animate-pulse' : 'text-amber-400'
                  }`}
                >
                  {isObserved ? 'OBSERVED' : `${formatConfidence(stage.confidence)} Conf`}
                </span>
              </div>

              {/* Stage Tactic & Name */}
              <div className="space-y-1.5 flex-1">
                <h4
                  className={`text-sm font-bold leading-snug transition-colors ${
                    isObserved ? 'text-white' : 'text-white group-hover:text-amber-300'
                  }`}
                >
                  {stage.stage_name}
                </h4>
                <p className="text-[11px] font-mono truncate text-cyber-beige-300">
                  {stage.tactic}
                </p>
              </div>

              {/* Estimated Time & Node Count */}
              <div className="mt-4 pt-3 border-t border-cyber-brown-800 text-[10px] font-mono flex items-center justify-between text-cyber-beige-400">
                <span className="text-cyber-beige-200 font-semibold">{stage.estimated_time_to_impact}</span>
                <span className="text-amber-300">{stage.affected_nodes?.length || 0} Assets</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Narrative Context */}
      {forecastData.summary_narrative && (
        <div className="p-4 rounded-xl bg-cyber-black/90 border border-cyber-brown-800 text-xs text-cyber-beige-200 leading-relaxed flex items-start gap-3 shadow-inner">
          <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-white font-mono">Forecasting Engine Analysis: </strong>
            {forecastData.summary_narrative}
          </div>
        </div>
      )}
    </div>
  );
}
