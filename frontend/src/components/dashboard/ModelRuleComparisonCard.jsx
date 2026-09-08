import React, { useState } from 'react';
import {
  GitCompare,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Shield,
  ArrowRight,
  Info,
  ShieldAlert,
} from 'lucide-react';
import { formatConfidence } from '../../utils/formatters';
import InfoTooltip from '../common/InfoTooltip';
import ProgressiveDisclosure from '../common/ProgressiveDisclosure';

export default function ModelRuleComparisonCard({ disagreementData }) {
  const [selectedCaseId, setSelectedCaseId] = useState('case-01');

  if (!disagreementData) return null;

  const { cases = [], summary_stats = {} } = disagreementData;
  const activeCase = cases.find((c) => c.case_id === selectedCaseId) || cases[0];

  return (
    <div className="p-6 md:p-7 rounded-2xl bg-white border border-[#ebdcc7] shadow-xs flex flex-col justify-between space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#ebdcc7] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[#221207] tracking-tight flex items-center gap-2">
              Neural AI vs Legacy Rule Verification
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#fef3c7] text-[#b45309] border border-[#fde68a]">
              Disagreement Engine
            </span>
            <InfoTooltip
              title="Model vs Rule Disagreements"
              whatItMeasures="Identifies attacks where Graph AI detects a threat that traditional static firewall/SIEM rules miss."
              whyItMatters="Legacy rules look only at isolated threshold spikes. Graph AI analyzes topological path context, catching stealthy multi-step pivots."
              interpretation="Disagreements expose blind spots in traditional rule-based defenses."
              size="sm"
            />
          </div>
          <p className="text-xs text-[#544230] mt-0.5">
            Explaining why AI predictions conflict with static firewall/SIEM rules.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-[#fff7ed] text-[#c2410c] border border-[#fdba74] font-bold">
            {summary_stats.active_disagreements || cases.length} Conflicts Active
          </span>
        </div>
      </div>

      {/* Why AI & Rules Disagree — Plain-English Core Takeaway */}
      <div className="p-4 rounded-xl bg-[#fffbeb] border border-[#fde68a] text-xs text-[#78350f] space-y-1.5">
        <span className="font-bold font-mono text-[11px] uppercase tracking-wider text-[#b45309] flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#d97706]" />
          Why Do AI and Rules Disagree?
        </span>
        <p className="leading-relaxed text-[#544230] font-medium">
          Legacy firewall and SIEM rules only trigger when a single machine exceeds a static threshold (like 1,000 failed logins). They cannot see relationship paths. <strong className="text-[#221207]">ThreatCast's Graph AI</strong> encodes topological proximity across machines, detecting low-and-slow lateral hops that traditional rules ignore.
        </p>
      </div>

      {/* Case Selector Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {cases.map((c) => {
          const isSelected = selectedCaseId === c.case_id;
          return (
            <button
              key={c.case_id}
              onClick={() => setSelectedCaseId(c.case_id)}
              className={`px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all shrink-0 border ${
                isSelected
                  ? 'bg-[#b45309] text-white border-[#b45309] shadow-xs'
                  : 'bg-[#fcfaf7] text-[#544230] border-[#ebdcc7] hover:bg-[#f5efe6]'
              }`}
            >
              {c.case_id.toUpperCase()} • {c.entity}
            </button>
          );
        })}
      </div>

      {/* Side-by-Side Comparison Grid */}
      {activeCase && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Left: Traditional Rule Engine Verdict */}
            <div className="p-4 rounded-xl bg-[#fcfaf7] border border-[#ebdcc7] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#7a644c] font-mono flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  Legacy Static Rule:
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#f5efe6] text-[#7a644c] border border-[#ded0bc]">
                  PASS (Benign)
                </span>
              </div>
              <p className="text-xs text-[#544230] leading-relaxed font-mono">
                {activeCase.rule_verdict || activeCase.static_rule_verdict}
              </p>
              <div className="pt-2 border-t border-[#ebdcc7] text-[10px] font-mono text-[#7a644c]">
                <strong>Rule Limit: </strong>Threshold not breached in single 5-min window.
              </div>
            </div>

            {/* Right: ThreatCast AI Model Verdict */}
            <div className="p-4 rounded-xl bg-[#fffdfa] border border-[#fde68a] space-y-2 shadow-2xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#b45309] font-mono flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#d97706]" />
                  ThreatCast AI Graph Model:
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#ffedd5] text-[#c2410c] border border-[#fdba74]">
                  ALERT (High Risk)
                </span>
              </div>
              <p className="text-xs text-[#221207] leading-relaxed font-semibold">
                {activeCase.model_verdict || activeCase.ai_model_verdict}
              </p>
              <div className="pt-2 border-t border-[#ebdcc7] text-[10px] font-mono text-[#b45309]">
                <strong>Graph Evidence: </strong>Shortest path to Domain Controller compromised.
              </div>
            </div>
          </div>

          {/* Root Cause Explanation */}
          <div className="p-4 rounded-xl bg-[#fdfcf9] border border-[#ebdcc7] space-y-1 text-xs">
            <strong className="text-[#221207] font-mono block">Why AI Verdict is Correct:</strong>
            <p className="text-[#544230] leading-relaxed">
              {activeCase.explanation || activeCase.divergence_reason}
            </p>
          </div>

          {/* Level 3: Technical Details */}
          <ProgressiveDisclosure
            title="Technical Rule Logic & Model Embeddings"
            badge="Telemetry"
            defaultOpen={false}
          >
            <div className="space-y-1.5 font-mono text-[11px] text-[#544230]">
              <div className="flex justify-between border-b border-[#f5efe6] pb-1">
                <span className="text-[#7a644c]">Entity ID / IP:</span>
                <span className="font-bold text-[#221207]">{activeCase.entity} ({activeCase.ip || '10.0.2.7'})</span>
              </div>
              <div className="flex justify-between border-b border-[#f5efe6] pb-1">
                <span className="text-[#7a644c]">Firewall Rule ID:</span>
                <span className="font-bold text-[#221207]">RULE-FW-445-LOCAL-BENIGN</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-[#7a644c]">AI Graph Confidence:</span>
                <span className="font-bold text-[#b45309]">{formatConfidence(activeCase.confidence || 0.89)}</span>
              </div>
            </div>
          </ProgressiveDisclosure>
        </div>
      )}
    </div>
  );
}
