import React from 'react';
import { AlertTriangle, ArrowRight, ShieldCheck, Search, TrendingUp, Zap, AlertOctagon, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatConfidence } from '../../utils/formatters';
import ProgressiveDisclosure from '../common/ProgressiveDisclosure';
import InfoTooltip from '../common/InfoTooltip';

export default function EarlyWarningCard({ summary }) {
  if (!summary) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-cyber-surface border border-slate-800 p-6 md:p-8 shadow-soc-card space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 relative z-10">
        <div className="space-y-3.5 max-w-3xl flex-1">
          {/* Header Tag */}
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm">
              <Zap className="w-4 h-4 text-amber-400" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 font-mono">
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

          <h3 className="text-xl md:text-2xl font-black text-white tracking-tight">
            Potential Attack Progression Detected in Subnet
          </h3>

          {/* Narrative Overview */}
          <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
            ThreatCast AI has identified anomalous network state transitions. The observed activity{' '}
            <strong className="text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              [{summary.current_stage}]
            </strong>{' '}
            is forecasted to progress to{' '}
            <strong className="text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30">
              [{summary.next_predicted_stage}]
            </strong>{' '}
            with <strong className="text-emerald-400 font-mono">{formatConfidence(summary.forecast_confidence)} confidence</strong>.
          </p>

          {/* Key Intelligence Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
            <div className="p-3.5 rounded-xl bg-cyber-card border border-slate-800/80 space-y-1">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-sky-400" /> Time Horizon:
              </span>
              <span className="font-bold text-white block font-mono text-sm">{summary.forecast_horizon}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-cyber-card border border-slate-800/80 space-y-1">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">
                Impacted Assets:
              </span>
              <span className="font-bold text-rose-400 block font-mono text-sm">
                {summary.high_risk_node_count} Critical Nodes at Risk
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-cyber-card border border-slate-800/80 space-y-1">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">
                Security Significance:
              </span>
              <span className="font-bold text-slate-200 block truncate text-sm">
                Pre-Emptive Intervention Required
              </span>
            </div>
          </div>

          {/* Recommended Defensive Response */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-1">
            <span className="font-bold font-mono text-[11px] uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />
              What You Should Do Now:
            </span>
            <p className="text-slate-300 leading-relaxed font-medium">
              {summary.recommended_action}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 min-w-[220px] shrink-0 pt-2 lg:pt-0">
          <Link
            to="/forecast"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-sky-500/20 transition-all active:scale-95 text-center font-mono"
          >
            <TrendingUp className="w-4 h-4 text-sky-200" />
            <span>View K=3 Forecast</span>
          </Link>
          <Link
            to="/network-graph"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyber-card hover:bg-slate-800 text-slate-200 text-xs sm:text-sm font-bold border border-slate-700 transition-colors text-center font-mono"
          >
            <Search className="w-4 h-4 text-slate-400" />
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
        <div className="space-y-1.5 font-mono text-[11px] text-slate-300">
          <div className="flex justify-between border-b border-slate-800 pb-1">
            <span className="text-slate-500">Current MITRE Tactic:</span>
            <span className="font-bold text-slate-200">{summary.current_stage_tactic}</span>
          </div>
          <div className="flex justify-between border-b border-slate-800 pb-1">
            <span className="text-slate-500">Next Predicted Tactic:</span>
            <span className="font-bold text-sky-400">{summary.next_predicted_tactic}</span>
          </div>
          <div className="flex justify-between border-b border-slate-800 pb-1">
            <span className="text-slate-500">Active Threats Count:</span>
            <span className="font-bold text-rose-400">{summary.active_threat_count} Identified</span>
          </div>
          <div className="flex justify-between pt-1">
            <span className="text-slate-500">Model Engine:</span>
            <span className="font-bold text-emerald-400">LSTM-B with FastRP Topological Embeddings</span>
          </div>
        </div>
      </ProgressiveDisclosure>
    </div>
  );
}
