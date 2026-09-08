import React, { useState } from 'react';
import {
  Zap,
  X,
  ShieldAlert,
  CheckCircle2,
  RotateCcw,
  Play,
  ChevronDown,
  Info,
  Sparkles,
  ArrowRight,
  Code2,
  AlertOctagon,
} from 'lucide-react';
import { SCENARIOS } from '../../utils/constants';
import { simulateAttack, resetSimulation } from '../../services/api';
import ProgressiveDisclosure from './ProgressiveDisclosure';

export default function SimModal({ isOpen, onClose, onSimulated, onShowResult }) {
  const [selectedScenario, setSelectedScenario] = useState('lateral_movement_wave');
  const [expandedDetailsId, setExpandedDetailsId] = useState('lateral_movement_wave');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  if (!isOpen) return null;

  const currentScenarioObj = SCENARIOS.find((s) => s.id === selectedScenario) || SCENARIOS[0];

  const handleSimulate = async () => {
    setSubmitting(true);
    setSuccessMessage(null);
    try {
      const res = await simulateAttack(selectedScenario);
      setSuccessMessage(res.message);
      if (onSimulated) onSimulated(selectedScenario);

      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
        if (onShowResult) {
          onShowResult(selectedScenario);
        }
      }, 700);
    } catch (err) {
      console.error('Failed to trigger attack simulation:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async () => {
    setSubmitting(true);
    setSuccessMessage(null);
    try {
      const res = await resetSimulation();
      setSelectedScenario('default');
      setSuccessMessage('Pipeline reset to default baseline.');
      if (onSimulated) onSimulated('default');
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
        if (onShowResult) {
          onShowResult('default');
        }
      }, 700);
    } catch (err) {
      console.error('Failed to reset simulation:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-[#ebdcc7] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 bg-[#fcfaf7] border-b border-[#ebdcc7]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#fef3c7] border border-[#fde68a] flex items-center justify-center text-[#b45309]">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-[#221207] flex items-center gap-2">
                Live Attack Simulation Playbook
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-[#fef3c7] text-[#b45309] border border-[#fde68a]">
                  SIH Demo Engine
                </span>
              </h2>
              <p className="text-xs text-[#7a644c]">
                Choose an attack progression playbook to test ThreatCast AI's predictive early warning.
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

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Instructions Box */}
          <div className="p-3.5 rounded-xl bg-[#fcfaf7] border border-[#ebdcc7] text-xs text-[#544230] flex items-start gap-2.5">
            <Info className="w-4 h-4 text-[#b45309] shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-[#221207]">How Simulation Works: </strong>
              Each playbook simulates a real-world multi-stage attack. ThreatCast tracks the observed state in real time and projects the next 3 stages (<span className="font-mono font-bold text-[#b45309]">K=3: T+1, T+2, T+3</span>) before damage can occur.
            </p>
          </div>

          {/* Scenario Cards */}
          <div className="space-y-3">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#7a644c] block">
              1. Select a Scenario Playbook:
            </span>

            {SCENARIOS.map((sc) => {
              const isSelected = selectedScenario === sc.id;
              const isExpanded = expandedDetailsId === sc.id;

              return (
                <div
                  key={sc.id}
                  className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                    isSelected
                      ? 'border-[#b45309] bg-[#fffdfa] ring-2 ring-[#b45309]/30 shadow-xs'
                      : 'border-[#ebdcc7] bg-white hover:bg-[#fcfaf7]'
                  }`}
                >
                  {/* Card Header / Selection Area */}
                  <div
                    onClick={() => {
                      setSelectedScenario(sc.id);
                      setExpandedDetailsId(sc.id);
                    }}
                    className="p-4 cursor-pointer flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="scenario"
                        checked={isSelected}
                        onChange={() => {
                          setSelectedScenario(sc.id);
                          setExpandedDetailsId(sc.id);
                        }}
                        className="w-4 h-4 accent-[#b45309] cursor-pointer"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-[#221207] tracking-tight">{sc.name}</h3>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                              sc.severity === 'Emergency'
                                ? 'bg-[#fee2e2] text-[#dc2626] border border-[#fca5a5]'
                                : sc.severity === 'Critical'
                                ? 'bg-[#ffedd5] text-[#c2410c] border border-[#fdba74]'
                                : 'bg-[#fef3c7] text-[#b45309] border border-[#fde68a]'
                            }`}
                          >
                            {sc.badge}
                          </span>
                        </div>
                        <p className="text-xs text-[#544230] mt-0.5">{sc.shortSummary}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedDetailsId(isExpanded ? null : sc.id);
                      }}
                      className="text-xs text-[#7a644c] hover:text-[#b45309] flex items-center gap-1 font-mono shrink-0 px-2 py-1 rounded hover:bg-[#f5efe6]"
                    >
                      <span>{isExpanded ? 'Hide' : 'Explain'}</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180 text-[#b45309]' : ''
                        }`}
                      />
                    </button>
                  </div>

                  {/* Expanded Structured Explanation */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-1 border-t border-[#ebdcc7] bg-[#fcfaf7] space-y-3 text-xs">
                      {/* What is this? */}
                      <div className="p-3 rounded-lg bg-white border border-[#ebdcc7] space-y-1">
                        <span className="text-[10px] font-mono uppercase font-bold text-[#7a644c] block">
                          What is this Scenario?
                        </span>
                        <p className="text-[#301a0a] leading-relaxed">{sc.whatIsIt}</p>
                      </div>

                      {/* What will happen? */}
                      <div className="p-3 rounded-lg bg-white border border-[#ebdcc7] space-y-1">
                        <span className="text-[10px] font-mono uppercase font-bold text-[#c2410c] block">
                          What Will Happen During the Simulation?
                        </span>
                        <p className="text-[#301a0a] leading-relaxed">{sc.whatWillHappen}</p>
                      </div>

                      {/* What will ThreatCast show? */}
                      <div className="p-3 rounded-lg bg-[#fffbeb] border border-[#fde68a] space-y-1">
                        <span className="text-[10px] font-mono uppercase font-bold text-[#b45309] block flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-[#d97706]" />
                          What Will ThreatCast AI Show & Predict?
                        </span>
                        <p className="text-[#78350f] font-semibold leading-relaxed">
                          {sc.whatThreatCastShows}
                        </p>
                      </div>

                      {/* Why does it matter & What it demonstrates */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div className="p-3 rounded-lg bg-white border border-[#ebdcc7] space-y-1">
                          <span className="text-[10px] font-mono uppercase font-bold text-[#b45309] block">
                            Why Does It Matter?
                          </span>
                          <p className="text-[#544230] leading-relaxed">{sc.whyItMatters}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-white border border-[#ebdcc7] space-y-1">
                          <span className="text-[10px] font-mono uppercase font-bold text-[#7a644c] block">
                            What This Demonstrates
                          </span>
                          <p className="text-[#544230] leading-relaxed">{sc.whatItDemonstrates}</p>
                        </div>
                      </div>

                      {/* Technical Details ▾ */}
                      <ProgressiveDisclosure
                        title="Technical Details & MITRE Mapping"
                        badge="Advanced"
                        defaultOpen={false}
                      >
                        <div className="space-y-1.5 font-mono text-[11px] text-[#544230]">
                          <div className="flex justify-between border-b border-[#f5efe6] pb-1">
                            <span className="text-[#7a644c]">Technique / Tactic:</span>
                            <span className="font-bold text-[#221207]">{sc.technicalDetails.initialTactic}</span>
                          </div>
                          <div className="flex justify-between border-b border-[#f5efe6] pb-1">
                            <span className="text-[#7a644c]">Source Entity:</span>
                            <span className="font-bold text-[#221207]">{sc.technicalDetails.sourceEndpoint}</span>
                          </div>
                          <div className="flex justify-between border-b border-[#f5efe6] pb-1">
                            <span className="text-[#7a644c]">Target Trajectory:</span>
                            <span className="font-bold text-[#221207]">{sc.technicalDetails.targetEndpoint}</span>
                          </div>
                          <div className="flex justify-between pt-1">
                            <span className="text-[#7a644c]">ML Model:</span>
                            <span className="font-bold text-[#b45309]">{sc.technicalDetails.modelUsed}</span>
                          </div>
                        </div>
                      </ProgressiveDisclosure>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Step 13: Live Pre-Simulation Preview Card */}
          <div className="p-4 rounded-xl bg-[#fffbeb] border border-[#fde68a] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#92400e] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#d97706]" />
                2. Pre-Simulation Execution Preview:
              </span>
              <span className="text-[10px] font-mono text-[#78350f] font-semibold">
                Ready to Trigger
              </span>
            </div>

            <p className="text-xs text-[#544230]">
              Selecting <strong className="text-[#221207]">"{currentScenarioObj.name}"</strong> will execute the following steps in ThreatCast AI:
            </p>

            <div className="space-y-1.5 pt-1">
              {currentScenarioObj.preSimulationSteps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-[#42240f] font-medium">
                  <ArrowRight className="w-3.5 h-3.5 text-[#b45309] shrink-0 mt-0.5" />
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#fcfaf7] border-t border-[#ebdcc7] flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={handleReset}
            disabled={submitting}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[#ebdcc7] bg-white hover:bg-[#f5efe6] text-[#7a644c] hover:text-[#221207] text-xs font-bold font-mono transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Baseline</span>
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-[#7a644c] hover:bg-[#f5efe6] text-xs font-bold font-mono transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSimulate}
              disabled={submitting}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-[#b45309] hover:bg-[#92400e] text-white text-xs font-bold font-mono shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{submitting ? 'Executing Simulation...' : 'Simulate Attack Playbook'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
