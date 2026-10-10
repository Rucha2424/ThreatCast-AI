import React from 'react';
import { Network, Info } from 'lucide-react';

export default function SubGraphContext({
  subgraphNodes = [],
  subgraphEdges = [],
  fastrpNote,
}) {
  const hasNodes = subgraphNodes.length > 0;
  const hasEdges = subgraphEdges.length > 0;

  return (
    <div className="p-6 md:p-7 rounded-2xl bg-threatcast-card border border-tc-border shadow-xs space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-threatcast-text flex items-center gap-2">
            <Network className="w-4 h-4 text-threatcast-cyan" />
            Network Context
          </h3>

          <p className="text-xs text-threatcast-muted mt-0.5">
            Supporting network information returned by the current API.
          </p>
        </div>

        <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-threatcast-elevated text-threatcast-muted border border-tc-border font-bold">
          Context
        </span>
      </div>

      {hasNodes ? (
        <div className="space-y-2">
          <span className="text-xs font-mono font-bold uppercase text-threatcast-muted block">
            Network Entities
          </span>

          <div className="flex flex-wrap gap-2">
            {subgraphNodes.map((node, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-threatcast-card border border-tc-border text-xs font-mono font-bold text-threatcast-silver"
              >
                <span className="w-2 h-2 rounded-full bg-threatcast-cyan" />
                {node}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-threatcast-card border border-tc-border">
          <p className="text-xs text-threatcast-muted font-mono">
            No node-level attribution is available from the CTU13 LSTM
            early-warning model.
          </p>
        </div>
      )}

      {hasEdges && (
        <div className="space-y-2">
          <span className="text-xs font-mono font-bold uppercase text-threatcast-muted block">
            Network Relationships
          </span>

          <div className="space-y-1.5">
            {subgraphEdges.map((edge, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-threatcast-card text-threatcast-cyan font-mono text-xs border border-tc-border flex items-center gap-2"
              >
                <span className="text-threatcast-muted font-bold">
                  #{idx + 1}
                </span>
                <span>{edge}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-4 rounded-xl bg-threatcast-elevated border border-threatcast-amber text-xs text-threatcast-cyan font-mono leading-relaxed flex gap-2">
        <Info className="w-4 h-4 shrink-0 text-threatcast-cyan mt-0.5" />

        <div>
          <strong className="text-threatcast-cyan">
            Explainability scope:
          </strong>{' '}
          The deployed CTU13 LSTM produces an early-warning probability from
          temporal network-state features. It does not produce FastRP
          embeddings, graph-based attribution, or independent MITRE ATT&CK
          stage predictions.
        </div>
      </div>

      {fastrpNote && (
        <div className="text-[11px] text-[var(--tc-muted)] font-mono">
          Legacy graph metadata is retained only for API compatibility and is
          not used by the CTU13 LSTM prediction.
        </div>
      )}
    </div>
  );
}