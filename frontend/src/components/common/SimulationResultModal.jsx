import React from 'react';
import {
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Clock,
  TrendingUp,
  Search,
  X,
  AlertOctagon,
  Lock,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { SCENARIOS } from '../../utils/constants';
import ProgressiveDisclosure from './ProgressiveDisclosure';

export default function SimulationResultModal({
  isOpen,
  onClose,
  scenarioId = 'default',
  forecastSummary,
}) {
  if (!isOpen) return null;

  const scenario = SCENARIOS.find((s) => s.id === scenarioId) || SCENARIOS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-cyber-surface rounded-2xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[90vh] text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 bg-cyber-card border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  Simulation Complete & Analyzed
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  {scenario.badge}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Scenario: <strong className="text-white">{scenario.name}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Section 1: What Happened? */}
          <div className="p-4 rounded-xl bg-cyber-card border border-slate-800 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-rose-400">
                1. What Happened in the Network?
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
              {scenario.whatWillHappen}
            </p>
          </div>

          {/* Section 2: What Did ThreatCast Predict? */}
          <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-400" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-sky-300">
                  2. What ThreatCast AI Predicted
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                Multi-Step Forecast
              </span>
            </div>
            <p className="text-xs sm:text-sm text-sky-200 leading-relaxed font-semibold">
              {scenario.whatThreatCastShows}
            </p>
          </div>

          {/* Section 3: Why Does It Matter? */}
          <div className="p-4 rounded-xl bg-cyber-card border border-slate-800 space-y-1.5">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
              3. Why Does This Matter? (Security Impact)
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {scenario.whyItMatters}
            </p>
          </div>

          {/* Section 4: Recommended Proactive Actions */}
          <div className="space-y-2">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <AlertOctagon className="w-3.5 h-3.5 text-sky-400" />
              4. Recommended Actions (What You Should Do Now)
            </h3>
            <div className="space-y-2">
              {scenario.recommendedActions.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-cyber-card border border-slate-800/80 flex items-start gap-2.5 text-xs shadow-sm"
                >
                  <span className="w-5 h-5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30 flex items-center justify-center font-mono font-bold text-[11px] shrink-0">
                    {idx + 1}
                  </span>
                  <div className="space-y-0.5">
                    <strong className="text-white block">{item.action}</strong>
                    <span className="text-[11px] text-slate-400 block">
                      <strong className="text-slate-300">Why this action: </strong>
                      {item.why}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: Technical Details ▾ */}
          <ProgressiveDisclosure
            title="Technical Telemetry & Model Evidence"
            badge="Graph Parameters"
            defaultOpen={false}
          >
            <div className="space-y-2 font-mono text-[11px] text-slate-300">
              <div className="flex justify-between border-b border-slate-800 pb-1">
                <span className="text-slate-500">Initial Tactic:</span>
                <span className="font-bold text-white">{scenario.technicalDetails.initialTactic}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1">
                <span className="text-slate-500">Source Endpoint:</span>
                <span className="font-bold text-white">{scenario.technicalDetails.sourceEndpoint}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1">
                <span className="text-slate-500">Target Trajectory:</span>
                <span className="font-bold text-white">{scenario.technicalDetails.targetEndpoint}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1">
                <span className="text-slate-500">Predicted Hops:</span>
                <span className="font-bold text-sky-400">{scenario.technicalDetails.predictedHops}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-slate-500">ML Model:</span>
                <span className="font-bold text-emerald-400">{scenario.technicalDetails.modelUsed}</span>
              </div>
            </div>
          </ProgressiveDisclosure>
        </div>

        {/* Footer with Action Navigation */}
        <div className="px-6 py-4 bg-cyber-card border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-700 bg-cyber-surface hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold font-mono transition-colors"
          >
            Acknowledge & Close
          </button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <Link
              to="/forecast"
              onClick={onClose}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs sm:text-sm font-bold font-mono shadow-lg shadow-sky-500/25 transition-all active:scale-95"
            >
              <TrendingUp className="w-3.5 h-3.5 text-sky-200" />
              <span>Inspect Forecast (K=3)</span>
            </Link>
            <Link
              to="/network-graph"
              onClick={onClose}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyber-surface hover:bg-slate-800 text-slate-200 text-xs sm:text-sm font-bold border border-slate-700 font-mono transition-colors"
            >
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>Explore Graph</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
