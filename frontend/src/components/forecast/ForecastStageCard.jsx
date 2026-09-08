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
      className={`rounded-2xl p-6 border transition-all duration-200 shadow-xs space-y-4 ${
        isCurrent
          ? 'bg-[#fcfaf7] text-[#221207] border-[#ded0bc]'
          : 'bg-white text-[#301a0a] border-[#ebdcc7] hover:border-[#b45309]'
      }`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between">
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

      {/* Title & Human Meaning */}
      <div className="space-y-1.5">
        <h3 className="text-lg font-bold tracking-tight text-[#221207]">{stage.stage_name}</h3>
        <p className="text-xs leading-relaxed text-[#544230] font-medium">
          {stage.description}
        </p>
      </div>

      {/* Why It Matters */}
      <div className="p-3 rounded-xl bg-[#fffdfa] border border-[#ebdcc7] space-y-1">
        <span className="text-[10px] font-mono uppercase font-bold text-[#b45309] block">
          Why This Matters:
        </span>
        <p className="text-xs text-[#544230] leading-relaxed">
          {getWhyItMatters()}
        </p>
      </div>

      {/* Affected Nodes & Estimated Time Window */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
        <div className="p-3 rounded-xl border bg-[#fcfaf7] border-[#ebdcc7]">
          <span className="block text-[10px] uppercase font-bold mb-1 text-[#7a644c]">
            Estimated Time Window
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

      {/* Recommended Proactive Mitigation */}
      <div className="p-3.5 rounded-xl border flex items-start gap-2.5 text-xs bg-[#fffbeb] border-[#fde68a] text-[#78350f]">
        <AlertOctagon className="w-4 h-4 text-[#d97706] shrink-0 mt-0.5" />
        <div>
          <strong className="block text-[11px] uppercase tracking-wider font-bold text-[#b45309] font-mono">
            Recommended Action (What to do):
          </strong>
          <span className="leading-relaxed text-[#544230] font-medium">{stage.recommended_mitigation}</span>
        </div>
      </div>

      {/* Level 3: Progressive Disclosure for MITRE Techniques and Probability */}
      <ProgressiveDisclosure
        title="Technical MITRE Details & Probability Distribution"
        badge="Evidence"
        defaultOpen={false}
      >
        <div className="space-y-2 font-mono text-[11px] text-[#544230]">
          <div className="flex justify-between border-b border-[#f5efe6] pb-1">
            <span className="text-[#7a644c]">MITRE Tactic:</span>
            <span className="font-bold text-[#221207]">{stage.tactic}</span>
          </div>
          <div className="flex justify-between border-b border-[#f5efe6] pb-1">
            <span className="text-[#7a644c]">MITRE Technique ID:</span>
            <span className="font-bold text-[#221207]">{stage.technique_id}</span>
          </div>

          {/* Probability Distribution */}
          {stage.probability_distribution && Object.keys(stage.probability_distribution).length > 0 && (
            <div className="pt-2 space-y-1.5">
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
        </div>
      </ProgressiveDisclosure>
    </div>
  );
}
