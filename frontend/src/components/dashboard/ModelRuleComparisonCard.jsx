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
    <div className="p-6 md:p-7 rounded-2xl bg-cyber-surface border border-slate-800 shadow-soc-card flex flex-col justify-between space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
              Neural AI vs Legacy Rule Verification
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
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
          <p className="text-xs text-slate-400 mt-0.5">
            Explaining why AI predictions conflict with static firewall/SIEM rules.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30 font-bold">
            {summary_stats.active_disagreements || cases.length} Conflicts Active
          </span>
        </div>
      </div>

      {/* Why AI & Rules Disagree — Plain-English Core Takeaway */}
      <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/30 text-xs text-sky-200 space-y-1.5">
        <span className="font-bold font-mono text-[11px] uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          Why Do AI and Rules Disagree?
        </span>
        <p className="leading-relaxed text-slate-300 font-medium">
          Legacy firewall and SIEM rules only trigger when a single machine exceeds a static threshold (like 1,000 failed logins). They cannot see relationship paths. <strong className="text-sky-300">ThreatCast's Graph AI</strong> encodes topological proximity across machines, detecting low-and-slow lateral hops that traditional rules ignore.
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
              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all shrink-0 border ${
                isSelected
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-sm'
                  : 'bg-cyber-card border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
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
            <div className="p-4 rounded-xl bg-cyber-card border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-400 font-mono flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-slate-400" />
                  Legacy Static Rule:
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700">
                  PASS (Benign)
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-mono">
                {activeCase.rule_verdict || activeCase.static_rule_verdict}
              </p>
              <div className="pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-400">
                <strong>Rule Limit: </strong>Threshold not breached in single 5-min window.
              </div>
            </div>

            {/* Right: ThreatCast AI Model Verdict */}
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2 shadow-sm">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-rose-400 font-mono flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                  ThreatCast AI Graph Model:
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  ALERT (High Risk)
                </span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed font-semibold">
                {activeCase.model_verdict || activeCase.ai_model_verdict}
              </p>
              <div className="pt-2 border-t border-rose-500/20 text-[10px] font-mono text-rose-300">
                <strong>Graph Evidence: </strong>Shortest path to Domain Controller compromised.
              </div>
            </div>
          </div>

          {/* Root Cause Explanation */}
          <div className="p-4 rounded-xl bg-cyber-card border border-slate-800/80 space-y-1 text-xs">
            <strong className="text-white font-mono block">Why AI Verdict is Correct:</strong>
            <p className="text-slate-300 leading-relaxed">
              {activeCase.explanation || activeCase.divergence_reason}
            </p>
          </div>

          {/* Level 3: Technical Details */}
          <ProgressiveDisclosure
            title="Technical Rule Logic & Model Embeddings"
            badge="Telemetry"
            defaultOpen={false}
          >
            <div className="space-y-1.5 font-mono text-[11px] text-slate-300">
              <div className="flex justify-between border-b border-slate-800 pb-1">
                <span className="text-slate-500">Entity ID / IP:</span>
                <span className="font-bold text-white">{activeCase.entity} ({activeCase.ip || '10.0.2.7'})</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1">
                <span className="text-slate-500">Firewall Rule ID:</span>
                <span className="font-bold text-slate-200">RULE-FW-445-LOCAL-BENIGN</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-slate-500">AI Graph Confidence:</span>
                <span className="font-bold text-sky-400">{formatConfidence(activeCase.confidence || 0.89)}</span>
              </div>
            </div>
          </ProgressiveDisclosure>
        </div>
      )}
    </div>
  );
}
