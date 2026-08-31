import React from 'react';
import { AlertTriangle, ArrowRight, ShieldCheck, Search, TrendingUp, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatConfidence } from '../../utils/formatters';

export default function EarlyWarningCard({ summary }) {
  if (!summary) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white border border-[#ebdcc7] p-6 md:p-8 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        <div className="space-y-2.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-[#fef3c7] text-[#b45309] border border-[#fde68a]">
              <Zap className="w-4 h-4 text-[#d97706]" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#b45309] font-mono">
              EARLY WARNING SYSTEM • NEURAL ATTACK FORECAST TRIGGER
            </span>
          </div>

          <h3 className="text-xl font-bold text-[#221207] tracking-tight">
            Potential Attack Progression Detected in Subnet
          </h3>

          <p className="text-xs md:text-sm text-[#42240f] leading-relaxed">
            ThreatCast AI has identified anomalous network state transitions. Current observed state{' '}
            <strong className="text-[#221207] bg-[#f5efe6] px-1.5 py-0.5 rounded border border-[#ded0bc]">[{summary.current_stage}]</strong> is forecasted to transition to{' '}
            <strong className="text-[#92400e] bg-[#fef3c7] px-1.5 py-0.5 rounded border border-[#fde68a]">[{summary.next_predicted_stage}]</strong> with{' '}
            <strong className="text-[#4d7c0f]">{formatConfidence(summary.forecast_confidence)} confidence</strong>.
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs pt-1 text-[#7a644c] font-mono">
            <span>• Horizon: {summary.forecast_horizon}</span>
            <span>• Active Threats: {summary.active_threat_count}</span>
            <span>• Impact: Critical Assets at Risk</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 min-w-[210px]">
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
            <span>Investigate Network</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
