import React from 'react';
import { Network, Sparkles, Server, Laptop, User, Database } from 'lucide-react';

export default function SubGraphContext({ subgraphNodes = [], subgraphEdges = [], fastrpNote }) {
  return (
    <div className="p-6 rounded-2xl bg-white border border-soc-slate-200 shadow-soc-card space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-soc-slate-900 flex items-center gap-2">
            <Network className="w-4 h-4 text-soc-ai" />
            Topological Sub-Graph Neighborhood Context
          </h3>
          <p className="text-xs text-soc-slate-500 mt-0.5">
            Nodes and relationship paths within the 3-hop FastRP graph embedding neighborhood.
          </p>
        </div>
        <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-50 text-soc-ai border border-indigo-200">
          FastRP 128-dim
        </span>
      </div>

      {/* Node Pills */}
      <div className="space-y-2">
        <span className="text-xs font-mono font-bold uppercase text-soc-slate-500 block">
          Involved Subgraph Entities:
        </span>
        <div className="flex flex-wrap gap-2">
          {subgraphNodes.map((node, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-soc-slate-50 border border-soc-slate-200 text-xs font-mono font-semibold text-soc-slate-800"
            >
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              {node}
            </span>
          ))}
        </div>
      </div>

      {/* Edge Sequences */}
      <div className="space-y-2">
        <span className="text-xs font-mono font-bold uppercase text-soc-slate-500 block">
          Topological Propagation Paths:
        </span>
        <div className="space-y-1.5">
          {subgraphEdges.map((edge, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-lg bg-soc-navy-950 text-indigo-200 font-mono text-xs border border-soc-navy-800 flex items-center gap-2"
            >
              <span className="text-soc-slate-400">#{idx + 1}</span>
              <span>{edge}</span>
            </div>
          ))}
        </div>
      </div>

      {fastrpNote && (
        <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200 text-xs text-indigo-950 font-mono leading-relaxed">
          <strong>FastRP Method Note:</strong> {fastrpNote}
        </div>
      )}
    </div>
  );
}
