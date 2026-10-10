import React, { useEffect, useMemo, useState } from 'react';
import {
  getCTU13Demo,
  getLiveExplainability,
} from '../services/api';

const FEATURE_NAMES = [
  'Flow_Count',
  'Total_Packets',
  'Total_Bytes',
  'Total_Source_Bytes',
  'Avg_Duration',
  'Avg_Packets_Per_Flow',
  'Avg_Bytes_Per_Flow',
  'Flow_Count_Change',
  'Total_Packets_Change',
  'Total_Bytes_Change',
  'Total_Source_Bytes_Change',
  'Avg_Duration_Change',
];

const formatNumber = (value, digits = 4) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return '—';
  }

  return number.toLocaleString(undefined, {
    maximumFractionDigits: digits,
  });
};

const formatProbability = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return '—';
  }

  if (number < 0.01) {
    return `${(number * 100).toFixed(4)}%`;
  }

  return `${(number * 100).toFixed(2)}%`;
};

const formatDate = (value) => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
};

const getFeatureValue = (state, feature) => {
  const value = Number(state?.[feature]);

  return Number.isFinite(value) ? value : 0;
};

export default function ResearchDemo() {
  const [scenario, setScenario] = useState(12);
  const [states, setStates] = useState(20);

  const [demo, setDemo] = useState(null);
  const [explainability, setExplainability] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDemo = async () => {
    setLoading(true);
    setError('');

    try {
      /*
       * Step 1:
       * Load the real CTU13 research-demo timeline.
       */
      const demoData = await getCTU13Demo(scenario, states);

      const timeline = demoData?.timeline || [];

      if (timeline.length < 5) {
        throw new Error(
          'At least 5 CTU13 states are required for live SHAP explanation.'
        );
      }

      /*
       * Step 2:
       * The production LSTM expects exactly:
       *
       *     5 timesteps × 12 features
       *
       * We therefore use the latest five states from the
       * exact CTU13 timeline currently displayed.
       */
      const latestFiveStates = timeline.slice(-5);

      const sequence = latestFiveStates.map((state) =>
        FEATURE_NAMES.map((feature) => {
          const value = Number(state?.[feature]);

          if (!Number.isFinite(value)) {
            throw new Error(
              `Invalid value for ${feature} in CTU13 timeline.`
            );
          }

          return value;
        })
      );

      /*
       * Step 3:
       * Send the exact 5 × 12 sequence to the live SHAP endpoint.
       *
       * The backend runs:
       *
       *     production scaler
       *             ↓
       *     production CTU13 LSTM
       *             ↓
       *     live GradientExplainer
       *
       * No INC-8042 fallback or precomputed explanation is used here.
       */
      const explanationData =
        await getLiveExplainability(sequence);

      setDemo(demoData);
      setExplainability(explanationData);
    } catch (err) {
      console.error(err);

      setError(
        err?.response?.data?.detail ||
          err?.message ||
          'Unable to load Research Demo data.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDemo();
  }, [scenario, states]);

  const timeline = demo?.timeline || [];

  const flaggedStates = useMemo(
    () =>
      timeline.filter(
        (state) =>
          state?.warning === true ||
          Number(state?.probability || 0) >= 0.08
      ),
    [timeline]
  );

  const latest = demo?.latest || null;

  const prediction = explainability?.prediction || {};

  const featureContributions =
    explainability?.feature_contributions || [];

  const temporalContributions =
    explainability?.temporal_contributions || [];

  const worldModel = demo?.world_model || {
    graphSnapshots: 930,
    graphEncoder: 'GraphSAGE',
    temporalModel: 'Temporal Transformer',
    horizon: 'T+1 / T+2 / T+3',
    t1: '+22.70%',
    t2: '+23.20%',
    t3: '+18.31%',
  };

  const positiveContributors = featureContributions.filter(
    (item) => Number(item?.shap_value || 0) > 0
  );

  const negativeContributors = featureContributions.filter(
    (item) => Number(item?.shap_value || 0) < 0
  );

  const maxAbsoluteShap = Math.max(
    ...featureContributions.map(
      (item) => Number(item?.absolute_shap || 0)
    ),
    0
  );

  return (
    <div className="space-y-6">

      {/* ------------------------------------------------------------------ */}
      {/* HEADER */}
      {/* ------------------------------------------------------------------ */}

      <section className="rounded-2xl border border-tc-border bg-threatcast-card p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

          <div>
            <div className="mb-2 inline-flex items-center rounded-full border border-threatcast-green/30 bg-threatcast-green/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-threatcast-green">
              Research Evidence
            </div>

            <h1 className="text-2xl font-bold text-threatcast-text">
              ThreatCast Research Demo
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-threatcast-silver">
              Explore model evidence and prediction signals from network data.
            </p>
          </div>

          <button
            type="button"
            onClick={loadDemo}
            disabled={loading}
            className="rounded-xl border border-tc-border bg-threatcast-card px-4 py-2.5 text-sm font-semibold text-threatcast-silver transition hover:bg-threatcast-elevated disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Running...' : 'Refresh Demo'}
          </button>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* CONTROLS */}
      {/* ------------------------------------------------------------------ */}

      <section className="rounded-2xl border border-tc-border bg-threatcast-card p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">

          <div>
            <label className="mb-2 block text-sm font-semibold text-threatcast-silver">
              Dataset sample
            </label>

            <select
              value={scenario}
              onChange={(event) =>
                setScenario(Number(event.target.value))
              }
              className="w-full rounded-xl border border-tc-border bg-threatcast-card px-3 py-2.5 text-sm text-threatcast-text outline-none focus:border-slate-500"
            >
              {Array.from({ length: 13 }, (_, index) => index + 1).map(
                (value) => (
                  <option key={value} value={value}>
                    Sample {value}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-threatcast-silver">
              States to Display
            </label>

            <select
              value={states}
              onChange={(event) =>
                setStates(Number(event.target.value))
              }
              className="w-full rounded-xl border border-tc-border bg-threatcast-card px-3 py-2.5 text-sm text-threatcast-text outline-none focus:border-slate-500"
            >
              {[10, 20, 30, 50].map((value) => (
                <option key={value} value={value}>
                  {value} states
                </option>
              ))}
            </select>
          </div>

        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* ERROR */}
      {/* ------------------------------------------------------------------ */}

      {error && (
        <section className="rounded-2xl border border-threatcast-red/30 bg-threatcast-red/10 p-5">
          <div className="text-sm font-semibold text-threatcast-red">
            Research Demo Error
          </div>

          <div className="mt-1 text-sm text-threatcast-red">
            {error}
          </div>

          <button
            type="button"
            onClick={loadDemo}
            className="mt-4 rounded-lg border border-threatcast-red/40 bg-threatcast-card px-3 py-2 text-sm font-semibold text-threatcast-red hover:bg-threatcast-red/20"
          >
            Retry
          </button>
        </section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* LOADING */}
      {/* ------------------------------------------------------------------ */}

      {loading && (
        <section className="rounded-2xl border border-tc-border bg-threatcast-card p-8 text-center shadow-sm">
          <div className="text-sm font-semibold text-threatcast-silver">
            Running CTU13 inference and live SHAP...
          </div>

          <div className="mt-2 text-xs text-threatcast-muted">
            Loading the selected scenario and computing a
            prediction-specific explanation.
          </div>
        </section>
      )}

      {!loading && demo && (
        <>
          {/* -------------------------------------------------------------- */}
          {/* MODEL STATUS */}
          {/* -------------------------------------------------------------- */}

          <section>
            <div className="mb-3">
              <h2 className="text-lg font-bold text-threatcast-text">
                Live Model Status
              </h2>

              <p className="text-sm text-threatcast-muted">
                Production CTU13 early-warning pipeline
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

              <div className="rounded-2xl border border-tc-border bg-threatcast-card p-5 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-threatcast-muted">
                  Model
                </div>

                <div className="mt-2 text-lg font-bold text-threatcast-text">
                  CTU13 LSTM
                </div>

                <div className="mt-1 text-xs text-threatcast-muted">
                  Real production artifact
                </div>
              </div>

              <div className="rounded-2xl border border-tc-border bg-threatcast-card p-5 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-threatcast-muted">
                  Input Window
                </div>

                <div className="mt-2 text-lg font-bold text-threatcast-text">
                  5 × 30 sec
                </div>

                <div className="mt-1 text-xs text-threatcast-muted">
                  150 seconds temporal context
                </div>
              </div>

              <div className="rounded-2xl border border-tc-border bg-threatcast-card p-5 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-threatcast-muted">
                  Features
                </div>

                <div className="mt-2 text-lg font-bold text-threatcast-text">
                  12
                </div>

                <div className="mt-1 text-xs text-threatcast-muted">
                  Production feature vector
                </div>
              </div>

              <div className="rounded-2xl border border-tc-border bg-threatcast-card p-5 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-threatcast-muted">
                  Warning Threshold
                </div>

                <div className="mt-2 text-lg font-bold text-threatcast-text">
                  8%
                </div>

                <div className="mt-1 text-xs text-threatcast-muted">
                  Early-warning decision threshold
                </div>
              </div>

            </div>
          </section>

          {/* -------------------------------------------------------------- */}
          {/* PREDICTION */}
          {/* -------------------------------------------------------------- */}

          <section>
            <div className="mb-3">
              <h2 className="text-lg font-bold text-threatcast-text">
                Current Prediction
              </h2>

              <p className="text-sm text-threatcast-muted">
                Generated from the selected CTU13 scenario
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">

              <div className="rounded-2xl border border-tc-border bg-threatcast-card p-6 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-threatcast-muted">
                  Warning Probability
                </div>

                <div className="mt-3 text-4xl font-bold text-threatcast-text">
                  {formatProbability(
                    prediction?.probability ?? latest?.probability
                  )}
                </div>

                <div className="mt-2 text-xs text-threatcast-muted">
                  Threshold: 8%
                </div>
              </div>

              <div className="rounded-2xl border border-tc-border bg-threatcast-card p-6 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-threatcast-muted">
                  Classification
                </div>

                <div className="mt-3">
                  <span
                    className={`inline-flex rounded-full px-3 py-1.5 text-sm font-bold ${
                      prediction?.warning
                        ? 'bg-red-100 text-threatcast-red'
                        : 'bg-threatcast-green/10 text-threatcast-green'
                    }`}
                  >
                    {prediction?.label ||
                      (latest?.warning
                        ? 'EARLY WARNING'
                        : 'NORMAL')}
                  </span>
                </div>

                <div className="mt-3 text-xs text-threatcast-muted">
                  Model: CTU13 LSTM
                </div>
              </div>

              <div className="rounded-2xl border border-tc-border bg-threatcast-card p-6 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-threatcast-muted">
                  Latest State
                </div>

                <div className="mt-3 text-sm font-bold text-threatcast-text">
                  Scenario {scenario}
                </div>

                <div className="mt-1 text-xs text-threatcast-muted">
                  {formatDate(
                    prediction?.timestamp ||
                      latest?.timestamp
                  )}
                </div>
              </div>

            </div>
          </section>

          {/* -------------------------------------------------------------- */}
          {/* TIMELINE */}
          {/* -------------------------------------------------------------- */}

          <section className="rounded-2xl border border-tc-border bg-threatcast-card p-6 shadow-sm">

            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-lg font-bold text-threatcast-text">
                  CTU13 Prediction Timeline
                </h2>

                <p className="text-sm text-threatcast-muted">
                  Chronological early-warning probability across the selected
                  network states
                </p>
              </div>

              <div className="text-xs font-semibold text-threatcast-muted">
                {flaggedStates.length} flagged state
                {flaggedStates.length === 1 ? '' : 's'}
              </div>
            </div>

            <div className="mt-6 overflow-x-auto">
              <div className="min-w-[720px] space-y-2">

                <div className="grid grid-cols-[1fr_130px_130px_120px] gap-3 border-b border-tc-border px-3 pb-3 text-xs font-semibold uppercase tracking-wide text-threatcast-muted">
                  <div>Timestamp</div>
                  <div>Probability</div>
                  <div>Target</div>
                  <div>Status</div>
                </div>

                {timeline.map((state, index) => {
                  const probability = Number(
                    state?.probability || 0
                  );

                  const warning =
                    state?.warning === true ||
                    probability >= 0.08;

                  return (
                    <div
                      key={`${state?.timestamp || index}-${index}`}
                      className={`grid grid-cols-[1fr_130px_130px_120px] gap-3 rounded-xl px-3 py-3 text-sm ${
                        warning
                          ? 'bg-threatcast-red/10'
                          : 'bg-threatcast-elevated'
                      }`}
                    >
                      <div className="text-threatcast-silver">
                        {formatDate(state?.timestamp)}
                      </div>

                      <div className="font-semibold text-threatcast-text">
                        {formatProbability(probability)}
                      </div>

                      <div className="text-threatcast-silver">
                        {state?.actual_target === 1
                          ? 'Early warning target'
                          : 'Normal'}
                      </div>

                      <div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                            warning
                              ? 'bg-red-100 text-threatcast-red'
                              : 'bg-threatcast-green/10 text-threatcast-green'
                          }`}
                        >
                          {warning ? 'WARNING' : 'NORMAL'}
                        </span>
                      </div>
                    </div>
                  );
                })}

              </div>
            </div>
          </section>

          {/* -------------------------------------------------------------- */}
          {/* LIVE SHAP */}
          {/* -------------------------------------------------------------- */}

          <section>
            <div className="mb-3">
              <h2 className="text-lg font-bold text-threatcast-text">
                Live Prediction-Specific Explainability
              </h2>

              <p className="text-sm text-threatcast-muted">
                SHAP contributions computed from the exact 5-state sequence
                used for the current prediction
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">

              {/* FEATURE CONTRIBUTIONS */}

              <div className="rounded-2xl border border-tc-border bg-threatcast-card p-6 shadow-sm">

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-threatcast-text">
                      Feature Contributions
                    </h3>

                    <p className="mt-1 text-xs text-threatcast-muted">
                      Aggregated SHAP contribution across the five-state
                      sequence
                    </p>
                  </div>

                  <span className="rounded-full bg-threatcast-cyan/10 px-3 py-1 text-xs font-semibold text-threatcast-cyan">
                    LIVE SHAP
                  </span>
                </div>

                <div className="mt-5 space-y-3">

                  {featureContributions.length === 0 && (
                    <div className="rounded-xl bg-threatcast-elevated p-4 text-sm text-threatcast-muted">
                      No feature explanation available.
                    </div>
                  )}

                  {featureContributions
                    .slice(0, 8)
                    .map((item) => {
                      const absoluteShap = Number(
                        item?.absolute_shap || 0
                      );

                      const width =
                        maxAbsoluteShap > 0
                          ? Math.max(
                              4,
                              (absoluteShap /
                                maxAbsoluteShap) *
                                100
                            )
                          : 4;

                      const positive =
                        Number(item?.shap_value || 0) > 0;

                      return (
                        <div key={item.feature}>

                          <div className="mb-1 flex items-center justify-between gap-3">
                            <div className="text-xs font-semibold text-threatcast-silver">
                              {item.feature}
                            </div>

                            <div
                              className={`text-xs font-bold ${
                                positive
                                  ? 'text-red-600'
                                  : 'text-threatcast-green'
                              }`}
                            >
                              {Number(
                                item?.shap_value || 0
                              ) > 0
                                ? '+'
                                : ''}
                              {formatNumber(
                                item?.shap_value,
                                6
                              )}
                            </div>
                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-threatcast-elevated">
                            <div
                              className={`h-full rounded-full ${
                                positive
                                  ? 'bg-red-400'
                                  : 'bg-threatcast-green'
                              }`}
                              style={{
                                width: `${width}%`,
                              }}
                            />
                          </div>

                          <div className="mt-1 flex justify-between text-[11px] text-threatcast-muted">
                            <span>
                              {positive
                                ? 'Increases warning probability'
                                : 'Decreases warning probability'}
                            </span>

                            <span>
                              Current:{' '}
                              {formatNumber(
                                item?.current_value
                              )}
                            </span>
                          </div>

                        </div>
                      );
                    })}

                </div>

              </div>

              {/* POSITIVE / NEGATIVE */}

              <div className="rounded-2xl border border-tc-border bg-threatcast-card p-6 shadow-sm">

                <div>
                  <h3 className="font-bold text-threatcast-text">
                    Direction of Evidence
                  </h3>

                  <p className="mt-1 text-xs text-threatcast-muted">
                    Which features push the model toward or away from an
                    early warning
                  </p>
                </div>

                <div className="mt-5 grid gap-5 md:grid-cols-2">

                  <div>
                    <div className="mb-3 text-xs font-bold uppercase tracking-wide text-red-600">
                      Increases Warning
                    </div>

                    <div className="space-y-2">
                      {positiveContributors.length === 0 && (
                        <div className="rounded-xl bg-threatcast-elevated p-3 text-xs text-threatcast-muted">
                          No positive contributors.
                        </div>
                      )}

                      {positiveContributors
                        .slice(0, 6)
                        .map((item) => (
                          <div
                            key={item.feature}
                            className="rounded-xl bg-threatcast-red/10 p-3"
                          >
                            <div className="text-xs font-semibold text-threatcast-text">
                              {item.feature}
                            </div>

                            <div className="mt-1 text-xs font-bold text-red-600">
                              +{formatNumber(
                                item.shap_value,
                                6
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-3 text-xs font-bold uppercase tracking-wide text-threatcast-green">
                      Decreases Warning
                    </div>

                    <div className="space-y-2">
                      {negativeContributors.length === 0 && (
                        <div className="rounded-xl bg-threatcast-elevated p-3 text-xs text-threatcast-muted">
                          No negative contributors.
                        </div>
                      )}

                      {negativeContributors
                        .slice(0, 6)
                        .map((item) => (
                          <div
                            key={item.feature}
                            className="rounded-xl bg-threatcast-green/10 p-3"
                          >
                            <div className="text-xs font-semibold text-threatcast-text">
                              {item.feature}
                            </div>

                            <div className="mt-1 text-xs font-bold text-threatcast-green">
                              {formatNumber(
                                item.shap_value,
                                6
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                </div>

              </div>

            </div>

            <div className="mt-4 rounded-xl border border-threatcast-cyan/30 bg-threatcast-cyan/10 p-4 text-xs leading-5 text-threatcast-cyan">
              <strong>Explanation method:</strong>{' '}
              {explainability?.explanation_method ||
                'LIVE SHAP GradientExplainer'}
              . SHAP values are computed live from the exact 5 × 12 input
              sequence supplied to the production CTU13 LSTM.
            </div>
          </section>

          {/* -------------------------------------------------------------- */}
          {/* TEMPORAL SHAP */}
          {/* -------------------------------------------------------------- */}

          <section className="rounded-2xl border border-tc-border bg-threatcast-card p-6 shadow-sm">

            <div>
              <h2 className="text-lg font-bold text-threatcast-text">
                Temporal Reasoning
              </h2>

              <p className="mt-1 text-sm text-threatcast-muted">
                Post-hoc temporal attribution across the five-state LSTM
                sequence
              </p>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-5">

              {temporalContributions.map((item) => (
                <div
                  key={item.timestep}
                  className="rounded-2xl border border-tc-border bg-threatcast-elevated p-4"
                >
                  <div className="text-xs font-semibold uppercase tracking-wide text-threatcast-muted">
                    {item.label}
                  </div>

                  <div className="mt-3 text-2xl font-bold text-threatcast-text">
                    {Number(item?.percentage || 0).toFixed(2)}%
                  </div>

                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-threatcast-card"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(
                            0,
                            Number(item?.percentage || 0)
                          )
                        )}%`,
                      }}
                    />
                  </div>

                  <div className="mt-2 text-[11px] text-threatcast-muted">
                    Absolute SHAP:{' '}
                    {formatNumber(
                      item?.absolute_shap,
                      6
                    )}
                  </div>
                </div>
              ))}

            </div>

            <div className="mt-5 rounded-xl bg-threatcast-elevated p-4 text-xs leading-5 text-threatcast-silver">
              This temporal view is derived from the absolute SHAP
              contribution of each timestep. It is a post-hoc attribution
              method and should not be described as internal learned
              attention.
            </div>

          </section>

          {/* -------------------------------------------------------------- */}
          {/* WORLD MODEL */}
          {/* -------------------------------------------------------------- */}

          <section className="rounded-2xl border border-tc-border bg-threatcast-card p-6 shadow-sm">

            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">

              <div>
                <h2 className="text-lg font-bold text-threatcast-text">
                  Packet-Level World Model Research
                </h2>

                <p className="mt-1 max-w-3xl text-sm text-threatcast-muted">
                  Separate research pipeline using packet-graph snapshots
                  and temporal latent dynamics. This pipeline is not the
                  production CTU13 attack-risk classifier.
                </p>
              </div>

              <span className="rounded-full bg-threatcast-violet/10 px-3 py-1 text-xs font-semibold text-threatcast-violet">
                RESEARCH PIPELINE
              </span>

            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

              <div className="rounded-2xl bg-threatcast-elevated p-5">
                <div className="text-xs font-semibold uppercase tracking-wide text-threatcast-muted">
                  Graph Snapshots
                </div>

                <div className="mt-2 text-2xl font-bold text-threatcast-text">
                  {formatNumber(
                    worldModel.graphSnapshots,
                    0
                  )}
                </div>

                <div className="mt-1 text-xs text-threatcast-muted">
                  30-second packet windows
                </div>
              </div>

              <div className="rounded-2xl bg-threatcast-elevated p-5">
                <div className="text-xs font-semibold uppercase tracking-wide text-threatcast-muted">
                  Graph Encoder
                </div>

                <div className="mt-2 text-2xl font-bold text-threatcast-text">
                  {worldModel.graphEncoder}
                </div>

                <div className="mt-1 text-xs text-threatcast-muted">
                  Packet interaction representation
                </div>
              </div>

              <div className="rounded-2xl bg-threatcast-elevated p-5">
                <div className="text-xs font-semibold uppercase tracking-wide text-threatcast-muted">
                  Temporal Model
                </div>

                <div className="mt-2 text-xl font-bold text-threatcast-text">
                  {worldModel.temporalModel}
                </div>

                <div className="mt-1 text-xs text-threatcast-muted">
                  Learned latent dynamics
                </div>
              </div>

              <div className="rounded-2xl bg-threatcast-elevated p-5">
                <div className="text-xs font-semibold uppercase tracking-wide text-threatcast-muted">
                  Forecast Horizon
                </div>

                <div className="mt-2 text-xl font-bold text-threatcast-text">
                  {worldModel.horizon}
                </div>

                <div className="mt-1 text-xs text-threatcast-muted">
                  Autoregressive latent rollout
                </div>
              </div>

            </div>

            <div className="mt-6">
              <h3 className="mb-3 text-sm font-bold text-threatcast-text">
                K-Step Latent Forecast Improvement
              </h3>

              <div className="grid gap-3 md:grid-cols-3">

                <div className="rounded-xl border border-tc-border p-4">
                  <div className="text-xs font-semibold text-threatcast-muted">
                    T+1
                  </div>

                  <div className="mt-2 text-xl font-bold text-threatcast-text">
                    {worldModel.t1}
                  </div>

                  <div className="mt-1 text-xs text-threatcast-muted">
                    vs persistence baseline
                  </div>
                </div>

                <div className="rounded-xl border border-tc-border p-4">
                  <div className="text-xs font-semibold text-threatcast-muted">
                    T+2
                  </div>

                  <div className="mt-2 text-xl font-bold text-threatcast-text">
                    {worldModel.t2}
                  </div>

                  <div className="mt-1 text-xs text-threatcast-muted">
                    vs persistence baseline
                  </div>
                </div>

                <div className="rounded-xl border border-tc-border p-4">
                  <div className="text-xs font-semibold text-threatcast-muted">
                    T+3
                  </div>

                  <div className="mt-2 text-xl font-bold text-threatcast-text">
                    {worldModel.t3}
                  </div>

                  <div className="mt-1 text-xs text-threatcast-muted">
                    vs persistence baseline
                  </div>
                </div>

              </div>
            </div>

            <div className="mt-5 rounded-xl border border-threatcast-amber/30 bg-threatcast-amber/10 p-4 text-xs leading-5 text-threatcast-amber">
              <strong>Scope:</strong> these forecasts represent latent
              network-dynamics prediction. They are not trained attack-risk
              probabilities, MITRE ATT&CK stage predictions, or production
              early-warning outputs.
            </div>

          </section>

          {/* -------------------------------------------------------------- */}
          {/* EVIDENCE / LIMITATIONS */}
          {/* -------------------------------------------------------------- */}

          <section className="rounded-2xl border border-tc-border bg-threatcast-card p-6 shadow-sm">

            <div>
              <h2 className="text-lg font-bold text-threatcast-text">
                Evidence & Limitations
              </h2>

              <p className="mt-1 text-sm text-threatcast-muted">
                What this research demo demonstrates and what it does not
                claim
              </p>
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-2">

              <div>
                <h3 className="mb-3 text-sm font-bold text-threatcast-green">
                  Demonstrated
                </h3>

                <ul className="space-y-2 text-sm leading-6 text-threatcast-silver">
                  <li>
                    • Real CTU13 network-state features
                  </li>

                  <li>
                    • Production 5 × 12 CTU13 LSTM inference
                  </li>

                  <li>
                    • Prediction-specific live SHAP
                  </li>

                  <li>
                    • Five-timestep post-hoc temporal attribution
                  </li>

                  <li>
                    • Separate packet-level graph representation
                  </li>

                  <li>
                    • GraphSAGE-style spatial encoding
                  </li>

                  <li>
                    • Temporal Transformer latent dynamics
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-bold text-threatcast-amber">
                  Limitations
                </h3>

                <ul className="space-y-2 text-sm leading-6 text-threatcast-silver">
                  <li>
                    • Live SHAP accepts a 5 × 12 network-state sequence,
                    not arbitrary PCAP uploads.
                  </li>

                  <li>
                    • Temporal attribution is post-hoc, not learned
                    attention.
                  </li>

                  <li>
                    • The packet world model is separate from the production
                    CTU13 LSTM.
                  </li>

                  <li>
                    • World-model rollout predicts latent network dynamics,
                    not attack stages.
                  </li>

                  <li>
                    • CTU13 and DAPT2020 are separate datasets and are not
                    timestamp-synchronized.
                  </li>

                  <li>
                    • No unsupported attack-stage labels are fabricated for
                    the packet graph pipeline.
                  </li>
                </ul>
              </div>

            </div>

          </section>

          {/* -------------------------------------------------------------- */}
          {/* TECHNICAL TRACE */}
          {/* -------------------------------------------------------------- */}

          <section className="rounded-2xl border border-tc-border bg-threatcast-deep p-6 text-white shadow-sm">

            <div>
              <h2 className="text-lg font-bold">
                Live Inference Trace
              </h2>

              <p className="mt-1 text-sm text-threatcast-silver">
                Exact pipeline executed for this Research Demo refresh
              </p>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-5">

              {[
                'CTU13 network states',
                'Latest 5 states',
                '12 production features',
                'CTU13 LSTM',
                'Live GradientExplainer',
              ].map((step, index) => (
                <div
                  key={step}
                  className="rounded-xl border border-tc-border bg-threatcast-elevated p-4"
                >
                  <div className="text-xs font-bold text-threatcast-muted">
                    STEP {index + 1}
                  </div>

                  <div className="mt-2 text-sm font-semibold">
                    {step}
                  </div>
                </div>
              ))}

            </div>

            <div className="mt-5 rounded-xl border border-tc-border bg-threatcast-elevated p-4 text-xs leading-5 text-threatcast-silver">
              The explanation shown above is generated from the same
              five-state sequence used to produce the current CTU13 LSTM
              prediction. The frontend no longer requests the legacy
              <code className="mx-1 rounded bg-threatcast-card px-1.5 py-0.5">
                INC-8042
              </code>
              precomputed explanation.
            </div>

          </section>
        </>
      )}
    </div>
  );
}
