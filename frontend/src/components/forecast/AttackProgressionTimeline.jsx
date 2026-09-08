import React, { useState } from 'react';
import {
  Sparkles,
  Clock,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  ChevronRight,
  Info,
  Zap,
  AlertOctagon,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { formatConfidence } from '../../utils/formatters';
import InfoTooltip from '../common/InfoTooltip';
import ProgressiveDisclosure from '../common/ProgressiveDisclosure';

export default function AttackProgressionTimeline({ forecastData, onSelectStage }) {
  const [activeStageId, setActiveStageId] = useState(null);

  if (!forecastData) return null;

  const current = forecastData.current_state;
  const futureStages = forecastData.future_stages || [];
  const allStages = [current, ...futureStages].filter(Boolean);

  const selectedStage =
    allStages.find((s) => s.stage_id === activeStageId) || allStages[0];

  const handleStageClick = (stage) => {
    setActiveStageId(stage.stage_id);
    if (onSelectStage) onSelectStage(stage);
  };

  return (
    <div
      id="tour-forecast-timeline"
      className="p-6 md:p-7 rounded-2xl bg-cyber-surface border border-slate-800 shadow-soc-card space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              Attack Progression Forecast Timeline
            </h3>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30">
              K=3 Multi-Step Horizon
            </span>
            <InfoTooltip
              title="K=3 Attack Forecasting"
              whatItMeasures="Projects the attacker's trajectory 3 discrete steps into the future (T+1, T+2, T+3) before target compromise occurs."
              whyItMatters="Traditional IDS is reactive (alerts after the damage). K=3 forecasting gives defenders lead time to pre-emptively block the attack path."
              interpretation="T_0 = Observed State, T+1 = Next Imminent Step, T+2 = Secondary Objective, T+3 = Final Impact/Exfiltration."
              size="sm"
            />
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Step from the current observed state into forecasted multi-step attack futures. Click any stage to inspect.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
          <span className="flex items-center gap-1.5 text-rose-400 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Observed (T_0)
          </span>
          <span className="flex items-center gap-1.5 pl-2 text-sky-400 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400" /> Forecasted (T+1..3)
          </span>
        </div>
      </div>

      {/* Interactive Responsive Stepper Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 relative">
        {allStages.map((stage, idx) => {
          const isObserved = stage.state_type === 'observed';
          const isSelected = selectedStage?.stage_id === stage.stage_id;

          return (
            <motion.div
              key={stage.stage_id || idx}
              whileHover={{ scale: 1.02, y: -2 }}
              onClick={() => handleStageClick(stage)}
              className={`cursor-pointer rounded-xl p-4 transition-all duration-200 border flex flex-col justify-between relative group ${
                isSelected
                  ? 'border-sky-400/80 bg-sky-500/10 shadow-lg shadow-sky-500/10 ring-1 ring-sky-400/30'
                  : 'border-slate-800 bg-cyber-card/70 hover:border-slate-700 hover:bg-slate-800/40'
              }`}
            >
              {/* Top Horizon Badge */}
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded ${
                    isObserved
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  }`}
                >
                  {stage.horizon}
                </span>

                <span
                  className={`text-[10px] font-mono font-bold ${
                    isObserved ? 'text-rose-400' : 'text-sky-400'
                  }`}
                >
                  {isObserved ? 'OBSERVED' : `${formatConfidence(stage.confidence)} Conf`}
                </span>
              </div>

              {/* Stage Name */}
              <div className="space-y-1.5 flex-1">
                <h4
                  className={`text-sm sm:text-base font-bold leading-snug transition-colors ${
                    isSelected ? 'text-white' : 'text-slate-200 group-hover:text-white'
                  }`}
                >
                  {stage.stage_name}
                </h4>
                <p className="text-[11px] font-mono truncate text-slate-400">
                  {stage.tactic}
                </p>
              </div>

              {/* Estimated Time Window & Node Count */}
              <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] font-mono flex items-center justify-between text-slate-400">
                <span className="text-slate-300 font-semibold flex items-center gap-1">
                  <Clock className="w-3 h-3 text-sky-400" />
                  {stage.estimated_time_to_impact}
                </span>
                <span className="text-sky-400 font-bold">{stage.affected_nodes?.length || 0} Assets</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Selected Stage Deep Explanation Drawer */}
      {selectedStage && (
        <div className="p-5 rounded-xl bg-cyber-card border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                {selectedStage.horizon}
              </span>
              <h4 className="text-sm sm:text-base font-bold text-white">
                {selectedStage.stage_name} — Plain-English Explanation
              </h4>
            </div>
            <span className="text-xs font-mono text-slate-400">
              Target Assets: <strong className="text-white">{selectedStage.affected_nodes?.join(', ') || 'N/A'}</strong>
            </span>
          </div>

          <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-medium">
            {selectedStage.description}
          </p>

          {/* Recommended Action */}
          <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-xs text-sky-200 flex items-start gap-2.5">
            <AlertOctagon className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-[10px] uppercase font-mono font-bold text-sky-300">
                Recommended Proactive Mitigation:
              </strong>
              <span className="text-slate-300 leading-relaxed">{selectedStage.recommended_mitigation}</span>
            </div>
          </div>

          {/* Progressive Disclosure for MITRE ID & Probability */}
          <ProgressiveDisclosure
            title="Technical Technique Identifiers & Probability Distribution"
            badge="Model Evidence"
            defaultOpen={false}
          >
            <div className="space-y-2 font-mono text-[11px] text-slate-300">
              <div className="flex justify-between border-b border-slate-800 pb-1">
                <span className="text-slate-500">MITRE Technique ID:</span>
                <span className="font-bold text-white">{selectedStage.technique_id}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1">
                <span className="text-slate-500">MITRE Tactic:</span>
                <span className="font-bold text-white">{selectedStage.tactic}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-slate-500">Estimated Time Window:</span>
                <span className="font-bold text-sky-400">{selectedStage.estimated_time_to_impact}</span>
              </div>
            </div>
          </ProgressiveDisclosure>
        </div>
      )}

      {/* Narrative Context Summary */}
      {forecastData.summary_narrative && (
        <div className="p-4 rounded-xl bg-cyber-card border border-slate-800 text-xs text-slate-300 leading-relaxed flex items-start gap-3">
          <Zap className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-white font-mono">Forecasting Engine Security Analysis: </strong>
            {forecastData.summary_narrative}
          </div>
        </div>
      )}
    </div>
  );
}
