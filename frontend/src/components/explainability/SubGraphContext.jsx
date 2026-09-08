import React from 'react';
import { Network, Sparkles, Server, Laptop, User, Database } from 'lucide-react';

export default function SubGraphContext({ subgraphNodes = [], subgraphEdges = [], fastrpNote }) {
  return (
    <div className="p-6 md:p-7 rounded-2xl bg-cyber-surface border border-slate-800 shadow-soc-card space-y-5 text-slate-100">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Network className="w-4 h-4 text-sky-400" />
            Topological Sub-Graph Neighborhood Context
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Nodes and relationship paths within the 3-hop FastRP graph embedding neighborhood.
          </p>
        </div>
        <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 font-bold">
          FastRP 128-dim
        </span>
      </div>

      {/* Node Pills */}
      <div className="space-y-2">
        <span className="text-xs font-mono font-bold uppercase text-slate-400 block">
          Involved Subgraph Entities:
        </span>
        <div className="flex flex-wrap gap-2">
          {subgraphNodes.map((node, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyber-card border border-slate-800 text-xs font-mono font-bold text-slate-200"
            >
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              {node}
            </span>
          ))}
        </div>
      </div>

      {/* Edge Sequences */}
      <div className="space-y-2">
        <span className="text-xs font-mono font-bold uppercase text-slate-400 block">
          Topological Propagation Paths:
        </span>
        <div className="space-y-1.5">
          {subgraphEdges.map((edge, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-cyber-card text-sky-300 font-mono text-xs border border-slate-800 flex items-center gap-2"
            >
              <span className="text-slate-500 font-bold">#{idx + 1}</span>
              <span>{edge}</span>
            </div>
          ))}
        </div>
      </div>

      {fastrpNote && (
        <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/30 text-xs text-sky-200 font-mono leading-relaxed">
          <strong className="text-sky-400">FastRP Method Note:</strong> {fastrpNote}
        </div>
      )}
    </div>
  );
}
