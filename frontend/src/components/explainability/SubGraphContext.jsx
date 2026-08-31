import React from 'react';
import { Network, Sparkles, Server, Laptop, User, Database } from 'lucide-react';

export default function SubGraphContext({ subgraphNodes = [], subgraphEdges = [], fastrpNote }) {
  return (
    <div className="p-6 md:p-7 rounded-2xl bg-gradient-to-br from-cyber-maroon-950 via-cyber-black to-cyber-burgundy-950 border border-cyber-maroon-800 shadow-2xl space-y-5 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Network className="w-4 h-4 text-rose-400" />
            Topological Sub-Graph Neighborhood Context
          </h3>
          <p className="text-xs text-cyber-grey-400 mt-0.5">
            Nodes and relationship paths within the 3-hop FastRP graph embedding neighborhood.
          </p>
        </div>
        <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold">
          FastRP 128-dim
        </span>
      </div>

      {/* Node Pills */}
      <div className="space-y-2">
        <span className="text-xs font-mono font-bold uppercase text-cyber-grey-400 block">
          Involved Subgraph Entities:
        </span>
        <div className="flex flex-wrap gap-2">
          {subgraphNodes.map((node, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyber-black border border-cyber-maroon-800 text-xs font-mono font-bold text-cyber-grey-200"
            >
              <span className="w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_6px_#f43f5e]" />
              {node}
            </span>
          ))}
        </div>
      </div>

      {/* Edge Sequences */}
      <div className="space-y-2">
        <span className="text-xs font-mono font-bold uppercase text-cyber-grey-400 block">
          Topological Propagation Paths:
        </span>
        <div className="space-y-1.5">
          {subgraphEdges.map((edge, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-cyber-black text-rose-200 font-mono text-xs border border-cyber-maroon-850 flex items-center gap-2"
            >
              <span className="text-cyber-grey-500 font-bold">#{idx + 1}</span>
              <span>{edge}</span>
            </div>
          ))}
        </div>
      </div>

      {fastrpNote && (
        <div className="p-4 rounded-xl bg-cyber-black/90 border border-cyber-maroon-800 text-xs text-cyber-grey-300 font-mono leading-relaxed shadow-inner">
          <strong className="text-rose-400">FastRP Method Note:</strong> {fastrpNote}
        </div>
      )}
    </div>
  );
}
