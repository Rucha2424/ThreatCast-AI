import React from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import MotionReveal from '../common/MotionReveal';

export default function EarlyWarningCard({ summary }) {
  if (!summary) {
    return null;
  }

  const probability = Number(summary.forecast_confidence ?? 0);
  const warning = probability >= 0.08;
  const probabilityPercent = (probability * 100).toFixed(2);

  return (
    <MotionReveal hover>
    <div className="rounded-2xl bg-threatcast-card border border-tc-border shadow-xs p-6 md:p-7">

      <div className="flex items-start gap-3 mb-5">

        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
            warning
              ? 'bg-threatcast-elevated border-threatcast-red text-threatcast-red'
              : 'bg-threatcast-elevated border-tc-border text-threatcast-green'
          }`}
        >
          {warning ? (
            <AlertTriangle className="w-4 h-4" />
          ) : (
            <ShieldCheck className="w-4 h-4" />
          )}
        </div>

        <div>
          <p className="text-[10px] font-mono font-bold tracking-wider text-threatcast-cyan uppercase">
            Early Warning System
          </p>

          <h3 className="text-lg font-black text-threatcast-text mt-1">
            CTU13 LSTM Early-Warning Assessment
          </h3>

          <p className="text-xs text-threatcast-muted mt-1">
            Current assessment from the latest five 30-second network states.
          </p>
        </div>

      </div>


      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <div className="rounded-xl border border-tc-border bg-threatcast-card p-4">

          <p className="text-[10px] font-mono font-bold uppercase text-threatcast-muted">
            Current State
          </p>

          <p className="text-base font-black text-threatcast-text mt-2">
            {summary.current_stage || 'Normal Network State'}
          </p>

        </div>


        <div className="rounded-xl border border-threatcast-amber bg-threatcast-elevated p-4">

          <p className="text-[10px] font-mono font-bold uppercase text-threatcast-muted">
            Early-Warning Probability
          </p>

          <p className="text-xl font-black text-threatcast-cyan mt-2">
            {probabilityPercent}%
          </p>

          <p className="text-[10px] text-threatcast-muted mt-1">
            Deployment threshold: 8%
          </p>

        </div>


        <div
          className={`rounded-xl border p-4 ${
            warning
              ? 'bg-threatcast-elevated border-threatcast-red'
              : 'bg-threatcast-elevated border-tc-border'
          }`}
        >

          <p className="text-[10px] font-mono font-bold uppercase text-threatcast-muted">
            Assessment
          </p>

          <p
            className={`text-base font-black mt-2 ${
              warning ? 'text-threatcast-red' : 'text-threatcast-green'
            }`}
          >
            {warning ? 'EARLY WARNING' : 'NORMAL'}
          </p>

          <p className="text-[10px] text-threatcast-muted mt-1">
            {warning
              ? 'Probability exceeds the deployment threshold.'
              : 'Probability is below the deployment threshold.'}
          </p>

        </div>

      </div>


      <div className="mt-5 rounded-xl border border-tc-border bg-threatcast-card p-4">

        <p className="text-xs leading-relaxed text-threatcast-muted">

          <span className="font-bold text-threatcast-cyan">
            Model scope:
          </span>{' '}

          The CTU13 LSTM predicts early-warning risk from
          statistical network-state features. It does not independently
          predict specific MITRE ATT&CK stages, individual hosts,
          or future attack paths.

        </p>

      </div>

    </div>
    </MotionReveal>
  );
}
