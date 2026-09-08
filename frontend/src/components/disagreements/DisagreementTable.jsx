import React from 'react';
import { AlertTriangle, CheckCircle2, ChevronRight, Sparkles, Shield } from 'lucide-react';
import { formatConfidence } from '../../utils/formatters';

export default function DisagreementTable({ disagreements = [], selectedId, onSelect }) {
  if (!disagreements || disagreements.length === 0) {
    return (
      <div className="p-8 text-center bg-cyber-surface rounded-2xl border border-slate-800 text-slate-400 text-xs">
        No active model-rule disagreements logged in the current window.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-cyber-surface shadow-soc-card">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="bg-cyber-card border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px] tracking-wider">
            <th className="py-3 px-4 font-bold">Timestamp</th>
            <th className="py-3 px-4 font-bold">Target Asset</th>
            <th className="py-3 px-4 font-bold">AI Model Prediction</th>
            <th className="py-3 px-4 font-bold">Deterministic Rule Output</th>
            <th className="py-3 px-4 font-bold text-center">Confidence</th>
            <th className="py-3 px-4 font-bold">Signal Status</th>
            <th className="py-3 px-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/80 font-mono">
          {disagreements.map((item) => {
            const isSelected = selectedId === item.id;
            return (
              <tr
                key={item.id}
                onClick={() => onSelect && onSelect(item)}
                className={`cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-sky-500/10 hover:bg-sky-500/15'
                    : 'hover:bg-slate-800/40'
                }`}
              >
                <td className="py-3.5 px-4 text-slate-400">{item.timestamp}</td>
                <td className="py-3.5 px-4 font-bold text-white">
                  {item.target_node}
                </td>
                <td className="py-3.5 px-4 font-bold text-sky-400 flex items-center gap-1.5 font-sans">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>{item.model_prediction}</span>
                </td>
                <td className="py-3.5 px-4 text-slate-300 font-sans">
                  <span className="inline-flex items-center gap-1">
                    <Shield className="w-3 h-3 text-slate-400 shrink-0" />
                    {item.rule_output}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-center font-bold text-sky-400">
                  {formatConfidence(item.model_confidence)}
                </td>
                <td className="py-3.5 px-4">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    {item.status}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <button className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
