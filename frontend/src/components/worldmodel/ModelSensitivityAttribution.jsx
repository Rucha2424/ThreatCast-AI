import React from "react";

function percent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${(n * 100).toFixed(2)}%`;
}

function signedPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  const prefix = n > 0 ? "+" : "";
  return `${prefix}${(n * 100).toFixed(2)} pp`;
}

function signedNumber(value, digits = 4) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  const prefix = n > 0 ? "+" : "";
  return `${prefix}${n.toFixed(digits)}`;
}

function flowLabel(flow) {
  if (!flow) return "Unknown flow";
  return `${flow.src_ip ?? "?"}:${flow.src_port ?? 0} → ${flow.dst_ip ?? "?"}:${flow.dst_port ?? 0}`;
}

function Effect({ horizon, data }) {
  const delta = Number(data?.probability_delta);
  const direction = Number.isFinite(delta)
    ? delta < 0
      ? "Prediction decreased when removed"
      : delta > 0
        ? "Prediction increased when removed"
        : "No probability change"
    : "No sensitivity value";

  return (
    <div className="rounded-lg border border-slate-800 bg-threatcast-elevated p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-200">{horizon}</p>
        <span
          className={`rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-wider ${
            Number.isFinite(delta) && delta < 0
              ? "bg-red-400/10 text-red-300"
              : Number.isFinite(delta) && delta > 0
                ? "bg-amber-400/10 text-amber-300"
                : "bg-slate-700/50 text-slate-400"
          }`}
        >
          {Number.isFinite(delta) ? signedPercent(delta) : "—"}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">
            Baseline
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-200">
            {percent(data?.baseline_raw_probability)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">
            Without flow
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-200">
            {percent(data?.without_flow_raw_probability)}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-1 text-xs text-slate-500">
        <p>
          Logit change: {signedNumber(data?.logit_delta)}
        </p>
        <p>{direction}</p>
      </div>
    </div>
  );
}

export default function ModelSensitivityAttribution({ attribution }) {
  if (!attribution) return null;

  if (!attribution.available) {
    return (
      <div className="rounded-2xl border border-slate-700 bg-threatcast-card p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-100">
              Model Sensitivity Attribution
            </h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Leave-one-flow-out sensitivity analysis against the frozen
              CTU13 world model.
            </p>
          </div>
          <span className="rounded-full border border-slate-700 bg-slate-900/50 px-3 py-1 text-[10px] uppercase tracking-wider text-slate-500">
            Unavailable
          </span>
        </div>
        <p className="mt-4 text-sm text-slate-500">
          {attribution.reason || "Model sensitivity could not be computed."}
        </p>
      </div>
    );
  }

  const flows = Array.isArray(attribution.flows)
    ? attribution.flows
    : [];

  return (
    <div className="rounded-2xl border border-cyan-400/20 bg-threatcast-card p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">
            Model Sensitivity Attribution
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Leave-one-flow-out perturbation of the frozen CTU13 temporal risk
            world model. Removing a flow and rerunning inference shows how
            sensitive the raw risk output is to that flow's traffic.
          </p>
        </div>

        <span className="w-fit rounded-full border border-cyan-400/30 bg-cyan-400/5 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-cyan-300">
          Model perturbation
        </span>
      </div>

      <div className="mt-5 rounded-lg border border-amber-400/20 bg-amber-400/5 p-4 text-xs leading-5 text-amber-200/80">
        <span className="font-semibold text-amber-200">Important:</span>{" "}
        This is model-sensitivity analysis, not causal attribution, not
        packet-level SHAP, and not a maliciousness probability. A negative
        probability delta means the model's raw probability decreased after
        that flow was removed.
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-slate-800 bg-threatcast-elevated p-4">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">
            Flows analyzed
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-100">
            {attribution.flow_count_analyzed ?? flows.length}
          </p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-threatcast-elevated p-4">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">
            T+1 baseline
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-100">
            {percent(attribution.baseline?.raw_probabilities?.[0])}
          </p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-threatcast-elevated p-4">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">
            T+2 baseline
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-100">
            {percent(attribution.baseline?.raw_probabilities?.[1])}
          </p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-threatcast-elevated p-4">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">
            T+3 baseline
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-100">
            {percent(attribution.baseline?.raw_probabilities?.[2])}
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {flows.map((item, index) => (
          <div
            key={`${item?.flow?.src_ip}-${item?.flow?.src_port}-${item?.flow?.dst_ip}-${item?.flow?.dst_port}-${index}`}
            className="rounded-xl border border-slate-800 bg-threatcast-elevated p-5"
          >
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500">
                  Flow #{item?.rank ?? index + 1}
                </p>
                <p className="mt-1 font-mono text-sm text-cyan-300">
                  {flowLabel(item?.flow)}
                </p>
              </div>
              <div className="text-xs text-slate-500">
                Removed packets: {item?.removed_packet_count ?? "—"}
              </div>
            </div>

            {item?.available === false ? (
              <p className="mt-4 text-sm text-red-300">
                {item.reason || "Ablation unavailable."}
              </p>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
                <Effect horizon="T+1" data={item?.effects?.["T+1"]} />
                <Effect horizon="T+2" data={item?.effects?.["T+2"]} />
                <Effect horizon="T+3" data={item?.effects?.["T+3"]} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-lg border border-slate-800 bg-threatcast-elevated p-4">
        <p className="text-xs leading-5 text-slate-500">
          The analysis keeps the trained weights fixed and changes only the
          uploaded traffic by removing one directional flow at a time. It is
          therefore a perturbation-based sensitivity measure. It does not
          establish that the flow caused the model output.
        </p>
      </div>
    </div>
  );
}
