import React from 'react';
import { AlertTriangle, ArrowRight, ShieldCheck, Search, TrendingUp, Zap, AlertOctagon, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatConfidence } from '../../utils/formatters';
import ProgressiveDisclosure from '../common/ProgressiveDisclosure';
import InfoTooltip from '../common/InfoTooltip';

export default function EarlyWarningCard({ summary }) {
  if (!summary) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white border border-[#ebdcc7] p-6 md:p-8 shadow-xs space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 relative z-10">
        <div className="space-y-3.5 max-w-3xl flex-1">
          {/* Header Tag */}
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-[#fef3c7] text-[#b45309] border border-[#fde68a] shadow-2xs">
              <Zap className="w-4 h-4 text-[#d97706]" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#b45309] font-mono">
              EARLY WARNING SYSTEM • NEURAL ATTACK FORECAST TRIGGER
            </span>
            <InfoTooltip
              title="Early Warning Trigger"
              whatItMeasures="Early detection threshold tripped when Graph AI confidence for multi-step lateral movement or exfiltration exceeds 80%."
              whyItMatters="Gives defenders an actionable time window to intervene before the attacker executes their objective."
              interpretation="Provides pre-emptive notice rather than post-incident alert."
              size="sm"
            />
          </div>

          <h3 className="text-xl md:text-2xl font-black text-[#221207] tracking-tight">
            Potential Attack Progression Detected in Subnet
          </h3>

          {/* Narrative Overview */}
          <p className="text-xs md:text-sm text-[#42240f] leading-relaxed">
            ThreatCast AI has identified anomalous network state transitions. The observed activity{' '}
            <strong className="text-[#221207] bg-[#f5efe6] px-1.5 py-0.5 rounded border border-[#ded0bc]">
              [{summary.current_stage}]
            </strong>{' '}
            is forecasted to progress to{' '}
            <strong className="text-[#92400e] bg-[#fef3c7] px-1.5 py-0.5 rounded border border-[#fde68a]">
              [{summary.next_predicted_stage}]
            </strong>{' '}
            with <strong className="text-[#4d7c0f] font-mono">{formatConfidence(summary.forecast_confidence)} confidence</strong>.
          </p>

          {/* Key Intelligence Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
            <div className="p-3 rounded-xl bg-[#fcfaf7] border border-[#ebdcc7] space-y-1">
              <span className="text-[10px] font-mono uppercase font-bold text-[#7a644c] flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#b45309]" /> Time Horizon:
              </span>
              <span className="font-bold text-[#221207] block font-mono">{summary.forecast_horizon}</span>
            </div>

            <div className="p-3 rounded-xl bg-[#fcfaf7] border border-[#ebdcc7] space-y-1">
              <span className="text-[10px] font-mono uppercase font-bold text-[#7a644c] block">
                Impacted Assets:
              </span>
              <span className="font-bold text-[#ea580c] block font-mono">
                {summary.high_risk_node_count} Critical Nodes at Risk
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#fcfaf7] border border-[#ebdcc7] space-y-1">
              <span className="text-[10px] font-mono uppercase font-bold text-[#7a644c] block">
                Security Significance:
              </span>
              <span className="font-bold text-[#221207] block truncate">
                Pre-Emptive Intervention Required
              </span>
            </div>
          </div>

          {/* Recommended Defensive Response */}
          <div className="p-3.5 rounded-xl bg-[#fffbeb] border border-[#fde68a] text-xs text-[#78350f] space-y-1">
            <span className="font-bold font-mono text-[11px] uppercase tracking-wider text-[#b45309] flex items-center gap-1.5">
              <AlertOctagon className="w-3.5 h-3.5 text-[#d97706]" />
              What You Should Do Now:
            </span>
            <p className="text-[#544230] leading-relaxed font-medium">
              {summary.recommended_action}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 min-w-[220px] shrink-0 pt-2 lg:pt-0">
          <Link
            to="/forecast"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#b45309] hover:bg-[#92400e] text-white text-xs font-bold shadow-xs transition-all active:scale-95 text-center font-mono"
          >
            <TrendingUp className="w-4 h-4 text-amber-200" />
            <span>View K=3 Forecast</span>
          </Link>
          <Link
            to="/network-graph"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-[#f5efe6] text-[#42240f] text-xs font-bold border border-[#ebdcc7] transition-colors text-center font-mono"
          >
            <Search className="w-4 h-4 text-[#7a644c]" />
            <span>Investigate Topology</span>
          </Link>
        </div>
      </div>

      {/* Level 3: Expandable Technical Telemetry */}
      <ProgressiveDisclosure
        title="Technical Signal Analysis & Model Identifiers"
        badge="Evidence"
        defaultOpen={false}
      >
        <div className="space-y-1.5 font-mono text-[11px] text-[#544230]">
          <div className="flex justify-between border-b border-[#f5efe6] pb-1">
            <span className="text-[#7a644c]">Current MITRE Tactic:</span>
            <span className="font-bold text-[#221207]">{summary.current_stage_tactic}</span>
          </div>
          <div className="flex justify-between border-b border-[#f5efe6] pb-1">
            <span className="text-[#7a644c]">Next Predicted Tactic:</span>
            <span className="font-bold text-[#b45309]">{summary.next_predicted_tactic}</span>
          </div>
          <div className="flex justify-between border-b border-[#f5efe6] pb-1">
            <span className="text-[#7a644c]">Active Threats Count:</span>
            <span className="font-bold text-[#221207]">{summary.active_threat_count} Identified</span>
          </div>
          <div className="flex justify-between pt-1">
            <span className="text-[#7a644c]">Model Engine:</span>
            <span className="font-bold text-[#221207]">LSTM-B with FastRP Topological Embeddings</span>
          </div>
        </div>
      </ProgressiveDisclosure>
    </div>
  );
}
