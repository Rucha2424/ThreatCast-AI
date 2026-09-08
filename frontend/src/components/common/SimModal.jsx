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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-cyber-surface rounded-2xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[92vh] text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 bg-cyber-card border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Live Attack Simulation Playbook
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  SIH Demo Engine
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Choose an attack progression playbook to test ThreatCast AI's predictive early warning.
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

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Instructions Box */}
          <div className="p-3.5 rounded-xl bg-cyber-card border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-white">How Simulation Works: </strong>
              Each playbook simulates a real-world multi-stage attack. ThreatCast tracks the observed state in real time and projects the next 3 stages (<span className="font-mono font-bold text-sky-400">K=3: T+1, T+2, T+3</span>) before damage can occur.
            </p>
          </div>

          {/* Scenario Cards */}
          <div className="space-y-3">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 block">
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
                      ? 'border-sky-500/50 bg-sky-500/5 shadow-md shadow-sky-500/5'
                      : 'border-slate-800 bg-cyber-card hover:border-slate-700'
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
                        className="w-4 h-4 accent-sky-400 cursor-pointer"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">{sc.name}</h3>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                              sc.id.includes('exfiltration') || sc.id.includes('ransomware')
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                            }`}
                          >
                            {sc.badge}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{sc.shortSummary}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedDetailsId(isExpanded ? null : sc.id);
                      }}
                      className="text-xs text-slate-400 hover:text-sky-300 flex items-center gap-1 font-mono shrink-0 px-2 py-1 rounded hover:bg-slate-800"
                    >
                      <span>{isExpanded ? 'Hide' : 'Explain'}</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-sky-400' : ''}`}
                      />
                    </button>
                  </div>

                  {/* Expanded Structured Explanation */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-1 border-t border-slate-800 bg-cyber-surface space-y-3 text-xs">
                      {/* What is this? */}
                      <div className="p-3 rounded-lg bg-cyber-card border border-slate-800 space-y-1">
                        <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">
                          What is this Scenario?
                        </span>
                        <p className="text-slate-200 leading-relaxed">{sc.whatIsIt}</p>
                      </div>

                      {/* What will happen? */}
                      <div className="p-3 rounded-lg bg-cyber-card border border-slate-800 space-y-1">
                        <span className="text-[10px] font-mono uppercase font-bold text-rose-400 block">
                          What Will Happen During the Simulation?
                        </span>
                        <p className="text-slate-200 leading-relaxed">{sc.whatWillHappen}</p>
                      </div>

                      {/* What will ThreatCast show? */}
                      <div className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/30 space-y-1">
                        <span className="text-[10px] font-mono uppercase font-bold text-sky-400 block flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                          What Will ThreatCast AI Show & Predict?
                        </span>
                        <p className="text-sky-200 font-semibold leading-relaxed">
                          {sc.whatThreatCastShows}
                        </p>
                      </div>

                      {/* Why does it matter & What it demonstrates */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div className="p-3 rounded-lg bg-cyber-card border border-slate-800 space-y-1">
                          <span className="text-[10px] font-mono uppercase font-bold text-amber-400 block">
                            Why Does It Matter?
                          </span>
                          <p className="text-slate-300 leading-relaxed">{sc.whyItMatters}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-cyber-card border border-slate-800 space-y-1">
                          <span className="text-[10px] font-mono uppercase font-bold text-emerald-400 block">
                            What This Demonstrates
                          </span>
                          <p className="text-slate-300 leading-relaxed">{sc.whatItDemonstrates}</p>
                        </div>
                      </div>

                      {/* Technical Details ▾ */}
                      <ProgressiveDisclosure
                        title="Technical Details & MITRE Mapping"
                        badge="Advanced"
                        defaultOpen={false}
                      >
                        <div className="space-y-1.5 font-mono text-[11px] text-slate-300">
                          <div className="flex justify-between border-b border-slate-800 pb-1">
                            <span className="text-slate-500">Technique / Tactic:</span>
                            <span className="font-bold text-white">{sc.technicalDetails.initialTactic}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-800 pb-1">
                            <span className="text-slate-500">Source Entity:</span>
                            <span className="font-bold text-white">{sc.technicalDetails.sourceEndpoint}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-800 pb-1">
                            <span className="text-slate-500">Target Trajectory:</span>
                            <span className="font-bold text-white">{sc.technicalDetails.targetEndpoint}</span>
                          </div>
                          <div className="flex justify-between pt-1">
                            <span className="text-slate-500">ML Model:</span>
                            <span className="font-bold text-sky-400">{sc.technicalDetails.modelUsed}</span>
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
          <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-sky-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                2. Pre-Simulation Execution Preview:
              </span>
              <span className="text-[10px] font-mono text-sky-400 font-semibold">
                Ready to Trigger
              </span>
            </div>

            <p className="text-xs text-slate-300">
              Selecting <strong className="text-white">"{currentScenarioObj.name}"</strong> will execute the following steps in ThreatCast AI:
            </p>

            <div className="space-y-1.5 pt-1">
              {currentScenarioObj.preSimulationSteps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-slate-300 font-medium">
                  <ArrowRight className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-cyber-card border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={handleReset}
            disabled={submitting}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-700 bg-cyber-surface hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold font-mono transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Baseline</span>
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800 text-xs font-bold font-mono transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSimulate}
              disabled={submitting}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs sm:text-sm font-bold font-mono shadow-lg shadow-sky-500/25 transition-all active:scale-95 flex items-center justify-center gap-2"
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
