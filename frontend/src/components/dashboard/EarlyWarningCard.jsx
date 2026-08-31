import React from 'react';
import { AlertTriangle, ArrowRight, ShieldCheck, Search, TrendingUp, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatConfidence } from '../../utils/formatters';

export default function EarlyWarningCard({ summary }) {
  if (!summary) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyber-maroon-950/90 via-cyber-black/95 to-cyber-burgundy-950/90 border border-cyber-maroon-700/80 p-6 md:p-8 shadow-2xl backdrop-blur-md">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        <div className="space-y-2.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-rose-950/80 text-rose-400 border border-rose-600/40 shadow-[0_0_12px_rgba(244,63,94,0.3)]">
              <Zap className="w-4 h-4 text-rose-400 animate-pulse" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400 font-mono">
              EARLY WARNING SYSTEM • NEURAL ATTACK FORECAST TRIGGER
            </span>
          </div>

          <h3 className="text-xl font-bold text-white tracking-tight">
            Potential Attack Progression Detected in Subnet
          </h3>

          <p className="text-xs md:text-sm text-cyber-grey-300 leading-relaxed">
            ThreatCast AI has identified anomalous network state transitions. Current observed state{' '}
            <strong className="text-white bg-cyber-maroon-900/60 px-1.5 py-0.5 rounded border border-cyber-maroon-700">[{summary.current_stage}]</strong> is forecasted to transition to{' '}
            <strong className="text-rose-300 bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-700/60">[{summary.next_predicted_stage}]</strong> with{' '}
            <strong className="text-emerald-400">{formatConfidence(summary.forecast_confidence)} confidence</strong>.
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs pt-1 text-cyber-grey-400 font-mono">
            <span>• Horizon: {summary.forecast_horizon}</span>
            <span>• Active Threats: {summary.active_threat_count}</span>
            <span>• Impact: Critical Assets at Risk</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 min-w-[210px]">
          <Link
            to="/forecast"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyber-maroon-700 to-rose-700 hover:from-cyber-maroon-600 hover:to-rose-600 text-white text-xs font-bold shadow-lg shadow-rose-950/50 transition-all active:scale-95 text-center border border-rose-500/30"
          >
            <TrendingUp className="w-4 h-4 text-rose-200" />
            <span>View K=3 Forecast</span>
          </Link>
          <Link
            to="/network-graph"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyber-black hover:bg-cyber-maroon-950 text-cyber-grey-200 text-xs font-bold border border-cyber-maroon-800 shadow-md transition-colors text-center"
          >
            <Search className="w-4 h-4 text-cyber-grey-400" />
            <span>Investigate Network</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
