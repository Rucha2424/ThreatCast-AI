import React from 'react';
import { Network, Sparkles, Server, Laptop, User, Database } from 'lucide-react';

export default function SubGraphContext({ subgraphNodes = [], subgraphEdges = [], fastrpNote }) {
  return (
    <div className="p-6 md:p-7 rounded-2xl bg-white border border-[#ebdcc7] shadow-xs space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-[#221207] flex items-center gap-2">
            <Network className="w-4 h-4 text-[#b45309]" />
            Topological Sub-Graph Neighborhood Context
          </h3>
          <p className="text-xs text-[#7a644c] mt-0.5">
            Nodes and relationship paths within the 3-hop FastRP graph embedding neighborhood.
          </p>
        </div>
        <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-[#fef3c7] text-[#b45309] border border-[#fde68a] font-bold">
          FastRP 128-dim
        </span>
      </div>

      {/* Node Pills */}
      <div className="space-y-2">
        <span className="text-xs font-mono font-bold uppercase text-[#7a644c] block">
          Involved Subgraph Entities:
        </span>
        <div className="flex flex-wrap gap-2">
          {subgraphNodes.map((node, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#fcfaf7] border border-[#ebdcc7] text-xs font-mono font-bold text-[#544230]"
            >
              <span className="w-2 h-2 rounded-full bg-[#d97706]" />
              {node}
            </span>
          ))}
        </div>
      </div>

      {/* Edge Sequences */}
      <div className="space-y-2">
        <span className="text-xs font-mono font-bold uppercase text-[#7a644c] block">
          Topological Propagation Paths:
        </span>
        <div className="space-y-1.5">
          {subgraphEdges.map((edge, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-[#fcfaf7] text-[#78350f] font-mono text-xs border border-[#ebdcc7] flex items-center gap-2"
            >
              <span className="text-[#998165] font-bold">#{idx + 1}</span>
              <span>{edge}</span>
            </div>
          ))}
        </div>
      </div>

      {fastrpNote && (
        <div className="p-4 rounded-xl bg-[#fffbeb] border border-[#fde68a] text-xs text-[#78350f] font-mono leading-relaxed">
          <strong className="text-[#b45309]">FastRP Method Note:</strong> {fastrpNote}
        </div>
      )}
    </div>
  );
}
