import React from 'react';
import { Clock, ShieldAlert, Sparkles, AlertOctagon, CheckCircle2, Server, Zap } from 'lucide-react';
import { formatConfidence } from '../../utils/formatters';
import ProgressiveDisclosure from '../common/ProgressiveDisclosure';
import InfoTooltip from '../common/InfoTooltip';

export default function ForecastStageCard({ stage, isCurrent = false }) {
  if (!stage) return null;

  const getWhyItMatters = () => {
    if (isCurrent) {
      return 'This state is currently observed and active. If left uncontained, the attacker will leverage this foothold to traverse to adjacent infrastructure.';
    }
    if (stage.horizon === 'T+1') {
      return 'This is the most critical intervention window. Pre-empting this step prevents the adversary from escalating privileges or spreading to server nodes.';
    }
    if (stage.horizon === 'T+2') {
      return 'Secondary attacker objective. Target systems will be accessed and sensitive data will be gathered or staged.';
    }
    return 'Final impact state. If the attack reaches this horizon, data exfiltration or mass encryption will cause critical business damage.';
  };

  return (
    <div
      className={`rounded-2xl p-6 border transition-all duration-200 shadow-soc-card space-y-4 ${
        isCurrent
          ? 'bg-rose-500/5 border-rose-500/30'
          : 'bg-cyber-surface border-slate-800'
      }`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-mono font-bold px-2.5 py-1 rounded ${
              isCurrent
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
            }`}
          >
            {stage.horizon}
          </span>
          <span
            className={`text-xs font-bold font-mono ${
              isCurrent ? 'text-rose-400' : 'text-sky-400'
            }`}
          >
            {isCurrent ? 'CURRENT OBSERVED' : 'FORECASTED STATE'}
          </span>
        </div>

        <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/30">
          {formatConfidence(stage.confidence)} Confidence
        </span>
      </div>

      {/* Title & Human Meaning */}
      <div className="space-y-1.5">
        <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white">{stage.stage_name}</h3>
        <p className="text-xs sm:text-sm leading-relaxed text-slate-300 font-medium">
          {stage.description}
        </p>
      </div>

      {/* Why It Matters */}
      <div className="p-3.5 rounded-xl bg-cyber-card border border-slate-800/80 space-y-1">
        <span className="text-[10px] font-mono uppercase font-bold text-sky-400 block">
          Why This Matters:
        </span>
        <p className="text-xs text-slate-300 leading-relaxed">
          {getWhyItMatters()}
        </p>
      </div>

      {/* Affected Nodes & Estimated Time Window */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
        <div className="p-3 rounded-xl border bg-cyber-card border-slate-800/80">
          <span className="block text-[10px] uppercase font-bold mb-1 text-slate-400">
            Estimated Time Window
          </span>
          <span className="font-bold text-white flex items-center gap-1.5 text-sm">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            {stage.estimated_time_to_impact}
          </span>
        </div>

        <div className="p-3 rounded-xl border bg-cyber-card border-slate-800/80">
          <span className="block text-[10px] uppercase font-bold mb-1 text-slate-400">
            Affected Infrastructure
          </span>
          <span className="font-bold text-sky-300 truncate block text-sm" title={stage.affected_nodes?.join(', ')}>
            {stage.affected_nodes?.join(', ') || 'None'}
          </span>
        </div>
      </div>

      {/* Recommended Proactive Mitigation */}
      <div className="p-3.5 rounded-xl border flex items-start gap-2.5 text-xs bg-sky-500/10 border-sky-500/30 text-sky-200">
        <AlertOctagon className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
        <div>
          <strong className="block text-[11px] uppercase tracking-wider font-bold text-sky-300 font-mono">
            Recommended Action (What to do):
          </strong>
          <span className="leading-relaxed text-slate-300 font-medium">{stage.recommended_mitigation}</span>
        </div>
      </div>

      {/* Level 3: Progressive Disclosure for MITRE Techniques and Probability */}
      <ProgressiveDisclosure
        title="Technical MITRE Details & Probability Distribution"
        badge="Evidence"
        defaultOpen={false}
      >
        <div className="space-y-2 font-mono text-[11px] text-slate-300">
          <div className="flex justify-between border-b border-slate-800 pb-1">
            <span className="text-slate-500">MITRE Tactic:</span>
            <span className="font-bold text-white">{stage.tactic}</span>
          </div>
          <div className="flex justify-between border-b border-slate-800 pb-1">
            <span className="text-slate-500">MITRE Technique ID:</span>
            <span className="font-bold text-white">{stage.technique_id}</span>
          </div>

          {/* Probability Distribution */}
          {stage.probability_distribution && Object.keys(stage.probability_distribution).length > 0 && (
            <div className="pt-2 space-y-1.5">
              <span className="text-[10px] uppercase font-mono font-bold block text-slate-400">
                Tactical Probability Distribution:
              </span>
              <div className="space-y-1">
                {Object.entries(stage.probability_distribution).map(([tactic, prob]) => (
                  <div key={tactic} className="space-y-0.5 text-[11px]">
                    <div className="flex justify-between font-mono">
                      <span className="text-slate-300">{tactic}</span>
                      <span className="font-bold text-sky-400">{formatConfidence(prob)}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden bg-slate-800 border border-slate-700">
                      <div
                        className="h-full bg-sky-400 rounded-full"
                        style={{ width: `${prob * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ProgressiveDisclosure>
    </div>
  );
}
