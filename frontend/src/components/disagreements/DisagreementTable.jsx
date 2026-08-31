import React from 'react';
import { AlertTriangle, CheckCircle2, ChevronRight, Sparkles, Shield } from 'lucide-react';
import { formatConfidence } from '../../utils/formatters';

export default function DisagreementTable({ disagreements = [], selectedId, onSelect }) {
  if (!disagreements || disagreements.length === 0) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-soc-slate-200 text-soc-slate-500 text-xs">
        No active model-rule disagreements logged in the current window.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-soc-slate-200 bg-white shadow-soc-card">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="bg-soc-slate-50/80 border-b border-soc-slate-200 text-soc-slate-500 font-mono uppercase text-[10px] tracking-wider">
            <th className="py-3 px-4 font-semibold">Timestamp</th>
            <th className="py-3 px-4 font-semibold">Target Asset</th>
            <th className="py-3 px-4 font-semibold">AI Model Prediction</th>
            <th className="py-3 px-4 font-semibold">Deterministic Rule Output</th>
            <th className="py-3 px-4 font-semibold text-center">Confidence</th>
            <th className="py-3 px-4 font-semibold">Signal Status</th>
            <th className="py-3 px-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-soc-slate-100">
          {disagreements.map((item) => {
            const isSelected = selectedId === item.id;
            return (
              <tr
                key={item.id}
                onClick={() => onSelect && onSelect(item)}
                className={`cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-amber-50/70 text-amber-950 font-medium'
                    : 'hover:bg-soc-slate-50/80'
                }`}
              >
                <td className="py-3.5 px-4 font-mono text-soc-slate-500">{item.timestamp}</td>
                <td className="py-3.5 px-4 font-mono font-semibold text-soc-slate-900">
                  {item.target_node}
                </td>
                <td className="py-3.5 px-4 font-medium text-indigo-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-soc-ai shrink-0" />
                  <span>{item.model_prediction}</span>
                </td>
                <td className="py-3.5 px-4 text-soc-slate-600">
                  <span className="inline-flex items-center gap-1">
                    <Shield className="w-3 h-3 text-soc-slate-400 shrink-0" />
                    {item.rule_output}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-center font-mono font-bold text-indigo-700">
                  {formatConfidence(item.model_confidence)}
                </td>
                <td className="py-3.5 px-4">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    {item.status}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <button className="p-1 rounded-lg hover:bg-soc-slate-200 text-soc-slate-400 hover:text-soc-slate-700">
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
