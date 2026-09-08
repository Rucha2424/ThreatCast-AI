import React from 'react';
import { X, AlertTriangle, Sparkles, Shield, ArrowRight, CheckCircle2 } from 'lucide-react';
import { formatConfidence } from '../../utils/formatters';
import ProgressiveDisclosure from '../common/ProgressiveDisclosure';

export default function DisagreementDrawer({ item, onClose }) {
  if (!item) return null;

  return (
    <div className="p-6 bg-white rounded-2xl border border-[#ebdcc7] shadow-lg space-y-5 animate-in slide-in-from-right duration-200">
      {/* Top Header */}
      <div className="flex items-start justify-between border-b border-[#ebdcc7] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#fef3c7] text-[#b45309] border border-[#fde68a]">
              DISAGREEMENT SIGNAL
            </span>
            <span className="text-xs font-mono text-[#7a644c]">{item.timestamp}</span>
          </div>
          <h3 className="text-lg font-bold text-[#221207] mt-1">
            Target Asset: {item.target_node}
          </h3>
          <p className="text-xs font-mono text-[#7a644c]">
            Network Context: {item.network_context}
          </p>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-[#f5efe6] text-[#7a644c] hover:text-[#221207] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Model vs Rule Side-by-Side Breakdown */}
      <div className="space-y-3">
        <div className="p-4 rounded-xl bg-[#fffbeb] border border-[#fde68a] space-y-1.5 shadow-2xs">
          <span className="text-[10px] font-mono font-bold uppercase text-[#b45309] flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-[#d97706]" />
            ThreatCast AI Model Verdict ({formatConfidence(item.model_confidence)} Confidence)
          </span>
          <p className="text-sm font-bold text-[#221207]">{item.model_prediction}</p>
          <span className="text-[11px] font-mono text-[#78350f] block">
            Architecture: {item.model_architecture}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-[#fcfaf7] border border-[#ebdcc7] space-y-1.5">
          <span className="text-[10px] font-mono font-bold uppercase text-[#7a644c] flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-[#7a644c]" />
            Deterministic Rule Engine Output
          </span>
          <p className="text-sm font-semibold text-[#301a0a]">{item.rule_output}</p>
          <span className="text-[11px] font-mono text-[#7a644c] block">
            Rule Name: {item.rule_name} • Severity: {item.rule_severity}
          </span>
        </div>
      </div>

      {/* Why It Matters */}
      <div className="space-y-1.5">
        <span className="text-xs font-mono font-bold uppercase text-[#b45309] block">
          Why This Disagreement Matters:
        </span>
        <div className="p-3.5 rounded-xl bg-[#fffdfa] border border-[#ebdcc7] text-xs text-[#544230] leading-relaxed font-medium">
          {item.why_it_matters}
        </div>
      </div>

      {/* Recommended Action */}
      <div className="p-4 rounded-xl bg-[#fffbeb] border border-[#fde68a] text-[#221207] space-y-1.5">
        <span className="text-[10px] font-mono font-bold uppercase text-[#b45309] block">
          Recommended Defensive Action:
        </span>
        <p className="text-xs text-[#544230] leading-relaxed font-medium">
          {item.recommended_action}
        </p>
      </div>

      {/* Level 3: Progressive Disclosure for Observed Signals */}
      {item.observed_signals && item.observed_signals.length > 0 && (
        <ProgressiveDisclosure
          title="Observed Telemetry Signals & Evidence"
          badge="Raw Signals"
          defaultOpen={false}
        >
          <ul className="space-y-1.5 text-xs text-[#42240f] font-mono">
            {item.observed_signals.map((sig, idx) => (
              <li key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-[#fcfaf7] border border-[#ebdcc7]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#d97706] mt-1.5 shrink-0" />
                <span>{sig}</span>
              </li>
            ))}
          </ul>
        </ProgressiveDisclosure>
      )}
    </div>
  );
}
