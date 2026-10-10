import React, { useEffect, useState } from "react";
import MotionReveal from "../components/common/MotionReveal";
import { usePcapAnalysis } from "../context/PcapAnalysisContext";

const API_BASE_URL = "http://127.0.0.1:8000";
const WARNING_THRESHOLD = 0.08;


function formatPercent(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0.00%";
  }

  return `${(number * 100).toFixed(4)}%`;
}


function Card({ title, children, className = "" }) {
  return (
    <MotionReveal className={className} hover>
      <div className="rounded-2xl border border-tc-border bg-threatcast-card p-5 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-wider text-threatcast-cyan">
        {title}
      </div>

      <div className="mt-3">
        {children}
      </div>
      </div>
    </MotionReveal>
  );
}


export default function AttackForecast() {

  const [forecast, setForecast] = useState(null);
  const [comparison, setComparison] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { analysis, fileName } = usePcapAnalysis();


  const loadForecast = async () => {

    try {

      setLoading(true);
      setError("");


      const [forecastResponse, comparisonResponse] =
        await Promise.all([
          fetch(`${API_BASE_URL}/api/forecast`),
          fetch(`${API_BASE_URL}/api/forecast/comparison`),
        ]);


      if (!forecastResponse.ok) {
        throw new Error(
          `Forecast request failed: ${forecastResponse.status}`
        );
      }


      const forecastData =
        await forecastResponse.json();


      let comparisonData = null;


      if (comparisonResponse.ok) {
        comparisonData =
          await comparisonResponse.json();
      }


      setForecast(forecastData);
      setComparison(comparisonData);

    } catch (err) {

      console.error(
        "Failed to load CTU13 forecast:",
        err
      );

      setError(
        err?.message ||
          "Unable to load CTU13 LSTM forecast."
      );

    } finally {

      setLoading(false);

    }
  };


  useEffect(() => {

    if (analysis?.world_model?.rollout?.length) {
      const first = analysis.world_model.rollout[0];
      const probability = Number(first.risk_probability ?? first.risk_probability_percent ?? 0);
      setForecast({
        current_state: {
          stage_name: first.predicted_attack ? "Early Warning" : "Normal Network State",
          confidence: probability > 1 ? probability / 100 : probability,
          probability_distribution: { "Early Warning": probability > 1 ? probability / 100 : probability },
        },
        last_updated: new Date().toISOString(),
      });
      setComparison(null);
      setLoading(false);
      return;
    }

    loadForecast();

  }, [analysis]);


  if (loading && !forecast) {

    return (
      <div className="p-8 text-sm text-threatcast-muted">
        Loading CTU13 LSTM early-warning forecast...
      </div>
    );

  }


  if (error && !forecast) {

    return (
      <div className="p-8">

        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">

          <div className="text-sm font-bold text-red-700">
            Forecast unavailable
          </div>

          <div className="mt-2 text-sm text-red-600">
            {error}
          </div>

          <button
            onClick={loadForecast}
            className="mt-4 rounded-lg border border-red-300 bg-threatcast-card px-4 py-2 text-xs font-semibold text-red-700"
          >
            Retry
          </button>

        </div>

      </div>
    );

  }


  const current =
    forecast?.current_state || {};


  const probability = Number(
    current?.probability_distribution?.["Early Warning"] ??
      current?.confidence ??
      0
  );


  const warning =
    probability >= WARNING_THRESHOLD;


  const scenario =
    forecast?.last_updated
      ? "Latest CTU13 scenario"
      : "CTU13";


  return (
    <div className="min-h-screen bg-threatcast-card px-5 py-6 md:px-8">

      {/* HEADER */}

      <div className="mb-6 border-b border-tc-border pb-5">

        <div className="flex flex-wrap items-start justify-between gap-4">

          <div>

            <h1 className="text-3xl font-bold tracking-tight text-threatcast-text">
              {fileName ? "Uploaded PCAP Early-Warning Forecast" : "CTU13 LSTM Early-Warning Forecast"}
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-threatcast-muted">
              Early-warning risk assessment from five consecutive
              30-second CTU13 network-state observations.
            </p>

          </div>


          <div className="rounded-full border border-tc-border bg-threatcast-elevated px-4 py-2 text-xs font-semibold text-threatcast-cyan">
            CTU13 LSTM
          </div>

        </div>

      </div>


      {/* MODEL SCOPE */}

      <Card title="Model scope" className="mb-6">

        <p className="text-sm leading-6 text-threatcast-text">

          The deployed model performs binary early-warning
          prediction. It does not independently predict
          MITRE ATT&amp;CK stages, individual hosts, future
          attack paths, or a three-step attack progression.

        </p>

      </Card>


      {/* MAIN ASSESSMENT */}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">

        <Card title="Current network state">

          <div className="text-2xl font-bold text-threatcast-text">
            {current.stage_name ||
              "Normal Network State"}
          </div>

          <div className="mt-3 text-sm text-threatcast-muted">
            {scenario}
          </div>

        </Card>


        <Card title="Early-warning probability">

          <div
            className={`text-3xl font-bold ${
              warning
                ? "text-threatcast-cyan"
                : "text-threatcast-green"
            }`}
          >
            {formatPercent(probability)}
          </div>

          <div className="mt-2 text-xs text-threatcast-muted">
            Deployment threshold: 8.00%
          </div>

        </Card>


        <Card title="Assessment">

          <div
            className={`text-2xl font-bold ${
              warning
                ? "text-threatcast-cyan"
                : "text-threatcast-green"
            }`}
          >
            {warning
              ? "EARLY WARNING"
              : "NORMAL"}
          </div>

          <div className="mt-2 text-sm text-threatcast-muted">
            {warning
              ? "Probability is at or above the deployed threshold."
              : "Probability is below the deployed threshold."}
          </div>

        </Card>

      </div>


      {/* TEMPORAL WINDOW */}

      <Card title="Temporal input window" className="mt-6">

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">

          <div>

            <div className="text-2xl font-bold text-threatcast-text">
              5
            </div>

            <div className="text-xs text-threatcast-muted">
              consecutive network states
            </div>

          </div>


          <div>

            <div className="text-2xl font-bold text-threatcast-text">
              30s
            </div>

            <div className="text-xs text-threatcast-muted">
              duration of each state
            </div>

          </div>


          <div>

            <div className="text-2xl font-bold text-threatcast-text">
              12
            </div>

            <div className="text-xs text-threatcast-muted">
              engineered input features
            </div>

          </div>

        </div>

      </Card>


      {/* MODEL DETAILS */}

      <Card title="Deployed model" className="mt-6">

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

          <div>

            <div className="text-xs uppercase tracking-wider text-threatcast-cyan">
              Model
            </div>

            <div className="mt-1 text-sm font-semibold text-threatcast-text">
              CTU13 LSTM Early Warning
            </div>

          </div>


          <div>

            <div className="text-xs uppercase tracking-wider text-threatcast-cyan">
              Architecture
            </div>

            <div className="mt-1 text-sm font-semibold text-threatcast-text">
              LSTM 64 → Dropout → Dense 32 → Sigmoid
            </div>

          </div>


          <div>

            <div className="text-xs uppercase tracking-wider text-threatcast-cyan">
              Output
            </div>

            <div className="mt-1 text-sm font-semibold text-threatcast-text">
              Binary early-warning probability
            </div>

          </div>


          <div>

            <div className="text-xs uppercase tracking-wider text-threatcast-cyan">
              Threshold
            </div>

            <div className="mt-1 text-sm font-semibold text-threatcast-text">
              0.08
            </div>

          </div>

        </div>

      </Card>


      {/* COMPARISON */}

      {comparison && (

        <Card title="Research model comparison" className="mt-6">

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

            <div className="rounded-xl border border-tc-border bg-threatcast-elevated p-4">

              <div className="text-xs font-bold uppercase text-threatcast-cyan">
                CTU13 LSTM
              </div>

              <div className="mt-2 text-sm font-semibold text-threatcast-text">
                Binary early-warning prediction
              </div>

              <div className="mt-2 text-xs leading-5 text-threatcast-muted">
                {comparison?.lstm_a?.feature_type}
              </div>

            </div>


            <div className="rounded-xl border border-tc-border bg-threatcast-card p-4">

              <div className="text-xs font-bold uppercase text-threatcast-cyan">
                DAPT2020 LSTM
              </div>

              <div className="mt-2 text-sm font-semibold text-threatcast-text">
                Separate attack-stage research model
              </div>

              <div className="mt-2 text-xs leading-5 text-threatcast-muted">
                This model is not the deployed CTU13
                early-warning engine.
              </div>

            </div>

          </div>


          <div className="mt-5 rounded-xl border border-tc-border bg-threatcast-card p-4 text-xs leading-5 text-threatcast-muted">
            The two research models use different datasets
            and prediction tasks. Their confidence values
            should not be interpreted as directly comparable
            attack probabilities.
          </div>

        </Card>

      )}


      {/* FOOTER */}

      <div className="mt-6 rounded-2xl border border-tc-border bg-threatcast-card p-5">

        <div className="text-xs font-bold uppercase tracking-wider text-threatcast-cyan">
          Forecast interpretation
        </div>

        <p className="mt-2 text-sm leading-6 text-threatcast-text">

          This page reports the actual CTU13 LSTM early-warning
          output. A NORMAL result means the current probability
          is below the deployed threshold; it does not prove
          that the network is completely free of attacks.

        </p>

      </div>

    </div>
  );
}
