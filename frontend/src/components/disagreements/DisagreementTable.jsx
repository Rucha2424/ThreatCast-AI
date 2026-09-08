import React from 'react';
import { AlertTriangle, CheckCircle2, ChevronRight, Sparkles, Shield } from 'lucide-react';
import { formatConfidence } from '../../utils/formatters';

export default function DisagreementTable({ disagreements = [], selectedId, onSelect }) {
  if (!disagreements || disagreements.length === 0) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-[#ebdcc7] text-[#7a644c] text-xs">
        No active model-rule disagreements logged in the current window.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-[#ebdcc7] bg-white shadow-xs">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="bg-[#fcfaf7] border-b border-[#ebdcc7] text-[#7a644c] font-mono uppercase text-[10px] tracking-wider">
            <th className="py-3 px-4 font-bold">Timestamp</th>
            <th className="py-3 px-4 font-bold">Target Asset</th>
            <th className="py-3 px-4 font-bold">AI Model Prediction</th>
            <th className="py-3 px-4 font-bold">Deterministic Rule Output</th>
            <th className="py-3 px-4 font-bold text-center">Confidence</th>
            <th className="py-3 px-4 font-bold">Signal Status</th>
            <th className="py-3 px-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f5efe6] font-mono">
          {disagreements.map((item) => {
            const isSelected = selectedId === item.id;
            return (
              <tr
                key={item.id}
                onClick={() => onSelect && onSelect(item)}
                className={`cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-[#fffbeb] text-[#221207] font-medium'
                    : 'hover:bg-[#fcfaf7]'
                }`}
              >
                <td className="py-3.5 px-4 text-[#7a644c]">{item.timestamp}</td>
                <td className="py-3.5 px-4 font-bold text-[#221207]">
                  {item.target_node}
                </td>
                <td className="py-3.5 px-4 font-bold text-[#b45309] flex items-center gap-1.5 font-sans">
                  <Sparkles className="w-3.5 h-3.5 text-[#d97706] shrink-0" />
                  <span>{item.model_prediction}</span>
                </td>
                <td className="py-3.5 px-4 text-[#544230] font-sans">
                  <span className="inline-flex items-center gap-1">
                    <Shield className="w-3 h-3 text-[#7a644c] shrink-0" />
                    {item.rule_output}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-center font-bold text-[#b45309]">
                  {formatConfidence(item.model_confidence)}
                </td>
                <td className="py-3.5 px-4">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#fef3c7] text-[#b45309] border border-[#fde68a]">
                    <AlertTriangle className="w-3 h-3 text-[#d97706]" />
                    {item.status}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <button className="p-1.5 rounded-lg hover:bg-[#f5efe6] text-[#7a644c] hover:text-[#221207] transition-colors">
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
