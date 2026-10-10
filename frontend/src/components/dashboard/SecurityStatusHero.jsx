import React from 'react';
import {
  ArrowRight,
  ShieldCheck,
  Clock,
  AlertOctagon,
  Brain,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { formatConfidence } from '../../utils/formatters';


export default function SecurityStatusHero({ summary }) {
  if (!summary) {
    return null;
  }

  const isWarning =
    summary.forecast_confidence >= 0.08;


  return (
    <div className="relative overflow-hidden rounded-2xl bg-threatcast-card text-threatcast-text p-6 md:p-8 shadow-xs border border-tc-border">

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">

        <div className="space-y-4 max-w-xl">

          <div className="flex items-center gap-3 flex-wrap">

            <span
              className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold font-mono tracking-wide uppercase border ${
                summary.threat_level === 'CRITICAL'
                  ? 'bg-threatcast-elevated text-threatcast-red border-threatcast-red'
                  : summary.threat_level === 'HIGH'
                    ? 'bg-threatcast-elevated text-threatcast-cyan border-threatcast-amber'
                    : 'bg-threatcast-elevated text-threatcast-green border-threatcast-green'
              }`}
            >

              <span
                className={`w-2 h-2 rounded-full ${
                  summary.threat_level === 'LOW'
                    ? 'bg-threatcast-green'
                    : 'bg-threatcast-amber'
                }`}
              />

              {summary.threat_level}
              <span className="border-l border-current/30 pl-2">{summary.threat_score}/100</span>

            </span>


            <span className="hidden sm:inline-flex items-center gap-1 text-xs text-threatcast-muted font-mono">

              <Clock className="w-3.5 h-3.5 text-threatcast-cyan" />

              Horizon:
              {' '}
              {summary.forecast_horizon}

            </span>

          </div>


          <div>

            <h2 className="text-xl md:text-2xl font-black tracking-tight text-threatcast-text flex items-center gap-2">

              <Brain className="w-5 h-5 text-threatcast-cyan" />

              Early-Warning Assessment

            </h2>

            <p className="text-xs md:text-sm text-threatcast-silver mt-1">

              Analyzing the last 5 network snapshots to predict what happens next.

            </p>

          </div>


          <div className="p-4 rounded-xl bg-threatcast-card border border-tc-border space-y-2.5 shadow-2xs">

            <div className="text-[11px] uppercase tracking-wider text-threatcast-muted font-bold flex items-center justify-between font-mono">

              <span>
                Early-Warning Assessment
              </span>

              <span className="text-threatcast-cyan font-mono text-[10px] font-bold">
                Probability:
                {' '}
                {formatConfidence(
                  summary.forecast_confidence
                )}
              </span>

            </div>


            <div className="flex flex-col sm:flex-row sm:items-center gap-3">

              <div className="flex-1 p-3 rounded-lg bg-threatcast-card border border-tc-border">

                <span className="text-[10px] text-threatcast-muted block font-mono font-semibold">
                  CURRENT STATE
                </span>

                <span className="text-sm font-bold text-threatcast-text">
                  {summary.current_stage}
                </span>

                <span className="text-[10px] text-threatcast-silver block truncate font-mono">
                  {summary.current_stage_tactic}
                </span>

              </div>


              <div className="flex items-center justify-center text-threatcast-cyan">
                <ArrowRight className="w-5 h-5" />
              </div>


              <div className="flex-1 p-3 rounded-lg bg-threatcast-elevated border border-threatcast-amber shadow-xs">

                <span className="text-[10px] text-threatcast-cyan block font-mono flex items-center gap-1 font-bold">
                  <Brain className="w-3 h-3" />
                  MODEL RESULT
                </span>

                <span className="text-sm font-bold text-threatcast-cyan">
                  {summary.next_predicted_stage}
                </span>

                <span className="text-[10px] text-threatcast-cyan block truncate font-mono">
                  {summary.next_predicted_tactic}
                </span>

              </div>

            </div>


            <div className="text-[10px] font-mono text-threatcast-muted pt-1">

              Deployment threshold:
              {' '}
              <strong className="text-threatcast-cyan">
                8%
              </strong>

              {' • '}

              Result:
              {' '}
              <strong
                className={
                  isWarning
                    ? 'text-threatcast-red'
                    : 'text-threatcast-green'
                }
              >
                {isWarning
                  ? 'EARLY WARNING'
                  : 'NORMAL'}
              </strong>

            </div>

          </div>

        </div>


        <div className="lg:max-w-md w-full p-5 rounded-xl bg-threatcast-card border border-tc-border flex flex-col justify-between space-y-4">

          <div>

            <div className="flex items-center justify-between text-xs mb-2">

              <span className="text-[11px] font-bold uppercase tracking-wider text-threatcast-cyan flex items-center gap-1.5 font-mono">

                <AlertOctagon className="w-4 h-4 text-threatcast-cyan" />

                Recommended Action

              </span>

              <span className="text-[10px] font-mono text-threatcast-muted">
                ML Guidance
              </span>

            </div>


            <p className="text-xs text-threatcast-text leading-relaxed bg-threatcast-card p-3.5 rounded-lg border border-tc-border">
              {summary.recommended_action}
            </p>

          </div>


          <div className="flex items-center gap-3 pt-2">

            <Link
              to="/forecast"
              className="flex-1 text-center py-2.5 px-3 rounded-xl bg-threatcast-cyan hover:bg-cyan-300 text-threatcast-deep text-xs font-bold shadow-tc-cyan transition-all active:scale-95 font-mono"
            >
              View LSTM Forecast
            </Link>


            <Link
              to="/network-graph"
              className="flex-1 text-center py-2.5 px-3 rounded-xl bg-threatcast-card hover:bg-threatcast-elevated text-threatcast-text text-xs font-bold border border-tc-border transition-colors font-mono"
            >
              View Network
            </Link>

          </div>

        </div>

      </div>

    </div>
  );
}
