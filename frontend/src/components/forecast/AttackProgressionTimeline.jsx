import React from 'react';
import {
  Brain,
  Clock,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

import { formatConfidence } from '../../utils/formatters';


export default function AttackProgressionTimeline({ forecastData }) {
  if (!forecastData) {
    return null;
  }

  const current = forecastData.current_state;

  const probability = Number(
    current?.probability_distribution?.['Early Warning'] ??
    current?.confidence ??
    0
  );

  const warning = probability >= 0.08;

  const probabilityText = formatConfidence(
    probability
  );

  return (
    <div className="rounded-2xl bg-threatcast-card border border-tc-border shadow-xs p-6 md:p-7">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">

        <div className="flex items-center gap-3">

          <div className="w-9 h-9 rounded-xl bg-threatcast-elevated border border-threatcast-amber flex items-center justify-center text-threatcast-cyan">
            <Brain className="w-4 h-4" />
          </div>

          <div>
            <h3 className="text-sm font-bold text-threatcast-text">
              CTU13 LSTM Early-Warning Timeline
            </h3>

            <p className="text-xs text-threatcast-muted mt-0.5">
              Five consecutive 30-second network states
            </p>
          </div>

        </div>


        <div className="flex items-center gap-2">

          <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-md bg-threatcast-elevated border border-tc-border text-threatcast-cyan">
            5 × 30 SEC
          </span>

          <span
            className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-md border ${
              warning
                ? 'bg-threatcast-elevated text-threatcast-red border-threatcast-red'
                : 'bg-threatcast-elevated text-threatcast-green border-tc-border'
            }`}
          >
            {warning ? 'EARLY WARNING' : 'NORMAL'}
          </span>

        </div>

      </div>


      {/* Timeline */}
      <div className="relative">

        <div className="hidden md:block absolute left-[8%] right-[8%] top-7 h-px bg-[var(--tc-border)]" />

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">

          {Array.from({ length: 5 }).map((_, index) => {

            const stateNumber = index + 1;

            return (
              <div
                key={stateNumber}
                className="relative"
              >

                <div className="flex md:flex-col items-center md:text-center gap-3">

                  <div
                    className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center border-2 bg-threatcast-card ${
                      index === 4
                        ? warning
                          ? 'border-[var(--tc-red)] text-threatcast-red'
                          : 'border-threatcast-green text-threatcast-green'
                        : 'border-[var(--tc-silver)] text-threatcast-muted'
                    }`}
                  >
                    {index === 4 ? (
                      warning ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : (
                        <ShieldCheck className="w-4 h-4" />
                      )
                    ) : (
                      <span className="text-[10px] font-bold">
                        {stateNumber}
                      </span>
                    )}
                  </div>


                  <div className="md:mt-2">

                    <p className="text-[10px] font-mono font-bold text-threatcast-cyan">
                      STATE {stateNumber}
                    </p>

                    <p className="text-[10px] text-threatcast-muted font-mono">
                      {stateNumber === 5
                        ? 'Latest'
                        : `T-${5 - stateNumber}`}
                    </p>

                  </div>

                </div>

              </div>
            );
          })}

        </div>

      </div>


      {/* Current assessment */}
      <div className="mt-7 grid grid-cols-1 md:grid-cols-3 gap-4">

        <div className="p-4 rounded-xl bg-threatcast-card border border-tc-border">

          <div className="flex items-center gap-2 mb-2">

            <Clock className="w-3.5 h-3.5 text-threatcast-cyan" />

            <span className="text-[10px] font-bold uppercase tracking-wider text-threatcast-muted font-mono">
              Temporal Window
            </span>

          </div>

          <p className="text-sm font-bold text-threatcast-text">
            5 × 30 seconds
          </p>

          <p className="text-[10px] text-threatcast-muted mt-1">
            Five consecutive network states
          </p>

        </div>


        <div className="p-4 rounded-xl bg-threatcast-elevated border border-threatcast-amber">

          <div className="flex items-center gap-2 mb-2">

            <Brain className="w-3.5 h-3.5 text-threatcast-cyan" />

            <span className="text-[10px] font-bold uppercase tracking-wider text-threatcast-muted font-mono">
              Early-Warning Probability
            </span>

          </div>

          <p className="text-lg font-black text-threatcast-cyan">
            {probabilityText}
          </p>

          <p className="text-[10px] text-threatcast-muted mt-1">
            Deployment threshold: 8%
          </p>

        </div>


        <div
          className={`p-4 rounded-xl border ${
            warning
              ? 'bg-threatcast-elevated border-threatcast-red'
              : 'bg-threatcast-elevated border-tc-border'
          }`}
        >

          <div className="flex items-center gap-2 mb-2">

            {warning ? (
              <AlertTriangle className="w-3.5 h-3.5 text-threatcast-red" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 text-threatcast-green" />
            )}

            <span className="text-[10px] font-bold uppercase tracking-wider text-threatcast-muted font-mono">
              Assessment
            </span>

          </div>

          <p
            className={`text-sm font-black ${
              warning
                ? 'text-threatcast-red'
                : 'text-threatcast-green'
            }`}
          >
            {warning
              ? 'EARLY WARNING'
              : 'NORMAL NETWORK STATE'}
          </p>

          <p className="text-[10px] text-threatcast-muted mt-1">
            {warning
              ? 'Probability meets deployment threshold'
              : 'Probability is below deployment threshold'}
          </p>

        </div>

      </div>


      {/* Disclaimer */}
      <div className="mt-5 p-3.5 rounded-xl bg-threatcast-card border border-tc-border">

        <p className="text-[10px] leading-relaxed text-threatcast-muted font-mono">
          <strong className="text-threatcast-cyan">
            MODEL SCOPE:
          </strong>{' '}
          The CTU13 LSTM predicts early-warning risk from
          statistical network-state features. It does not
          independently predict specific MITRE ATT&CK stages,
          individual hosts, or future attack paths.
        </p>

      </div>

    </div>
  );
}