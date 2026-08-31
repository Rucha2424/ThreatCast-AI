import React from 'react';
import { X, AlertTriangle, Sparkles, Shield, ArrowRight, CheckCircle2 } from 'lucide-react';
import { formatConfidence } from '../../utils/formatters';

export default function DisagreementDrawer({ item, onClose }) {
  if (!item) return null;

  return (
    <div className="p-6 bg-white rounded-2xl border border-soc-slate-200 shadow-xl space-y-6 animate-in slide-in-from-right duration-200">
      {/* Top Header */}
      <div className="flex items-start justify-between border-b border-soc-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-200">
              DISAGREEMENT SIGNAL
            </span>
            <span className="text-xs font-mono text-soc-slate-400">{item.timestamp}</span>
          </div>
          <h3 className="text-lg font-bold text-soc-slate-900 mt-1">
            Target: {item.target_node}
          </h3>
          <p className="text-xs font-mono text-soc-slate-500">
            Network Context: {item.network_context}
          </p>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-soc-slate-100 text-soc-slate-400 hover:text-soc-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Model vs Rule Side-by-Side Breakdown */}
      <div className="space-y-3">
        <div className="p-4 rounded-xl bg-indigo-50/80 border border-indigo-200 space-y-1.5">
          <span className="text-[10px] font-mono font-bold uppercase text-indigo-700 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            AI Model Prediction ({formatConfidence(item.model_confidence)} Confidence)
          </span>
          <p className="text-sm font-bold text-indigo-950">{item.model_prediction}</p>
          <span className="text-[11px] font-mono text-indigo-700 block">
            Architecture: {item.model_architecture}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-soc-slate-50 border border-soc-slate-200 space-y-1.5">
          <span className="text-[10px] font-mono font-bold uppercase text-soc-slate-600 flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-soc-slate-500" />
            Deterministic Rule Engine Output
          </span>
          <p className="text-sm font-semibold text-soc-slate-900">{item.rule_output}</p>
          <span className="text-[11px] font-mono text-soc-slate-500 block">
            Rule Name: {item.rule_name} • Severity: {item.rule_severity}
          </span>
        </div>
      </div>

      {/* Why It Matters */}
      <div className="space-y-2">
        <span className="text-xs font-mono font-bold uppercase text-soc-slate-500 block">
          Why This Disagreement Matters:
        </span>
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed font-medium">
          {item.why_it_matters}
        </div>
      </div>

      {/* Observed Signals List */}
      {item.observed_signals && item.observed_signals.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-mono font-bold uppercase text-soc-slate-500 block">
            Observed Supporting Signals:
          </span>
          <ul className="space-y-1.5 text-xs text-soc-slate-700 font-medium">
            {item.observed_signals.map((sig, idx) => (
              <li key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-soc-slate-50 border border-soc-slate-200">
                <span className="w-1.5 h-1.5 rounded-full bg-soc-ai mt-1.5 shrink-0" />
                <span>{sig}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommended Action */}
      <div className="p-3.5 rounded-xl bg-soc-navy-950 text-white space-y-2">
        <span className="text-[10px] font-mono font-bold uppercase text-amber-400 block">
          Proactive Recommended Action:
        </span>
        <p className="text-xs text-soc-slate-200 leading-relaxed">
          {item.recommended_action}
        </p>
      </div>
    </div>
  );
}
