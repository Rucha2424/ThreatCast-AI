import React, { useState } from 'react';
import { Zap, X, ShieldAlert, CheckCircle2, RotateCcw, AlertTriangle, Play } from 'lucide-react';
import { SCENARIOS } from '../../utils/constants';
import { simulateAttack, resetSimulation } from '../../services/api';

export default function SimModal({ isOpen, onClose, onSimulated }) {
  const [selectedScenario, setSelectedScenario] = useState('lateral_movement_wave');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  if (!isOpen) return null;

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
      }, 1200);
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
      }, 1000);
    } catch (err) {
      console.error('Failed to reset simulation:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-soc-navy-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-soc-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-soc-navy-900 via-soc-navy-850 to-soc-navy-800 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-soc-ai/20 border border-soc-ai/30 flex items-center justify-center text-soc-ai-purple">
              <Zap className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                Live Attack Simulation Engine
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Demo Mode
                </span>
              </h2>
              <p className="text-xs text-soc-slate-400">
                Mutate backend network state to test K=3 forecasting & early warning responses.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-soc-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-soc-slate-500">
            Select Live Scenario Playbook:
          </p>

          <div className="space-y-3">
            {SCENARIOS.map((sc) => {
              const isSelected = selectedScenario === sc.id;
              return (
                <div
                  key={sc.id}
                  onClick={() => setSelectedScenario(sc.id)}
                  className={`cursor-pointer p-4 rounded-xl border transition-all ${
                    isSelected
                      ? 'border-soc-ai bg-indigo-50/50 shadow-sm ring-1 ring-soc-ai'
                      : 'border-soc-slate-200 bg-soc-slate-50/50 hover:bg-white hover:border-soc-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected
                            ? 'border-soc-ai bg-soc-ai text-white'
                            : 'border-soc-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <h4 className="text-sm font-semibold text-soc-slate-900">{sc.name}</h4>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-medium ${
                        sc.id === 'exfiltration_crisis'
                          ? 'bg-red-100 text-red-700'
                          : sc.id === 'lateral_movement_wave'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-soc-slate-200 text-soc-slate-700'
                      }`}
                    >
                      {sc.badge}
                    </span>
                  </div>
                  <p className="text-xs text-soc-slate-600 pl-6">{sc.description}</p>
                </div>
              );
            })}
          </div>

          {successMessage && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-soc-secure" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-soc-slate-50 border-t border-soc-slate-200">
          <button
            onClick={handleReset}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-soc-slate-600 hover:text-soc-slate-900 hover:bg-soc-slate-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Baseline
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-lg border border-soc-slate-300 text-xs font-medium text-soc-slate-700 hover:bg-soc-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSimulate}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-soc-ai hover:bg-soc-ai-electric text-white text-xs font-semibold transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              {submitting ? 'Injecting Attack...' : 'Simulate Scenario'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
