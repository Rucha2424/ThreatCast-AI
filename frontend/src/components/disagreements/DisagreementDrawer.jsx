import React from 'react';
import { X, AlertTriangle, Sparkles, Shield, ArrowRight, CheckCircle2 } from 'lucide-react';
import { formatConfidence } from '../../utils/formatters';
import ProgressiveDisclosure from '../common/ProgressiveDisclosure';

export default function DisagreementDrawer({ item, onClose }) {
  if (!item) return null;

  return (
    <div className="p-6 bg-cyber-surface rounded-2xl border border-slate-800 shadow-xl space-y-5 animate-in slide-in-from-right duration-200 text-slate-100">
      {/* Top Header */}
      <div className="flex items-start justify-between border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              DISAGREEMENT SIGNAL
            </span>
            <span className="text-xs font-mono text-slate-400">{item.timestamp}</span>
          </div>
          <h3 className="text-lg font-bold text-white mt-1">
            Target Asset: {item.target_node}
          </h3>
          <p className="text-xs font-mono text-slate-400">
            Network Context: {item.network_context}
          </p>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Model vs Rule Side-by-Side Breakdown */}
      <div className="space-y-3">
        <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/30 space-y-1.5 shadow-sm">
          <span className="text-[10px] font-mono font-bold uppercase text-sky-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            ThreatCast AI Model Verdict ({formatConfidence(item.model_confidence)} Confidence)
          </span>
          <p className="text-sm font-bold text-sky-200">{item.model_prediction}</p>
          <span className="text-[11px] font-mono text-sky-400/80 block">
            Architecture: {item.model_architecture}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-cyber-card border border-slate-800 space-y-1.5">
          <span className="text-[10px] font-mono font-bold uppercase text-slate-400 flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            Deterministic Rule Engine Output
          </span>
          <p className="text-sm font-semibold text-slate-300">{item.rule_output}</p>
          <span className="text-[11px] font-mono text-slate-500 block">
            Rule Name: {item.rule_name} • Severity: {item.rule_severity}
          </span>
        </div>
      </div>

      {/* Why It Matters */}
      <div className="space-y-1.5">
        <span className="text-xs font-mono font-bold uppercase text-amber-400 block">
          Why This Disagreement Matters:
        </span>
        <div className="p-3.5 rounded-xl bg-cyber-card border border-slate-800 text-xs text-slate-300 leading-relaxed font-medium">
          {item.why_it_matters}
        </div>
      </div>

      {/* Recommended Action */}
      <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/30 text-slate-100 space-y-1.5">
        <span className="text-[10px] font-mono font-bold uppercase text-sky-400 block">
          Recommended Defensive Action:
        </span>
        <p className="text-xs text-slate-300 leading-relaxed font-medium">
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
          <ul className="space-y-1.5 text-xs text-slate-300 font-mono">
            {item.observed_signals.map((sig, idx) => (
              <li key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-cyber-card border border-slate-800">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1.5 shrink-0" />
                <span>{sig}</span>
              </li>
            ))}
          </ul>
        </ProgressiveDisclosure>
      )}
    </div>
  );
}
