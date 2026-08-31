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
    <div className="p-6 md:p-7 rounded-2xl bg-white border border-[#ebdcc7] shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#ebdcc7] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-base font-bold text-[#221207] tracking-tight">
              Attack Progression Forecast Timeline
            </h3>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#fef3c7] text-[#b45309] border border-[#fde68a]">
              K=3 Horizon
            </span>
          </div>
          <p className="text-xs text-[#544230] mt-0.5">
            Step from current observed state into forecasted multi-step attack futures.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-[#7a644c] font-mono">
          <span className="flex items-center gap-1.5 text-[#c2410c] font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ea580c]" /> Observed (T_0)
          </span>
          <span className="flex items-center gap-1.5 pl-2 text-[#b45309] font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" /> Forecasted (T+1..3)
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
              className={`cursor-pointer rounded-xl p-4 transition-all duration-200 border flex flex-col justify-between relative group ${
                isSelected
                  ? 'ring-2 ring-[#b45309] border-[#b45309] bg-[#fffbeb] shadow-sm'
                  : isObserved
                  ? 'bg-[#fcfaf7] border-[#ded0bc] text-[#221207] shadow-2xs'
                  : 'bg-white hover:bg-[#fcfaf7] border-[#ebdcc7] hover:border-[#b45309]'
              }`}
            >
              {/* Top Horizon Badge */}
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded ${
                    isObserved
                      ? 'bg-[#ffedd5] text-[#c2410c] border border-[#fdba74]'
                      : 'bg-[#fef3c7] text-[#b45309] border border-[#fde68a]'
                  }`}
                >
                  {stage.horizon}
                </span>

                <span
                  className={`text-[10px] font-mono font-bold ${
                    isObserved ? 'text-[#ea580c]' : 'text-[#b45309]'
                  }`}
                >
                  {isObserved ? 'OBSERVED' : `${formatConfidence(stage.confidence)} Conf`}
                </span>
              </div>

              {/* Stage Tactic & Name */}
              <div className="space-y-1.5 flex-1">
                <h4
                  className={`text-sm font-bold leading-snug transition-colors ${
                    isObserved ? 'text-[#221207]' : 'text-[#301a0a] group-hover:text-[#b45309]'
                  }`}
                >
                  {stage.stage_name}
                </h4>
                <p className="text-[11px] font-mono truncate text-[#7a644c]">
                  {stage.tactic}
                </p>
              </div>

              {/* Estimated Time & Node Count */}
              <div className="mt-4 pt-3 border-t border-[#ebdcc7] text-[10px] font-mono flex items-center justify-between text-[#7a644c]">
                <span className="text-[#544230] font-semibold">{stage.estimated_time_to_impact}</span>
                <span className="text-[#b45309] font-bold">{stage.affected_nodes?.length || 0} Assets</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Narrative Context */}
      {forecastData.summary_narrative && (
        <div className="p-4 rounded-xl bg-[#fcfaf7] border border-[#ebdcc7] text-xs text-[#544230] leading-relaxed flex items-start gap-3">
          <Zap className="w-4 h-4 text-[#d97706] shrink-0 mt-0.5" />
          <div>
            <strong className="text-[#221207] font-mono">Forecasting Engine Analysis: </strong>
            {forecastData.summary_narrative}
          </div>
        </div>
      )}
    </div>
  );
}
