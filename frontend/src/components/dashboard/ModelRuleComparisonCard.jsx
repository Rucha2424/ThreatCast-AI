import React from 'react';
import { GitCompare, AlertTriangle, CheckCircle2, Sparkles, Shield, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatConfidence } from '../../utils/formatters';

export default function ModelRuleComparisonCard({ disagreementData }) {
  const item = disagreementData?.disagreements?.[0];

  return (
    <div className="p-6 rounded-2xl bg-white border border-soc-slate-200 shadow-soc-card flex flex-col justify-between space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-soc-ai">
            <GitCompare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-soc-slate-900 flex items-center gap-2">
              Model vs Rule Verification
              <span className="text-[10px] font-normal text-soc-slate-400">
                (Learned AI vs Deterministic Signature)
              </span>
            </h3>
            <p className="text-xs text-soc-slate-500">
              When AI predictions and deterministic rules diverge, the disagreement becomes a primary security signal.
            </p>
          </div>
        </div>

        <Link
          to="/disagreements"
          className="text-xs font-semibold text-soc-ai hover:text-soc-ai-electric flex items-center gap-1"
        >
          <span>All Disagreements</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Side-by-side comparison boxes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* AI Model Output */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50/60 to-purple-50/30 border border-indigo-200/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              AI Model Prediction
            </span>
            <span className="text-xs font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
              {formatConfidence(item?.model_confidence || 0.88)}
            </span>
          </div>

          <div>
            <span className="text-sm font-bold text-soc-slate-900 block">
              {item?.model_prediction || 'Multi-Stage Lateral Movement Campaign'}
            </span>
            <span className="text-[11px] text-soc-slate-500 font-mono block mt-0.5">
              Model: {item?.model_architecture || 'LSTM-B + Graph FastRP Features'}
            </span>
          </div>
        </div>

        {/* Rule Engine Output */}
        <div className="p-4 rounded-xl bg-soc-slate-50 border border-soc-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-soc-slate-700 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Shield className="w-3.5 h-3.5 text-soc-slate-600" />
              Deterministic Rule Engine
            </span>
            <span className="text-xs font-mono font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              Severity: {item?.rule_severity || 'Medium'}
            </span>
          </div>

          <div>
            <span className="text-sm font-bold text-soc-slate-900 block">
              {item?.rule_output || 'Port Scan Detected'}
            </span>
            <span className="text-[11px] text-soc-slate-500 font-mono block mt-0.5">
              Rule: {item?.rule_name || 'TCP SYN Port Sweep Detector'}
            </span>
          </div>
        </div>
      </div>

      {/* Disagreement Callout Banner */}
      <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/90 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-900">
              ⚠ MODEL–RULE DISAGREEMENT DETECTED
            </span>
            <span className="text-[10px] font-mono text-amber-700">Target: {item?.target_node}</span>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            {item?.why_it_matters ||
              'Learned AI temporal graph model and deterministic rule outputs differ. The static rule classified the activity as an isolated port sweep, whereas graph embeddings identified targeted lateral reconnaissance.'}
          </p>
        </div>
      </div>
    </div>
  );
}
