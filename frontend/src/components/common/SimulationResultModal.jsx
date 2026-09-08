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

/**
 * SimulationResultModal — Post-Simulation narrative explaining what happened,
 * what the AI forecasted, why it matters, and what to do next.
 */
export default function SimulationResultModal({
  isOpen,
  onClose,
  scenarioId = 'default',
  forecastSummary,
}) {
  if (!isOpen) return null;

  const scenario = SCENARIOS.find((s) => s.id === scenarioId) || SCENARIOS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-[#ebdcc7] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 bg-[#fcfaf7] border-b border-[#ebdcc7]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#ecfccb] border border-[#d9f99d] flex items-center justify-center text-[#65a30d]">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-[#221207]">
                  Simulation Complete & Analyzed
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-[#fef3c7] text-[#b45309] border border-[#fde68a]">
                  {scenario.badge}
                </span>
              </div>
              <p className="text-xs text-[#7a644c]">
                Scenario: <strong className="text-[#301a0a]">{scenario.name}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#f5efe6] text-[#7a644c] hover:text-[#221207] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Section 1: What Happened? */}
          <div className="p-4 rounded-xl bg-[#fcfaf7] border border-[#ebdcc7] space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#ea580c]" />
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#7a644c]">
                1. What Happened in the Network?
              </h3>
            </div>
            <p className="text-xs md:text-sm text-[#301a0a] leading-relaxed font-medium">
              {scenario.whatWillHappen}
            </p>
          </div>

          {/* Section 2: What Did ThreatCast Predict? */}
          <div className="p-4 rounded-xl bg-[#fffbeb] border border-[#fde68a] space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#d97706]" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#92400e]">
                  2. What ThreatCast AI Predicted
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#fef3c7] text-[#b45309] border border-[#fde68a]">
                Multi-Step Forecast
              </span>
            </div>
            <p className="text-xs md:text-sm text-[#544230] leading-relaxed font-semibold">
              {scenario.whatThreatCastShows}
            </p>
          </div>

          {/* Section 3: Why Does It Matter? */}
          <div className="p-4 rounded-xl bg-[#fdfaf5] border border-[#ebdcc7] space-y-1.5">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#b45309]">
              3. Why Does This Matter? (Security Impact)
            </h3>
            <p className="text-xs text-[#544230] leading-relaxed">
              {scenario.whyItMatters}
            </p>
          </div>

          {/* Section 4: Recommended Proactive Actions */}
          <div className="space-y-2">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#7a644c] flex items-center gap-1.5">
              <AlertOctagon className="w-3.5 h-3.5 text-[#b45309]" />
              4. Recommended Actions (What You Should Do Now)
            </h3>
            <div className="space-y-2">
              {scenario.recommendedActions.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-white border border-[#ebdcc7] flex items-start gap-2.5 text-xs shadow-2xs"
                >
                  <span className="w-5 h-5 rounded-full bg-[#fef3c7] text-[#b45309] flex items-center justify-center font-mono font-bold text-[11px] shrink-0">
                    {idx + 1}
                  </span>
                  <div className="space-y-0.5">
                    <strong className="text-[#221207] block">{item.action}</strong>
                    <span className="text-[11px] text-[#7a644c] block">
                      <strong className="text-[#998165]">Why this action: </strong>
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
            <div className="space-y-2 font-mono text-[11px] text-[#544230]">
              <div className="flex justify-between border-b border-[#f5efe6] pb-1">
                <span className="text-[#7a644c]">Initial Tactic:</span>
                <span className="font-bold text-[#221207]">{scenario.technicalDetails.initialTactic}</span>
              </div>
              <div className="flex justify-between border-b border-[#f5efe6] pb-1">
                <span className="text-[#7a644c]">Source Endpoint:</span>
                <span className="font-bold text-[#221207]">{scenario.technicalDetails.sourceEndpoint}</span>
              </div>
              <div className="flex justify-between border-b border-[#f5efe6] pb-1">
                <span className="text-[#7a644c]">Target Trajectory:</span>
                <span className="font-bold text-[#221207]">{scenario.technicalDetails.targetEndpoint}</span>
              </div>
              <div className="flex justify-between border-b border-[#f5efe6] pb-1">
                <span className="text-[#7a644c]">Predicted Hops:</span>
                <span className="font-bold text-[#b45309]">{scenario.technicalDetails.predictedHops}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-[#7a644c]">ML Model:</span>
                <span className="font-bold text-[#221207]">{scenario.technicalDetails.modelUsed}</span>
              </div>
            </div>
          </ProgressiveDisclosure>
        </div>

        {/* Footer with Action Navigation */}
        <div className="px-6 py-4 bg-[#fcfaf7] border-t border-[#ebdcc7] flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[#ebdcc7] bg-white hover:bg-[#f5efe6] text-[#42240f] text-xs font-bold font-mono transition-colors"
          >
            Acknowledge & Close
          </button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <Link
              to="/forecast"
              onClick={onClose}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#b45309] hover:bg-[#92400e] text-white text-xs font-bold font-mono shadow-xs transition-all active:scale-95"
            >
              <TrendingUp className="w-3.5 h-3.5 text-amber-200" />
              <span>Inspect Forecast (K=3)</span>
            </Link>
            <Link
              to="/network-graph"
              onClick={onClose}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-[#f5efe6] text-[#42240f] text-xs font-bold border border-[#ebdcc7] font-mono transition-colors"
            >
              <Search className="w-3.5 h-3.5 text-[#7a644c]" />
              <span>Explore Graph</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
