import React from 'react';
import { Clock, ShieldAlert, Sparkles, AlertOctagon, CheckCircle2, Server, Zap } from 'lucide-react';
import { formatConfidence } from '../../utils/formatters';

export default function ForecastStageCard({ stage, isCurrent = false }) {
  if (!stage) return null;

  return (
    <div
      className={`rounded-2xl p-6 border transition-all duration-200 shadow-xs ${
        isCurrent
          ? 'bg-[#fcfaf7] text-[#221207] border-[#ded0bc]'
          : 'bg-white text-[#301a0a] border-[#ebdcc7] hover:border-[#b45309]'
      }`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-mono font-bold px-2.5 py-1 rounded ${
              isCurrent
                ? 'bg-[#ffedd5] text-[#c2410c] border border-[#fdba74]'
                : 'bg-[#fef3c7] text-[#b45309] border border-[#fde68a]'
            }`}
          >
            {stage.horizon}
          </span>
          <span
            className={`text-xs font-bold font-mono ${
              isCurrent ? 'text-[#ea580c]' : 'text-[#b45309]'
            }`}
          >
            {isCurrent ? 'CURRENT OBSERVED' : 'FORECASTED STATE'}
          </span>
        </div>

        <span
          className={`text-xs font-mono font-bold px-3 py-1 rounded-full ${
            isCurrent
              ? 'bg-[#fef3c7] text-[#b45309] border border-[#fde68a]'
              : 'bg-[#fffbeb] text-[#b45309] border border-[#fde68a]'
          }`}
        >
          {formatConfidence(stage.confidence)} Confidence
        </span>
      </div>

      {/* Title & Description */}
      <div className="space-y-1 mb-4">
        <h3 className="text-lg font-bold tracking-tight text-[#221207]">{stage.stage_name}</h3>
        <p className="text-xs font-mono text-[#7a644c]">
          MITRE ATT&CK: {stage.tactic} ({stage.technique_id})
        </p>
        <p className="text-xs leading-relaxed mt-2 text-[#544230]">
          {stage.description}
        </p>
      </div>

      {/* Affected Nodes & Est. Time */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-xs font-mono">
        <div className="p-3 rounded-xl border bg-[#fcfaf7] border-[#ebdcc7]">
          <span className="block text-[10px] uppercase font-bold mb-1 text-[#7a644c]">
            Estimated Window
          </span>
          <span className="font-bold text-[#221207] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#b45309]" />
            {stage.estimated_time_to_impact}
          </span>
        </div>

        <div className="p-3 rounded-xl border bg-[#fcfaf7] border-[#ebdcc7]">
          <span className="block text-[10px] uppercase font-bold mb-1 text-[#7a644c]">
            Affected Infrastructure
          </span>
          <span className="font-bold text-[#221207] truncate block" title={stage.affected_nodes?.join(', ')}>
            {stage.affected_nodes?.join(', ') || 'None'}
          </span>
        </div>
      </div>

      {/* Probability Distribution if present */}
      {stage.probability_distribution && Object.keys(stage.probability_distribution).length > 0 && (
        <div className="mb-4 space-y-1.5">
          <span className="text-[10px] uppercase font-mono font-bold block text-[#7a644c]">
            Tactical Probability Distribution:
          </span>
          <div className="space-y-1">
            {Object.entries(stage.probability_distribution).map(([tactic, prob]) => (
              <div key={tactic} className="space-y-0.5 text-[11px]">
                <div className="flex justify-between font-mono">
                  <span className="text-[#544230]">{tactic}</span>
                  <span className="font-bold text-[#b45309]">{formatConfidence(prob)}</span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden bg-[#f5efe6] border border-[#ded0bc]">
                  <div
                    className="h-full bg-[#d97706] rounded-full"
                    style={{ width: `${prob * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Proactive Mitigation */}
      <div className="p-3.5 rounded-xl border flex items-start gap-2.5 text-xs bg-[#fffbeb] border-[#fde68a] text-[#78350f]">
        <AlertOctagon className="w-4 h-4 text-[#d97706] shrink-0 mt-0.5" />
        <div>
          <strong className="block text-[11px] uppercase tracking-wider font-bold text-[#b45309] font-mono">
            Proactive Mitigation:
          </strong>
          <span className="leading-relaxed text-[#544230]">{stage.recommended_mitigation}</span>
        </div>
      </div>
    </div>
  );
}
