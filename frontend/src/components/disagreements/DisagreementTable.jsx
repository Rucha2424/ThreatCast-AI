import React from 'react';
import { AlertTriangle, CheckCircle2, ChevronRight, Sparkles, Shield } from 'lucide-react';
import { formatConfidence } from '../../utils/formatters';

export default function DisagreementTable({ disagreements = [], selectedId, onSelect }) {
  if (!disagreements || disagreements.length === 0) {
    return (
      <div className="p-8 text-center bg-cyber-maroon-950/80 rounded-2xl border border-cyber-maroon-800 text-cyber-grey-400 text-xs">
        No active model-rule disagreements logged in the current window.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-cyber-maroon-800 bg-cyber-black shadow-2xl">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="bg-cyber-maroon-950 border-b border-cyber-maroon-800 text-cyber-grey-400 font-mono uppercase text-[10px] tracking-wider">
            <th className="py-3 px-4 font-bold">Timestamp</th>
            <th className="py-3 px-4 font-bold">Target Asset</th>
            <th className="py-3 px-4 font-bold">AI Model Prediction</th>
            <th className="py-3 px-4 font-bold">Deterministic Rule Output</th>
            <th className="py-3 px-4 font-bold text-center">Confidence</th>
            <th className="py-3 px-4 font-bold">Signal Status</th>
            <th className="py-3 px-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-cyber-maroon-900/60">
          {disagreements.map((item) => {
            const isSelected = selectedId === item.id;
            return (
              <tr
                key={item.id}
                onClick={() => onSelect && onSelect(item)}
                className={`cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-rose-950/60 text-white font-medium'
                    : 'hover:bg-cyber-maroon-950/50'
                }`}
              >
                <td className="py-3.5 px-4 font-mono text-cyber-grey-400">{item.timestamp}</td>
                <td className="py-3.5 px-4 font-mono font-bold text-white">
                  {item.target_node}
                </td>
                <td className="py-3.5 px-4 font-bold text-rose-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>{item.model_prediction}</span>
                </td>
                <td className="py-3.5 px-4 text-cyber-grey-300">
                  <span className="inline-flex items-center gap-1">
                    <Shield className="w-3 h-3 text-cyber-grey-400 shrink-0" />
                    {item.rule_output}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-center font-mono font-bold text-rose-400">
                  {formatConfidence(item.model_confidence)}
                </td>
                <td className="py-3.5 px-4">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-600/50 shadow-[0_0_8px_rgba(245,158,11,0.2)]">
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    {item.status}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <button className="p-1.5 rounded-lg hover:bg-cyber-maroon-800 text-cyber-grey-400 hover:text-white transition-colors">
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
