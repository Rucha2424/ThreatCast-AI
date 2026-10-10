import React, { useMemo, useState } from "react";

function formatNumber(value, decimals = 0) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return number.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatPercent(value, decimals = 1) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return `${(number * 100).toFixed(decimals)}%`;
}

function formatBytes(value) {
  const bytes = Number(value);

  if (!Number.isFinite(bytes)) {
    return "—";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTimestamp(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString();
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function firstDefined(...values) {
  return values.find(
    (value) => value !== null && value !== undefined
  );
}

function StatCard({ label, value, danger = false, positive = false }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-threatcast-elevated p-4">
      <p className="text-[10px] uppercase tracking-wider text-slate-600">
        {label}
      </p>

      <p
        className={`mt-2 text-xl font-semibold ${
          danger
            ? "text-red-300"
            : positive
              ? "text-emerald-300"
              : "text-slate-100"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-threatcast-card p-3">
      <p className="text-[9px] uppercase tracking-wider text-slate-600">
        {label}
      </p>

      <p className="mt-1 break-words text-xs text-slate-300">
        {value ?? "—"}
      </p>
    </div>
  );
}

function FlagBadge({ active, label }) {
  return (
    <span
      className={`rounded-md border px-2 py-1 text-[10px] font-medium ${
        active
          ? "border-cyan-400/30 bg-cyan-400/5 text-cyan-300"
          : "border-slate-800 bg-slate-900/40 text-slate-600"
      }`}
    >
      {label}: {active ? "YES" : "NO"}
    </span>
  );
}

function FlowCard({ flow, index }) {
  const [expanded, setExpanded] = useState(false);

  const flags = flow?.tcp_flags || {};
  const evidence = flow?.evidence || {};

  const delta = Number(
    firstDefined(
      flow?.strongest_effect?.probability_delta,
      flow?.probability_delta
    )
  );

  const absoluteDelta = Number(
    firstDefined(
      flow?.strongest_effect?.absolute_probability_delta,
      flow?.absolute_probability_delta,
      Number.isFinite(delta) ? Math.abs(delta) : NaN
    )
  );

  const flagged = Boolean(
    firstDefined(flow?.flagged, evidence?.flagged, false)
  );

  const reasons = safeArray(
    firstDefined(
      flow?.evidence_reasons,
      flow?.reasons,
      evidence?.evidence_reasons
    )
  );

  return (
    <div
      className={`overflow-hidden rounded-xl border bg-threatcast-elevated ${
        flagged
          ? "border-red-400/20"
          : "border-slate-700"
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="w-full p-5 text-left transition hover:bg-slate-800/20"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {flagged && (
                <span className="rounded-md border border-red-400/20 bg-red-400/5 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-red-300">
                  FLAGGED
                </span>
              )}

              <span className="rounded-full border border-slate-700 bg-slate-900/50 px-2 py-1 text-[10px] text-slate-500">
                FLOW #{index + 1}
              </span>

              <span className="rounded-full border border-slate-700 bg-slate-900/50 px-2 py-1 text-[10px] text-slate-500">
                {flow?.protocol || "UNKNOWN"}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm text-cyan-300">
                {flow?.src_ip || "?"}:{flow?.src_port ?? "?"}
              </span>

              <span className="text-slate-600">→</span>

              <span className="font-mono text-sm text-slate-200">
                {flow?.dst_ip || "?"}:{flow?.dst_port ?? "?"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-5">
            <div className="text-right">
              <p className="text-[9px] uppercase tracking-wider text-slate-600">
                Model Δ
              </p>

              <p
                className={`mt-1 text-lg font-semibold ${
                  Number.isFinite(delta)
                    ? delta > 0
                      ? "text-emerald-300"
                      : delta < 0
                        ? "text-amber-300"
                        : "text-slate-300"
                    : "text-slate-300"
                }`}
              >
                {Number.isFinite(delta)
                  ? `${delta >= 0 ? "+" : ""}${delta.toFixed(4)}`
                  : "—"}
              </p>
            </div>

            <div className="text-right">
              <p className="text-[9px] uppercase tracking-wider text-slate-600">
                Max |Δ|
              </p>

              <p className="mt-1 text-lg font-semibold text-cyan-300">
                {Number.isFinite(absoluteDelta)
                  ? absoluteDelta.toFixed(4)
                  : "—"}
              </p>
            </div>

            <span className="text-xs text-slate-500">
              {expanded ? "Collapse" : "Inspect"}
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
          <Info
            label="Packets Removed"
            value={formatNumber(
              firstDefined(
                flow?.packet_count_removed,
                flow?.evidence?.packet_count
              )
            )}
          />

          <Info
            label="Evidence Score"
            value={formatNumber(
              firstDefined(
                flow?.evidence?.evidence_score,
                flow?.evidence_score
              ),
              2
            )}
          />

          <Info
            label="SYN"
            value={formatNumber(
              firstDefined(
                flags.SYN,
                evidence.syn
              )
            )}
          />

          <Info
            label="ACK"
            value={formatNumber(
              firstDefined(
                flags.ACK,
                evidence.ack
              )
            )}
          />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-800 p-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Info
              label="RST"
              value={formatNumber(
                firstDefined(flags.RST, evidence.rst)
              )}
            />

            <Info
              label="FIN"
              value={formatNumber(
                firstDefined(flags.FIN, evidence.fin)
              )}
            />

            <Info
              label="PSH"
              value={formatNumber(
                firstDefined(flags.PSH, evidence.psh)
              )}
            />

            <Info
              label="Bytes"
              value={formatBytes(
                firstDefined(
                  flow?.byte_count,
                  evidence.byte_count
                )
              )}
            />

            <Info
              label="Packets"
              value={formatNumber(
                firstDefined(
                  flow?.packet_count,
                  evidence.packet_count
                )
              )}
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <FlagBadge
              active={Boolean(
                firstDefined(
                  flow?.syn_without_ack,
                  evidence.syn_without_ack,
                  false
                )
              )}
              label="SYN without ACK"
            />

            <FlagBadge
              active={Boolean(
                firstDefined(
                  flags.SYN,
                  evidence.syn,
                  0
                ) > 0
              )}
              label="SYN"
            />

            <FlagBadge
              active={Boolean(
                firstDefined(
                  flags.RST,
                  evidence.rst,
                  0
                ) > 0
              )}
              label="RST"
            />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Info
              label="First Seen"
              value={formatTimestamp(flow?.first_seen)}
            />

            <Info
              label="Last Seen"
              value={formatTimestamp(flow?.last_seen)}
            />

            <Info
              label="T+ Horizon"
              value={flow?.strongest_effect?.horizon || "—"}
            />

            <Info
              label="Interpretation"
              value={
                flow?.strongest_effect?.interpretation ||
                "No interpretation available."
              }
            />
          </div>

          {reasons.length > 0 && (
            <div className="mt-5">
              <p className="text-[10px] uppercase tracking-wider text-slate-600">
                Evidence Reasons
              </p>

              <div className="mt-3 space-y-2">
                {reasons.map((reason, reasonIndex) => (
                  <div
                    key={`${String(reason)}-${reasonIndex}`}
                    className="flex items-start gap-2 text-xs text-slate-400"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                    <span>{String(reason)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {safeArray(flow?.horizons).map((item, horizonIndex) => {
              const horizon = item?.horizon || `T+${horizonIndex + 1}`;
              const baseline = Number(
                item?.baseline_probability
              );
              const withoutFlow = Number(
                item?.without_flow_probability
              );
              const horizonDelta = Number(
                item?.probability_delta
              );

              return (
                <div
                  key={`${horizon}-${horizonIndex}`}
                  className="rounded-lg border border-slate-800 bg-threatcast-card p-4"
                >
                  <p className="text-[10px] font-medium uppercase tracking-wider text-cyan-300">
                    {horizon}
                  </p>

                  <div className="mt-3 space-y-2 text-xs">
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-600">
                        Baseline
                      </span>
                      <span className="text-slate-300">
                        {formatPercent(baseline)}
                      </span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span className="text-slate-600">
                        Without flow
                      </span>
                      <span className="text-slate-300">
                        {formatPercent(withoutFlow)}
                      </span>
                    </div>

                    <div className="flex justify-between gap-3 border-t border-slate-800 pt-2">
                      <span className="text-slate-600">
                        Δ probability
                      </span>
                      <span
                        className={
                          Number.isFinite(horizonDelta)
                            ? horizonDelta > 0
                              ? "font-medium text-emerald-300"
                              : horizonDelta < 0
                                ? "font-medium text-amber-300"
                                : "text-slate-300"
                            : "text-slate-300"
                        }
                      >
                        {Number.isFinite(horizonDelta)
                          ? `${horizonDelta >= 0 ? "+" : ""}${horizonDelta.toFixed(4)}`
                          : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function HorizonCard({ horizon, data }) {
  const baseline = Number(
    data?.baseline_probability
  );

  const withoutFlow = Number(
    data?.without_flow_probability
  );

  const delta = Number(
    data?.probability_delta
  );

  return (
    <div className="rounded-xl border border-slate-800 bg-threatcast-elevated p-4">
      <p className="text-[10px] uppercase tracking-wider text-slate-600">
        {horizon}
      </p>

      <div className="mt-3 grid grid-cols-3 gap-3">
        <Info
          label="Original"
          value={formatPercent(baseline)}
        />

        <Info
          label="Without Flow"
          value={formatPercent(withoutFlow)}
        />

        <Info
          label="Δ"
          value={
            Number.isFinite(delta)
              ? `${delta >= 0 ? "+" : ""}${delta.toFixed(4)}`
              : "—"
          }
        />
      </div>
    </div>
  );
}

function ModelSensitivitySection({ attribution }) {
  const [showAll, setShowAll] = useState(false);

  if (!attribution) {
    return null;
  }

  if (!attribution.available) {
    return (
      <div className="mt-6 rounded-2xl border border-slate-700 bg-threatcast-card p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h4 className="text-lg font-semibold text-slate-100">
              Model-Sensitivity Attribution
            </h4>

            <p className="mt-1 text-xs text-slate-500">
              Leave-one-flow-out perturbation analysis.
            </p>
          </div>

          <span className="w-fit rounded-full border border-amber-400/20 bg-amber-400/5 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-amber-300">
            UNAVAILABLE
          </span>
        </div>

        <div className="mt-5 rounded-lg border border-amber-400/20 bg-amber-400/5 p-4 text-xs leading-5 text-amber-200/80">
          {attribution.reason ||
            "Model-sensitivity attribution is unavailable for this input."}
        </div>
      </div>
    );
  }

  const attributions = safeArray(
    attribution.attributions
  );

  const visible = showAll
    ? attributions
    : attributions.slice(0, 5);

  const baseline = attribution.baseline_raw_probabilities || {};

  return (
    <div className="mt-6 rounded-2xl border border-cyan-400/20 bg-threatcast-card p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h4 className="text-lg font-semibold text-slate-100">
            Model-Sensitivity Attribution
          </h4>

          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
            Each candidate flow is removed from the PCAP, the same
            30-second temporal states are rebuilt, and the frozen
            world model is rerun to measure prediction sensitivity.
          </p>
        </div>

        <span className="w-fit rounded-full border border-cyan-400/30 bg-cyan-400/5 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-cyan-300">
          LEAVE-ONE-FLOW-OUT
        </span>
      </div>

      <div className="mt-5 rounded-lg border border-amber-400/20 bg-amber-400/5 p-4 text-xs leading-5 text-amber-200/80">
        <span className="font-semibold text-amber-200">
          Important:
        </span>{" "}
        this measures <span className="font-semibold text-amber-100">
          model sensitivity
        </span>{" "}
        to removing an observed flow. It is not causal inference,
        not SHAP, not a learned packet-level classifier, and not a
        maliciousness probability.
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Candidate Flows"
          value={formatNumber(
            attribution.candidate_flow_count
          )}
        />

        <StatCard
          label="Attributed Flows"
          value={formatNumber(
            attribution.attributed_flow_count
          )}
        />

        <StatCard
          label="Flagged Attributed"
          value={formatNumber(
            attribution.flagged_attributed_flow_count
          )}
          danger={
            Number(
              attribution.flagged_attributed_flow_count
            ) > 0
          }
        />

        <StatCard
          label="Input States"
          value={formatNumber(
            attribution.prediction_input_states
          )}
        />
      </div>

      <div className="mt-5">
        <p className="text-[10px] uppercase tracking-wider text-slate-600">
          Original Raw World-Model Prediction
        </p>

        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <HorizonCard
            horizon="T+1"
            data={{
              baseline_probability:
                baseline["T+1"],
            }}
          />

          <HorizonCard
            horizon="T+2"
            data={{
              baseline_probability:
                baseline["T+2"],
            }}
          />

          <HorizonCard
            horizon="T+3"
            data={{
              baseline_probability:
                baseline["T+3"],
            }}
          />
        </div>
      </div>

      <div className="mt-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h5 className="text-sm font-semibold text-slate-100">
              Flow-Level Prediction Sensitivity
            </h5>

            <p className="mt-1 text-[11px] text-slate-600">
              Positive Δ means the original flow increased the
              corresponding raw model probability relative to the
              leave-one-flow-out perturbation.
            </p>
          </div>

          {attributions.length > 5 && (
            <button
              type="button"
              onClick={() => setShowAll((current) => !current)}
              className="w-fit rounded-lg border border-slate-700 bg-slate-800/30 px-3 py-2 text-xs text-cyan-300 transition hover:bg-slate-800"
            >
              {showAll
                ? "Show Top 5"
                : `Show All (${attributions.length})`}
            </button>
          )}
        </div>

        <div className="mt-4 space-y-3">
          {visible.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-threatcast-elevated p-8 text-center">
              <p className="text-sm text-slate-400">
                No flow perturbation results were produced.
              </p>

              <p className="mt-2 text-xs text-slate-600">
                This is different from saying that the model found no
                risk; it means no candidate flow could be evaluated.
              </p>
            </div>
          ) : (
            visible.map((flow, index) => (
              <FlowCard
                key={`${flow?.flow_label || "flow"}-${index}`}
                flow={flow}
                index={index}
              />
            ))
          )}
        </div>
      </div>

      <div className="mt-6 border-t border-slate-800 pt-4">
        <p className="text-[10px] leading-5 text-slate-600">
          Method:{" "}
          {attribution.method ||
            "Leave-one-flow-out world-model sensitivity"}
          . The trained world model continues to use only the existing
          12 aggregated temporal features. Packet, port and TCP-flag
          information identifies the perturbed flow; it is not added
          as a new learned model feature.
        </p>
      </div>
    </div>
  );
}

export default function PredictionAttribution({
  attribution,
  modelSensitivityAttribution,
}) {
  const [showAll, setShowAll] = useState(false);

  if (!attribution && !modelSensitivityAttribution) {
    return null;
  }

  const feature = attribution?.feature_correspondence || {};
  const window = attribution?.prediction_input_window || {};

  const flows = useMemo(() => {
    const value = firstDefined(
      attribution?.top_matching_flows,
      attribution?.matching_flows,
      attribution?.flows
    );

    return safeArray(value);
  }, [attribution]);

  const visibleFlows = showAll
    ? flows
    : flows.slice(0, 5);

  return (
    <div className="mt-6 space-y-6">
      {attribution && (
        <div className="rounded-2xl border border-slate-700 bg-threatcast-card p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-100">
                Prediction Input Evidence
              </h3>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Packet and flow evidence temporally associated with the
                exact five-state history used for the latest world-model
                prediction.
              </p>
            </div>

            <span className="w-fit rounded-full border border-cyan-400/30 bg-cyan-400/5 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-cyan-300">
              INPUT-WINDOW EVIDENCE
            </span>
          </div>

          <div className="mt-5 rounded-lg border border-amber-400/20 bg-amber-400/5 p-4 text-xs leading-5 text-amber-200/80">
            <span className="font-semibold text-amber-200">
              Important:
            </span>{" "}
            these flows are matched to the temporal prediction input
            window. This establishes temporal/input correspondence only.
            It is not causal attribution, not packet-level SHAP, and not
            a maliciousness probability.
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            <StatCard
              label="Input States"
              value={formatNumber(
                firstDefined(
                  attribution.sequence_length,
                  attribution.prediction_input_states
                )
              )}
            />

            <StatCard
              label="Matched Flows"
              value={formatNumber(
                firstDefined(
                  attribution.matched_flow_count,
                  flows.length
                )
              )}
            />

            <StatCard
              label="Flagged Flows"
              value={formatNumber(
                attribution.matched_flagged_flow_count
              )}
              danger={
                Number(
                  attribution.matched_flagged_flow_count
                ) > 0
              }
            />

            <StatCard
              label="Matched Packets"
              value={formatNumber(
                attribution.matched_packet_count
              )}
            />

            <StatCard
              label="Matched Bytes"
              value={formatBytes(
                attribution.matched_byte_count
              )}
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <StatCard
              label="Source IPs"
              value={formatNumber(
                firstDefined(
                  feature.unique_source_ips,
                  attribution.unique_source_ips
                )
              )}
            />

            <StatCard
              label="Destination IPs"
              value={formatNumber(
                firstDefined(
                  feature.unique_destination_ips,
                  attribution.unique_destination_ips
                )
              )}
            />

            <StatCard
              label="Destination Ports"
              value={formatNumber(
                firstDefined(
                  feature.unique_destination_ports,
                  attribution.unique_destination_ports
                )
              )}
            />

            <StatCard
              label="Max Ports / Source"
              value={formatNumber(
                firstDefined(
                  feature.max_unique_ports_per_source,
                  attribution.max_unique_ports_per_source
                )
              )}
            />

            <StatCard
              label="TCP SYN"
              value={formatNumber(
                firstDefined(
                  feature.tcp_syn_packets,
                  attribution.tcp_syn_packets
                )
              )}
            />

            <StatCard
              label="TCP ACK"
              value={formatNumber(
                firstDefined(
                  feature.tcp_ack_packets,
                  attribution.tcp_ack_packets
                )
              )}
            />
          </div>

          <div className="mt-6 rounded-xl border border-slate-800 bg-threatcast-elevated p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-600">
                  Prediction Input Window
                </p>

                <p className="mt-1 text-sm font-medium text-slate-200">
                  {formatNumber(
                    firstDefined(
                      attribution.sequence_length,
                      5
                    )
                  )}{" "}
                  temporal states ×{" "}
                  {formatNumber(
                    firstDefined(
                      attribution.window_seconds,
                      30
                    )
                  )}{" "}
                  seconds
                </p>
              </div>

              <span className="rounded-full border border-slate-700 px-3 py-1 text-[10px] text-slate-500">
                {formatNumber(
                  firstDefined(
                    window.state_count,
                    attribution.sequence_length,
                    5
                  )
                )}{" "}
                states
              </span>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Info
                label="Window Start"
                value={formatTimestamp(
                  firstDefined(
                    window.start_iso,
                    attribution.prediction_input_start
                  )
                )}
              />

              <Info
                label="Window End"
                value={formatTimestamp(
                  firstDefined(
                    window.end_iso,
                    attribution.prediction_input_end
                  )
                )}
              />
            </div>

            {safeArray(window.state_timestamps).length > 0 && (
              <div className="mt-5">
                <p className="text-[9px] uppercase tracking-wider text-slate-600">
                  State Timestamps
                </p>

                <div className="mt-2 flex flex-wrap gap-2">
                  {window.state_timestamps.map(
                    (timestamp, index) => (
                      <span
                        key={`${timestamp}-${index}`}
                        className="rounded-md border border-slate-700 bg-slate-900/50 px-2 py-1 font-mono text-[10px] text-slate-400"
                      >
                        T-
                        {window.state_timestamps.length -
                          1 -
                          index}{" "}
                        {formatTimestamp(timestamp)}
                      </span>
                    )
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-100">
                  Flows Associated With Prediction Input
                </h4>

                <p className="mt-1 text-[11px] text-slate-600">
                  {flows.length} matching flow
                  {flows.length === 1 ? "" : "s"} found inside the
                  prediction input window.
                </p>
              </div>

              {flows.length > 5 && (
                <button
                  type="button"
                  onClick={() =>
                    setShowAll((current) => !current)
                  }
                  className="w-fit rounded-lg border border-slate-700 bg-slate-800/30 px-3 py-2 text-xs text-cyan-300 transition hover:bg-slate-800"
                >
                  {showAll
                    ? "Show Top 5"
                    : `Show All (${flows.length})`}
                </button>
              )}
            </div>

            <div className="mt-4 space-y-3">
              {visibleFlows.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-threatcast-elevated p-8 text-center">
                  <p className="text-sm text-slate-400">
                    No packet flows overlapped the temporal prediction
                    input window.
                  </p>

                  <p className="mt-2 text-xs text-slate-600">
                    This does not indicate that the prediction is benign;
                    it only means no parsed flow record was temporally
                    associated with this input window.
                  </p>
                </div>
              ) : (
                visibleFlows.map((flow, index) => (
                  <FlowCard
                    key={`${flow?.src_ip || "src"}-${flow?.src_port || "port"}-${flow?.dst_ip || "dst"}-${flow?.dst_port || "dport"}-${index}`}
                    flow={flow}
                    index={index}
                  />
                ))
              )}
            </div>
          </div>

          <div className="mt-6 border-t border-slate-800 pt-4">
            <p className="text-[10px] leading-5 text-slate-600">
              Method:{" "}
              {attribution.method ||
                "Temporal PCAP evidence-to-prediction window correspondence"}
              . The trained world model continues to use only the
              existing aggregated 12-feature temporal input. Packet,
              port, TCP-flag and flow information shown here is
              observational evidence correspondence.
            </p>
          </div>
        </div>
      )}

      <ModelSensitivitySection
        attribution={modelSensitivityAttribution}
      />
    </div>
  );
}
