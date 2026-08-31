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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-xl border border-[#ebdcc7] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 bg-[#fcfaf7] border-b border-[#ebdcc7]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#fef3c7] border border-[#fde68a] flex items-center justify-center text-[#b45309]">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-[#221207] flex items-center gap-2">
                Live Attack Simulation Engine
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-[#fef3c7] text-[#b45309] border border-[#fde68a]">
                  Demo Mode
                </span>
              </h2>
              <p className="text-xs text-[#7a644c]">
                Mutate neural network topology and test K=3 forecasting & graph progression.
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

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider text-[#7a644c] font-mono">
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
                      ? 'border-[#b45309] bg-[#fffbeb] ring-1 ring-[#b45309]'
                      : 'border-[#ebdcc7] bg-white hover:bg-[#fcfaf7]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected
                            ? 'border-[#b45309] bg-[#b45309] text-white'
                            : 'border-[#ded0bc] bg-white'
                        }`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <h4 className="text-sm font-bold text-[#221207]">{sc.name}</h4>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                        sc.id === 'exfiltration_crisis'
                          ? 'bg-[#ffedd5] text-[#c2410c] border border-[#fdba74]'
                          : sc.id === 'lateral_movement_wave'
                          ? 'bg-[#fef3c7] text-[#b45309] border border-[#fde68a]'
                          : 'bg-[#f5efe6] text-[#544230] border border-[#ded0bc]'
                      }`}
                    >
                      {sc.badge}
                    </span>
                  </div>
                  <p className="text-xs text-[#544230] pl-6">{sc.description}</p>
                </div>
              );
            })}
          </div>

          {successMessage && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-[#f7fee7] border border-[#d9f99d] text-[#4d7c0f] text-xs font-bold font-mono animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-[#65a30d]" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#fcfaf7] border-t border-[#ebdcc7]">
          <button
            onClick={handleReset}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-bold text-[#7a644c] hover:text-[#221207] hover:bg-[#f5efe6] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Baseline
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl border border-[#ebdcc7] text-xs font-bold text-[#544230] hover:bg-[#f5efe6] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSimulate}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#b45309] hover:bg-[#92400e] text-white text-xs font-bold transition-all shadow-xs active:scale-95 disabled:opacity-50 font-mono"
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
