import React from 'react';
import { GitCompare, AlertTriangle, Sparkles, Shield, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatConfidence } from '../../utils/formatters';

export default function ModelRuleComparisonCard({ disagreementData }) {
  const item = disagreementData?.disagreements?.[0];

  return (
    <div className="p-6 md:p-7 rounded-2xl bg-white border border-[#ebdcc7] shadow-xs flex flex-col justify-between space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#fef3c7] border border-[#fde68a] flex items-center justify-center text-[#b45309]">
            <GitCompare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#221207] flex items-center gap-2">
              Model vs Rule Verification
              <span className="text-[10px] font-normal text-[#7a644c] font-mono">
                (Learned Neural AI vs Deterministic Signature)
              </span>
            </h3>
            <p className="text-xs text-[#544230]">
              When AI predictions and deterministic rules diverge, the disagreement becomes a primary security signal.
            </p>
          </div>
        </div>

        <Link
          to="/disagreements"
          className="text-xs font-bold text-[#b45309] hover:text-[#92400e] flex items-center gap-1 transition-colors font-mono"
        >
          <span>All Disagreements</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Side-by-side comparison boxes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* AI Model Output */}
        <div className="p-4 rounded-xl bg-[#fffbeb] border border-[#fde68a] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#b45309] uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Sparkles className="w-3.5 h-3.5 text-[#d97706]" />
              Neural AI Model Prediction
            </span>
            <span className="text-xs font-mono font-bold text-[#78350f] bg-[#fef3c7] px-2.5 py-0.5 rounded border border-[#fde68a]">
              {formatConfidence(item?.model_confidence || 0.88)}
            </span>
          </div>

          <div>
            <span className="text-sm font-bold text-[#221207] block">
              {item?.model_prediction || 'Multi-Stage Lateral Movement Campaign'}
            </span>
            <span className="text-[11px] text-[#7a644c] font-mono block mt-0.5">
              Model: {item?.model_architecture || 'LSTM-B + Graph FastRP Features'}
            </span>
          </div>
        </div>

        {/* Rule Engine Output */}
        <div className="p-4 rounded-xl bg-[#fcfaf7] border border-[#ebdcc7] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#544230] uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Shield className="w-3.5 h-3.5 text-[#7a644c]" />
              Deterministic Rule Engine
            </span>
            <span className="text-xs font-mono font-bold text-[#b45309] bg-[#fffbeb] px-2.5 py-0.5 rounded border border-[#fde68a]">
              Severity: {item?.rule_severity || 'Medium'}
            </span>
          </div>

          <div>
            <span className="text-sm font-bold text-[#301a0a] block">
              {item?.rule_output || 'Port Scan Detected'}
            </span>
            <span className="text-[11px] text-[#7a644c] font-mono block mt-0.5">
              Rule: {item?.rule_name || 'TCP SYN Port Sweep Detector'}
            </span>
          </div>
        </div>
      </div>

      {/* Disagreement Callout Banner */}
      <div className="p-4 rounded-xl bg-[#fffbeb] border border-[#fde68a] flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-[#d97706] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#92400e] font-mono">
              ⚠ MODEL–RULE DISAGREEMENT DETECTED
            </span>
            <span className="text-[10px] font-mono text-[#b45309]">Target: {item?.target_node}</span>
          </div>
          <p className="text-xs text-[#544230] leading-relaxed">
            {item?.why_it_matters ||
              'Learned AI temporal graph model and deterministic rule outputs differ. The static rule classified the activity as an isolated port sweep, whereas graph embeddings identified targeted lateral reconnaissance.'}
          </p>
        </div>
      </div>
    </div>
  );
}
