import React from 'react';
import { AlertTriangle, ArrowRight, ShieldCheck, Search, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatConfidence } from '../../utils/formatters';

export default function EarlyWarningCard({ summary }) {
  if (!summary) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300 p-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-100 text-amber-800">
              <AlertTriangle className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800 font-mono">
              EARLY WARNING SYSTEM • PROACTIVE DEFENCE TRIGGER
            </span>
          </div>

          <h3 className="text-lg font-bold text-soc-slate-900">
            Potential Attack Progression Detected in Subnet
          </h3>

          <p className="text-xs md:text-sm text-soc-slate-600 leading-relaxed">
            ThreatCast AI has identified anomalous network state transitions. Current observed state{' '}
            <strong className="text-soc-slate-900">[{summary.current_stage}]</strong> is forecasted to transition to{' '}
            <strong className="text-indigo-600">[{summary.next_predicted_stage}]</strong> with{' '}
            <strong className="text-soc-slate-900">{formatConfidence(summary.forecast_confidence)} confidence</strong>.
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs pt-1 text-soc-slate-600 font-mono">
            <span>• Horizon: {summary.forecast_horizon}</span>
            <span>• Active Threats: {summary.active_threat_count}</span>
            <span>• Impact: Critical Assets at Risk</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 min-w-[200px]">
          <Link
            to="/forecast"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-soc-navy-900 hover:bg-soc-navy-850 text-white text-xs font-semibold shadow transition-all active:scale-95 text-center"
          >
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            <span>View K=3 Forecast</span>
          </Link>
          <Link
            to="/network-graph"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-soc-slate-50 text-soc-slate-800 text-xs font-semibold border border-soc-slate-300 shadow-sm transition-colors text-center"
          >
            <Search className="w-4 h-4 text-soc-slate-500" />
            <span>Investigate Network</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
