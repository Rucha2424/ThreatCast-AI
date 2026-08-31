import React, { useState } from 'react';
import { Zap, X, ShieldAlert, CheckCircle2, RotateCcw, Play } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cyber-obsidian/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-gradient-to-b from-cyber-maroon-950 via-cyber-black to-cyber-burgundy-950 rounded-2xl shadow-2xl border border-cyber-maroon-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-cyber-maroon-900 via-cyber-black to-cyber-burgundy-950 text-white border-b border-cyber-maroon-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-950 border border-rose-600/40 flex items-center justify-center text-rose-400 shadow-md">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                Live Attack Simulation Engine
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Demo Mode
                </span>
              </h2>
              <p className="text-xs text-cyber-grey-400">
                Mutate neural network topology and test K=3 forecasting & graph progression.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-cyber-maroon-900/60 text-cyber-grey-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider text-cyber-grey-400 font-mono">
            Select Live Scenario Playbook:
          </p>

          <div className="space-y-3">
            {SCENARIOS.map((sc) => {
              const isSelected = selectedScenario === sc.id;
              return (
                <div
                  key={sc.id}
                  onClick={() => setSelectedScenario(sc.id)}
                  className={`cursor-pointer p-4 rounded-xl border transition-all duration-200 ${
                    isSelected
                      ? 'border-rose-500 bg-rose-950/60 shadow-lg shadow-rose-950/80 ring-1 ring-rose-500'
                      : 'border-cyber-maroon-800/80 bg-cyber-black/70 hover:bg-cyber-maroon-950/60 hover:border-cyber-maroon-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected
                            ? 'border-rose-500 bg-rose-500 text-white'
                            : 'border-cyber-maroon-600 bg-cyber-black'
                        }`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <h4 className="text-sm font-bold text-white">{sc.name}</h4>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                        sc.id === 'exfiltration_crisis'
                          ? 'bg-rose-900/80 text-rose-300 border border-rose-600/50'
                          : sc.id === 'lateral_movement_wave'
                          ? 'bg-amber-900/80 text-amber-300 border border-amber-600/50'
                          : 'bg-cyber-maroon-900 text-cyber-grey-300 border border-cyber-maroon-700'
                      }`}
                    >
                      {sc.badge}
                    </span>
                  </div>
                  <p className="text-xs text-cyber-grey-300 pl-6">{sc.description}</p>
                </div>
              );
            })}
          </div>

          {successMessage && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-950/90 border border-emerald-600/50 text-emerald-300 text-xs font-bold font-mono animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-cyber-black border-t border-cyber-maroon-800/80">
          <button
            onClick={handleReset}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-bold text-cyber-grey-400 hover:text-white hover:bg-cyber-maroon-900/60 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Baseline
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl border border-cyber-maroon-700 text-xs font-bold text-cyber-grey-300 hover:bg-cyber-maroon-900/60 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSimulate}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyber-maroon-700 via-rose-700 to-cyber-burgundy-600 hover:from-cyber-maroon-600 hover:to-rose-600 text-white text-xs font-bold transition-all shadow-lg shadow-rose-950/60 active:scale-95 disabled:opacity-50 border border-rose-500/40"
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
