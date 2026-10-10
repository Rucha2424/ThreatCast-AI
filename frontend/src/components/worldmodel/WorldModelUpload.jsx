import React, { useMemo, useState } from "react";
import FlaggedFlowsPanel from "./FlaggedFlowsPanel";
import ModelSensitivityAttribution from "./ModelSensitivityAttribution";
import InteractiveNetworkGraph3D from "../network/InteractiveNetworkGraph3D";

const SERVER_PORTS = new Set([80, 443, 22, 21, 25, 53, 8080, 8443]);
const DATABASE_PORTS = new Set([3306, 5432, 1433, 1521, 27017, 6379, 9200]);

function classifyNodeType(ip, portsSeenAsDst) {
  const ports = portsSeenAsDst.get(ip);
  if (!ports || ports.size === 0) return "endpoint";
  if ([...ports].some((port) => DATABASE_PORTS.has(port))) return "database";
  if ([...ports].some((port) => SERVER_PORTS.has(port))) return "server";
  if (ip && (ip.endsWith(".1") || ip.endsWith(".254"))) return "gateway";
  return "endpoint";
}

function buildPcapTopologyGraph(attribution) {
  if (!attribution || attribution.available === false) return null;

  const flows = Array.isArray(attribution.top_flows) ? attribution.top_flows : [];
  if (flows.length === 0) return null;

  const portsSeenAsDst = new Map();
  flows.forEach((flow) => {
    if (!flow?.dst_ip) return;
    const ports = portsSeenAsDst.get(flow.dst_ip) || new Set();
    if (Number.isFinite(Number(flow.dst_port))) ports.add(Number(flow.dst_port));
    portsSeenAsDst.set(flow.dst_ip, ports);
  });

  const flaggedIds = new Set();
  const compromisedIds = new Set();
  const maxScoreByNode = new Map();

  flows.forEach((flow) => {
    if (!flow?.src_ip || !flow?.dst_ip) return;
    const score = Number(flow.evidence_score) || 0;
    [flow.src_ip, flow.dst_ip].forEach((ip) => {
      maxScoreByNode.set(ip, Math.max(maxScoreByNode.get(ip) || 0, score));
    });
    if (flow.flagged) {
      flaggedIds.add(flow.src_ip);
      flaggedIds.add(flow.dst_ip);
      if (score >= 3) {
        compromisedIds.add(flow.src_ip);
        compromisedIds.add(flow.dst_ip);
      }
    }
  });

  const forecastIds = new Set();
  flows
    .filter((flow) => flaggedIds.has(flow?.src_ip) && !flaggedIds.has(flow?.dst_ip))
    .sort((a, b) => (Number(b.packet_count) || 0) - (Number(a.packet_count) || 0))
    .slice(0, 3)
    .forEach((flow) => forecastIds.add(flow.dst_ip));

  const nodeIds = new Set();
  flows.forEach((flow) => {
    if (flow?.src_ip) nodeIds.add(flow.src_ip);
    if (flow?.dst_ip) nodeIds.add(flow.dst_ip);
  });

  const nodes = Array.from(nodeIds).map((ip) => {
    const score = maxScoreByNode.get(ip) || 0;
    return {
      id: ip,
      ip,
      type: classifyNodeType(ip, portsSeenAsDst),
      state: compromisedIds.has(ip)
        ? "compromised"
        : flaggedIds.has(ip)
        ? "suspicious"
        : forecastIds.has(ip)
        ? "target"
        : undefined,
      risk_score: Math.max(0, Math.min(100, Math.round(score * 20))),
    };
  });

  const edges = flows
    .filter((flow) => flow?.src_ip && flow?.dst_ip)
    .map((flow, index) => ({
      id: `${flow.src_ip}-${flow.dst_ip}-${flow.dst_port ?? index}-${index}`,
      source: flow.src_ip,
      target: flow.dst_ip,
      protocol: flow.protocol,
      is_attack_path: Boolean(flow.flagged),
      is_forecasted_path: !flow.flagged && forecastIds.has(flow.dst_ip),
    }));

  return {
    nodes,
    edges,
    attack_path_node_ids: Array.from(flaggedIds),
    forecasted_path_node_ids: Array.from(forecastIds),
    high_risk_nodes_count: nodes.filter(
      (node) => node.state === "compromised" || node.state === "suspicious"
    ).length,
  };
}


const API_URL =
  import.meta.env.VITE_API_URL !== undefined
    ? `${import.meta.env.VITE_API_URL}/api/world-model/risk`
    : "/api/world-model/risk";


const FEATURE_COUNT = 12;


export default function WorldModelUpload() {

  const [file, setFile] =
    useState(null);

  const [result, setResult] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const inputSource =
    result?.input_source ||
    detectSource(file);

  const worldModel =
    result?.world_model ||
    null;

  const stagePrediction =
    result?.trained_stage_prediction ||
    null;

  const packetEvidence =
    result?.explainability
      ?.packet_evidence ||
    result?.packet_evidence ||
    null;

  const packetAttribution =
  result?.packet_attribution ||
  result?.explainability
    ?.port_attribution ||
  null;

const predictionAttribution =
  result?.prediction_attribution ||
  result?.explainability
    ?.prediction_attribution ||
  null;

const modelSensitivityAttribution =
  result?.model_sensitivity_attribution ||
  result?.explainability?.model_sensitivity_attribution ||
  null;

const rollout =
  worldModel?.rollout || [];

  const pcapGraphData = useMemo(
    () => buildPcapTopologyGraph(packetAttribution),
    [packetAttribution]
  );

  // ==========================================================
  // FILE HANDLING
  // ==========================================================

  function handleFileChange(event) {

    const selected =
      event.target.files?.[0] ||
      null;

    setError("");
    setResult(null);

    if (!selected) {

      setFile(null);

      return;
    }

    const extension =
      `.${selected.name
        .split(".")
        .pop()
        .toLowerCase()}`;

    const allowed = [
      ".csv",
      ".pcap",
      ".pcapng",
      ".cap",
    ];

    if (!allowed.includes(extension)) {

      setFile(null);

      setError(
        "Unsupported file type. " +
        "Please select CSV, PCAP, PCAPNG, or CAP."
      );

      return;
    }

    setFile(selected);
  }


  // ==========================================================
  // RUN INFERENCE
  // ==========================================================

  async function runInference() {

    if (!file) {

      setError(
        "Please select an input file first."
      );

      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {

      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      const response =
        await fetch(
          API_URL,
          {
            method: "POST",
            body: formData,
          }
        );

      let data = null;

      try {

        data =
          await response.json();

      } catch {

        throw new Error(
          `API returned HTTP ${response.status}.`
        );
      }

      if (!response.ok) {

        const detail =
          data?.detail ||
          data?.message ||
          `Inference failed with HTTP ${response.status}.`;

        throw new Error(
          String(detail)
        );
      }

      if (!data?.success) {

        throw new Error(
          data?.detail ||
          "World-model inference failed."
        );
      }

      setResult(data);

    } catch (err) {

      setError(
        err?.message ||
        "Unable to connect to the world-model API."
      );

    } finally {

      setLoading(false);
    }
  }


  // ==========================================================
  // RESET
  // ==========================================================

  function resetUpload() {

    setFile(null);
    setResult(null);
    setError("");

  }


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="space-y-6">

      {/* ====================================================
          UPLOAD
      ==================================================== */}

      <div className="rounded-2xl border border-slate-700 bg-threatcast-card p-6">

        <div className="flex flex-col gap-2">

          <h2 className="text-xl font-semibold text-slate-100">
            World Model Inference
          </h2>

          <p className="text-sm leading-6 text-slate-400">
            Upload a CTU13-style CSV or a raw
            network capture. PCAP files are converted
            into 30-second temporal network states
            before world-model inference.
          </p>

        </div>


        {/* Supported formats */}

        <div className="mt-4 flex flex-wrap gap-2">

          <FormatBadge label="CSV" />
          <FormatBadge label="PCAP" />
          <FormatBadge label="PCAPNG" />
          <FormatBadge label="CAP" />

        </div>


        {/* File */}

        <div className="mt-5 flex flex-col gap-4">

          <input
            type="file"
            accept=".csv,.pcap,.pcapng,.cap"
            onChange={handleFileChange}
            disabled={loading}
            className="
              block
              w-full
              cursor-pointer
              rounded-lg
              border
              border-slate-700
              bg-threatcast-elevated
              px-4
              py-3
              text-sm
              text-slate-300
              file:mr-4
              file:rounded-md
              file:border-0
              file:bg-cyan-400/10
              file:px-4
              file:py-2
              file:text-sm
              file:font-medium
              file:text-cyan-300
              hover:border-cyan-400/40
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          />


          {file && (

            <div className="rounded-lg border border-slate-700 bg-threatcast-elevated p-4">

              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">

                <div>

                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    Selected Input
                  </p>

                  <p className="mt-1 break-all text-sm font-medium text-slate-200">
                    {file.name}
                  </p>

                </div>


                <div className="flex items-center gap-2">

                  <SourceBadge
                    source={
                      file.name
                        .split(".")
                        .pop()
                        ?.toUpperCase() ||
                      "FILE"
                    }
                  />

                  <span className="text-xs text-slate-500">
                    {formatBytes(file.size)}
                  </span>

                </div>

              </div>

            </div>

          )}


          {/* Buttons */}

          <div className="flex flex-wrap gap-3">

            <button
              onClick={runInference}
              disabled={!file || loading}
              className="
                rounded-lg
                border
                border-cyan-400/50
                bg-cyan-400/10
                px-5
                py-2.5
                text-sm
                font-medium
                text-cyan-300
                transition
                hover:bg-cyan-400/20
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              {loading
                ? "Processing..."
                : "Run World Model"}
            </button>


            {(file || result) &&
              !loading && (

                <button
                  onClick={resetUpload}
                  className="
                    rounded-lg
                    border
                    border-slate-700
                    bg-slate-800/40
                    px-5
                    py-2.5
                    text-sm
                    font-medium
                    text-slate-300
                    hover:bg-slate-800
                  "
                >
                  Clear
                </button>

              )}

          </div>

        </div>


        {/* Loading */}

        {loading && (

          <div className="mt-5 rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-4">

            <div className="flex items-center gap-3">

              <div
                className="
                  h-4
                  w-4
                  animate-spin
                  rounded-full
                  border-2
                  border-cyan-400/30
                  border-t-cyan-400
                "
              />

              <div>

                <p className="text-sm font-medium text-cyan-300">
                  Running inference
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {inputSource === "pcap"
                    ? "Extracting packets, building temporal states, and attributing flow evidence..."
                    : "Processing temporal network states..."}

                </p>

              </div>

            </div>

          </div>

        )}


        {/* Error */}

        {error && (

          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4">

            <p className="text-xs uppercase tracking-wider text-red-400">
              Inference Error
            </p>

            <p className="mt-1 text-sm leading-6 text-red-300">
              {error}
            </p>

          </div>

        )}

      </div>


      {/* ====================================================
          RESULTS
      ==================================================== */}

      {result && (

        <>

          {/* ==================================================
              INPUT SUMMARY
          ================================================== */}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">

            <Metric
              title="Input Type"
              value={
                inputSource.toUpperCase()
              }
            />

            <Metric
              title="Temporal States"
              value={
                result.states ??
                "—"
              }
            />

            <Metric
              title="Sequence"
              value={
                result.sequence_length
                  ? `${result.sequence_length} states`
                  : "—"
              }
            />

            <Metric
              title="Scenario"
              value={
                result.scenario
                  ? `CTU13-${result.scenario}`
                  : "Not specified"
              }
            />

          </div>


          {/* ==================================================
              PCAP METADATA
          ================================================== */}

          {inputSource === "pcap" &&
            result.pcap_metadata && (

              <PcapMetadata
                metadata={
                  result.pcap_metadata
                }
              />

            )}


          {/* ==================================================
              RISK
          ================================================== */}

          {worldModel && (

            <div className="rounded-2xl border border-cyan-400/20 bg-threatcast-card p-6">

              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">

                <div>

                  <h3 className="text-lg font-semibold text-slate-100">
                    Temporal Infiltration Risk
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Trained CTU13 world model with
                    calibrated T+1 / T+2 / T+3 rollout.
                  </p>

                </div>


                {worldModel.calibration && (

                  <span className="rounded-full border border-violet-400/30 bg-violet-400/10 px-3 py-1 text-xs text-violet-300">
                    Scenario-adaptive calibration
                  </span>

                )}

              </div>


              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">

                {rollout.map(
                  (item) => (

                    <RiskCard
                      key={
                        item.horizon
                      }
                      item={item}
                    />

                  )
                )}

              </div>


              {worldModel.calibration && (

                <div className="mt-5 rounded-lg border border-slate-800 bg-threatcast-elevated p-4">

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">

                    <InfoItem
                      label="Calibration"
                      value={
                        worldModel
                          .calibration
                          .method ||
                        "—"
                      }
                    />

                    <InfoItem
                      label="Calibration Windows"
                      value={
                        worldModel
                          .calibration
                          .calibration_windows ??
                        "—"
                      }
                    />

                    <InfoItem
                      label="Forecast Horizon"
                      value={
                        worldModel
                          .forecast_horizon
                          ? `K=${worldModel.forecast_horizon}`
                          : "—"
                      }
                    />

                  </div>

                </div>

              )}

            </div>

          )}


          {/* ==================================================
              STAGE
          ================================================== */}

          {stagePrediction && (

            <div className="rounded-2xl border border-violet-500/30 bg-threatcast-card p-6">

              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">

                <div>

                  <h3 className="text-lg font-semibold text-slate-100">
                    Predicted MITRE Stage
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Weakly-supervised stage head over
                    the frozen 64-dimensional world-model latent.
                  </p>

                </div>

                <span className="rounded-full border border-violet-400/30 bg-violet-400/10 px-3 py-1 text-xs text-violet-300">
                  Weak supervision
                </span>

              </div>


              {stagePrediction.primary_stage && (

                <div className="mt-5 rounded-xl border border-violet-400/20 bg-violet-400/5 p-5">

                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    Primary Stage
                  </p>

                  <div className="mt-2 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">

                    <p className="text-2xl font-semibold text-slate-100">
                      {
                        stagePrediction
                          .primary_stage
                          .name
                      }
                    </p>

                    <p className="text-lg font-medium text-violet-300">
                      {formatPercent(
                        stagePrediction
                          .primary_stage
                          .probability_percent
                      )}
                    </p>

                  </div>

                </div>

              )}


              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">

                {Object.entries(
                  stagePrediction
                    .probabilities ||
                  {}
                ).map(
                  ([stage, data]) => (

                    <StageCard
                      key={stage}
                      stage={stage}
                      data={data}
                    />

                  )
                )}

              </div>


              {stagePrediction
                .mitre_mapping
                ?.length > 0 && (

                <div className="mt-5">

                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    ATT&CK Mapping
                  </p>

                  <div className="mt-3 space-y-2">

                    {stagePrediction
                      .mitre_mapping
                      .map(
                        (
                          mapping,
                          index
                        ) => (

                          <div
                            key={`${mapping.technique}-${index}`}
                            className="rounded-lg border border-slate-800 bg-threatcast-elevated p-4"
                          >

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">

                              <InfoItem
                                label="Activity"
                                value={
                                  mapping.activity ||
                                  "—"
                                }
                              />

                              <InfoItem
                                label="Tactic"
                                value={
                                  mapping.tactic ||
                                  "—"
                                }
                              />

                              <InfoItem
                                label="Technique"
                                value={
                                  mapping.technique ||
                                  "—"
                                }
                              />

                            </div>

                          </div>

                        )
                      )}

                  </div>

                </div>

              )}

            </div>

          )}


          {/* ==================================================
              PACKET EVIDENCE
          ================================================== */}

          {inputSource === "pcap" &&
            packetEvidence && (

              <PacketEvidence
                evidence={
                  packetEvidence
                }
              />

            )}


          {inputSource === "pcap" &&
            pcapGraphData &&
            pcapGraphData.nodes.length > 0 && (

              <div className="rounded-2xl border border-slate-800 bg-threatcast-card p-6 space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-100">
                    Network Topology - This PCAP
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    A fresh topology generated from this file&apos;s flow evidence.
                  </p>
                </div>

                <InteractiveNetworkGraph3D
                  key={`${result?.filename || "pcap"}-${packetAttribution?.packet_count ?? 0}-${packetAttribution?.flow_count ?? 0}`}
                  graphData={pcapGraphData}
                />
              </div>

            )}


          {/* ==================================================
              FLAGGED FLOW ATTRIBUTION
          ================================================== */}

          {inputSource === "pcap" &&
            packetAttribution && (

              <FlaggedFlowsPanel
                attribution={
                  packetAttribution
                }
              />

            )}




          {/* ==================================================
              PREDICTION INPUT ATTRIBUTION
          ================================================== */}

          {inputSource === "pcap" &&
            predictionAttribution && (

              <PredictionAttribution
                attribution={
                  predictionAttribution
                }
              />

            )}


         {/* ==================================================
    MODEL SENSITIVITY ATTRIBUTION
================================================== */}

{inputSource === "pcap" &&
  modelSensitivityAttribution && (

    <ModelSensitivityAttribution
      attribution={
        modelSensitivityAttribution
      }
    />

)}


{/* ==================================================
    DOCUMENTED ACTIVITY
================================================== */}

{result.stage_interpretation && (
            <div className="rounded-2xl border border-amber-500/20 bg-threatcast-card p-6">

              <h3 className="text-lg font-semibold text-slate-100">
                CTU13 Activity Interpretation
              </h3>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">

                <Metric
                  title="Activity"
                  value={
                    result
                      .stage_interpretation
                      .activity ||
                    "—"
                  }
                />

                <Metric
                  title="Tactic"
                  value={
                    result
                      .stage_interpretation
                      .tactic ||
                    "—"
                  }
                />

                <Metric
                  title="Technique"
                  value={
                    result
                      .stage_interpretation
                      .technique ||
                    "—"
                  }
                />

              </div>

              <p className="mt-4 text-xs leading-5 text-amber-300">
                This is the documented CTU13 activity
                interpretation layer. It is not timestamp-level
                ground-truth MITRE classification.
              </p>

            </div>

          )}


          {/* ==================================================
              TEMPORAL INPUT
          ================================================== */}

          {result.input?.sequence &&
            result.features && (

              <TemporalInput
                result={result}
              />

            )}

        </>

      )}

    </div>
  );
}


// ============================================================
// PREDICTION INPUT ATTRIBUTION
// ============================================================

function PredictionAttribution({
  attribution,
}) {
  if (!attribution) {
    return null;
  }

  if (!attribution.available) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-threatcast-card p-6">
        <h3 className="text-lg font-semibold text-slate-100">
          Prediction Input Evidence
        </h3>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          Temporal packet attribution was not available for this prediction.
        </p>
      </div>
    );
  }

  const window = attribution.prediction_input_window || {};
  const featureCorrespondence = attribution.feature_correspondence || {};
  const flaggedFlows = Array.isArray(attribution.flagged_flows)
    ? attribution.flagged_flows
    : [];
  const topFlows = Array.isArray(attribution.top_matching_flows)
    ? attribution.top_matching_flows
    : [];
  const displayFlows = flaggedFlows.length > 0 ? flaggedFlows : topFlows;

  const formatNumber = (value) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return "—";
    return number.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  const formatBytes = (value) => {
    const bytes = Number(value);
    if (!Number.isFinite(bytes)) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const endpoint = (ip, port) => {
    if (!ip) return "—";
    if (port === null || port === undefined || port === "") return String(ip);
    return `${ip}:${port}`;
  };

  return (
    <section className="rounded-2xl border border-orange-400/20 bg-threatcast-card p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">
            Prediction Input Evidence
          </h3>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
            Packet, port, TCP-flag, and flow evidence temporally associated with
            the five-state history used for the latest world-model prediction.
          </p>
        </div>
        <span className="w-fit rounded-full border border-orange-400/30 bg-orange-400/10 px-3 py-1 text-xs font-semibold text-orange-300">
          Input-window attribution
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric title="Input States" value={attribution.sequence_length ?? "—"} />
        <Metric title="Matched Flows" value={attribution.matched_flow_count ?? "—"} />
        <Metric title="Flagged Flows" value={attribution.matched_flagged_flow_count ?? "—"} />
        <Metric title="Matched Packets" value={attribution.matched_packet_count ?? "—"} />
      </div>

      <div className="mt-5 rounded-xl border border-slate-800 bg-threatcast-elevated p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
          Prediction Input Window
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-600">Start</p>
            <p className="mt-1 break-all font-mono text-xs text-slate-300">
              {window.start_iso || window.start_timestamp || "—"}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-600">End</p>
            <p className="mt-1 break-all font-mono text-xs text-slate-300">
              {window.end_iso || window.end_timestamp || "—"}
            </p>
          </div>
        </div>
        <p className="mt-4 text-xs leading-5 text-slate-500">
          This window corresponds to the temporal history consumed by the latest
          world-model prediction. It does not imply that an individual packet
          causally produced the prediction.
        </p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric title="Flow Count" value={formatNumber(featureCorrespondence.flow_count)} />
        <Metric title="Packets" value={formatNumber(featureCorrespondence.packet_count)} />
        <Metric title="Bytes" value={formatBytes(featureCorrespondence.byte_count)} />
        <Metric title="Unique Ports" value={formatNumber(featureCorrespondence.unique_destination_ports)} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Metric title="SYN" value={formatNumber(featureCorrespondence.tcp_syn_packets)} />
        <Metric title="ACK" value={formatNumber(featureCorrespondence.tcp_ack_packets)} />
        <Metric title="RST" value={formatNumber(featureCorrespondence.tcp_rst_packets)} />
        <Metric title="Unique Destinations" value={formatNumber(featureCorrespondence.unique_destination_ips)} />
        <Metric title="Max Ports / Source" value={formatNumber(featureCorrespondence.max_unique_ports_per_source)} />
      </div>

      <div className="mt-6">
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
            Flows Associated With Prediction Input
          </p>
          <p className="text-xs leading-5 text-slate-500">
            These flows overlap the temporal input window. They provide
            observable packet/port/flag evidence corresponding to the prediction input.
          </p>
        </div>

        {displayFlows.length === 0 ? (
          <div className="mt-4 rounded-xl border border-slate-800 bg-threatcast-elevated p-5">
            <p className="text-sm text-slate-400">
              No packet flows overlapped the prediction input window.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {displayFlows.slice(0, 10).map((flow, index) => {
              const flags = flow?.tcp_flags || {};
              return (
                <div
                  key={`${flow?.src_ip}-${flow?.src_port}-${flow?.dst_ip}-${flow?.dst_port}-${index}`}
                  className={`rounded-xl border p-4 ${
                    flow?.flagged
                      ? "border-red-400/20 bg-red-400/5"
                      : "border-slate-800 bg-threatcast-elevated"
                  }`}
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {flow?.flagged && (
                          <span className="rounded-full border border-red-400/30 bg-red-400/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-red-300">
                            Flagged
                          </span>
                        )}
                        <span className="rounded-full border border-slate-700 bg-slate-800/40 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          {flow?.protocol || "Unknown"}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                        <span className="break-all font-mono text-xs font-semibold text-slate-200">
                          {endpoint(flow?.src_ip, flow?.src_port)}
                        </span>
                        <span className="text-cyan-400">→</span>
                        <span className="break-all font-mono text-xs font-semibold text-slate-200">
                          {endpoint(flow?.dst_ip, flow?.dst_port)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <div>
                        <p className="text-[9px] uppercase tracking-wider text-slate-600">Packets</p>
                        <p className="mt-1 text-xs font-semibold text-slate-300">
                          {formatNumber(flow?.packet_count)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-wider text-slate-600">Bytes</p>
                        <p className="mt-1 text-xs font-semibold text-slate-300">
                          {formatBytes(flow?.byte_count)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-wider text-slate-600">SYN / ACK</p>
                        <p className="mt-1 text-xs font-semibold text-cyan-300">
                          {formatNumber(flags.SYN)} / {formatNumber(flags.ACK)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-wider text-slate-600">Score</p>
                        <p className={`mt-1 text-xs font-bold ${flow?.flagged ? "text-red-300" : "text-slate-300"}`}>
                          {Number(flow?.evidence_score).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {Array.isArray(flow?.evidence_reasons) && flow.evidence_reasons.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {flow.evidence_reasons.map((reason, reasonIndex) => (
                        <span
                          key={`${String(reason)}-${reasonIndex}`}
                          className="rounded-lg border border-red-400/10 bg-red-400/5 px-3 py-1.5 text-[10px] leading-4 text-red-300"
                        >
                          {reason}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
        <p className="text-xs leading-5 text-amber-300">
          <strong>Interpretation:</strong> packet/port/flag evidence is associated
          with the temporal input consumed by the model. It is not a learned
          packet-level attribution, causal explanation, or maliciousness probability.
        </p>
      </div>
    </section>
  );
}


// ============================================================
// METRIC
// ============================================================

function Metric({
  title,
  value,
}) {

  return (

    <div className="rounded-2xl border border-slate-700 bg-threatcast-card p-5">

      <p className="text-xs uppercase tracking-wider text-slate-500">
        {title}
      </p>

      <p className="mt-2 break-words text-xl font-semibold text-slate-100">
        {value ?? "—"}
      </p>

    </div>

  );
}


// ============================================================
// RISK CARD
// ============================================================

function RiskCard({
  item,
}) {

  const probability =
    Number(
      item?.risk_probability_percent
    );

  const attack =
    Boolean(
      item?.predicted_attack
    );

  return (

    <div
      className={`
        rounded-xl
        border
        p-5
        ${
          attack
            ? "border-red-400/30 bg-red-400/5"
            : "border-slate-700 bg-threatcast-elevated"
        }
      `}
    >

      <div className="flex items-center justify-between">

        <p className="text-sm font-semibold text-slate-200">
          {item?.horizon || "Forecast"}
        </p>

        <span
          className={`
            rounded-full
            px-2.5
            py-1
            text-xs
            font-medium
            ${
              attack
                ? "bg-red-400/10 text-red-300"
                : "bg-emerald-400/10 text-emerald-300"
            }
          `}
        >
          {
            attack
              ? "ATTACK RISK"
              : "BELOW THRESHOLD"
          }
        </span>

      </div>

      <p className="mt-5 text-3xl font-semibold text-slate-100">

        {Number.isFinite(
          probability
        )
          ? `${probability.toFixed(2)}%`
          : "—"}

      </p>

      <div className="mt-4 space-y-2">

        <InfoItem
          label="Threshold"
          value={
            item?.threshold != null
              ? `${(
                  Number(
                    item.threshold
                  ) * 100
                ).toFixed(2)}%`
              : "—"
          }
        />

        <InfoItem
          label="Decision"
          value={
            attack
              ? "Predicted attack"
              : "No attack prediction"
          }
        />

      </div>

    </div>

  );
}


// ============================================================
// STAGE CARD
// ============================================================

function StageCard({
  stage,
  data,
}) {

  const probability =
    Number(
      data?.probability_percent
    );

  return (

    <div className="rounded-xl border border-slate-700 bg-threatcast-elevated p-4">

      <div className="flex items-center justify-between gap-3">

        <p className="text-sm font-medium text-slate-200">
          {stage}
        </p>

        {data?.predicted && (

          <span className="rounded-full bg-violet-400/10 px-2 py-1 text-xs text-violet-300">
            Predicted
          </span>

        )}

      </div>

      <p className="mt-4 text-2xl font-semibold text-slate-100">

        {Number.isFinite(
          probability
        )
          ? `${probability.toFixed(2)}%`
          : "—"}

      </p>

      <p className="mt-2 text-xs text-slate-500">

        Threshold:{" "}

        {data?.threshold != null
          ? `${(
              Number(
                data.threshold
              ) * 100
            ).toFixed(1)}%`
          : "—"}

      </p>

    </div>

  );
}


// ============================================================
// PCAP METADATA
// ============================================================

function PcapMetadata({
  metadata,
}) {

  return (

    <div className="rounded-2xl border border-cyan-400/20 bg-threatcast-card p-6">

      <h3 className="text-lg font-semibold text-slate-100">
        PCAP Extraction
      </h3>

      <p className="mt-1 text-xs text-slate-500">
        Raw packet capture converted into
        model-ready temporal network states.
      </p>


      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">

        <InfoItem
          label="Packets"
          value={
            metadata.packet_count ??
            metadata.packets ??
            "—"
          }
        />

        <InfoItem
          label="Temporal Window"
          value={
            metadata.window_duration
              ? `${metadata.window_duration}s`
              : "30 seconds"
          }
        />

        <InfoItem
          label="Temporal States"
          value={
            metadata.state_count ??
            metadata.states ??
            "—"
          }
        />

        <InfoItem
          label="Flows"
          value={
            metadata.flow_count ??
            metadata.flows ??
            "—"
          }
        />

      </div>

    </div>

  );
}


// ============================================================
// PACKET EVIDENCE
// ============================================================

function PacketEvidence({
  evidence,
}) {

  const entries = [
    [
      "Packet Count",
      evidence.packet_count,
    ],

    [
      "TCP SYN",
      evidence.syn_count,
    ],

    [
      "TCP ACK",
      evidence.ack_count,
    ],

    [
      "TCP RST",
      evidence.rst_count,
    ],

    [
      "TCP FIN",
      evidence.fin_count,
    ],

    [
      "TCP PSH",
      evidence.psh_count,
    ],

    [
      "Unique Source IPs",
      evidence.unique_source_ips,
    ],

    [
      "Unique Destination IPs",
      evidence.unique_destination_ips,
    ],

    [
      "Unique Destination Ports",
      evidence.unique_destination_ports,
    ],

    [
      "Max Ports / Source",
      evidence.max_unique_ports_per_source,
    ],

    [
      "Port Scan Signature",
      evidence.port_scan_signature,
    ],

    [
      "Scan Entropy",
      evidence.scan_entropy,
    ],

    [
      "Average Packet Size",
      evidence.avg_packet_size,
    ],

    [
      "TTL Mean",
      evidence.ttl_mean,
    ],

    [
      "TCP Window Mean",
      evidence.tcp_window_mean,
    ],
  ];


  return (

    <div className="rounded-2xl border border-orange-400/20 bg-threatcast-card p-6">

      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">

        <div>

          <h3 className="text-lg font-semibold text-slate-100">
            Packet-Level Evidence
          </h3>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Packet telemetry extracted directly
            from the uploaded capture.
          </p>

        </div>

        <span className="rounded-full border border-orange-400/30 bg-orange-400/10 px-3 py-1 text-xs text-orange-300">
          PCAP telemetry
        </span>

      </div>


      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">

        {entries.map(
          ([label, value]) => (

            <div
              key={label}
              className="rounded-lg border border-slate-800 bg-threatcast-elevated p-4"
            >

              <p className="text-xs uppercase tracking-wider text-slate-500">
                {label}
              </p>

              <p className="mt-2 text-lg font-semibold text-slate-200">
                {formatNumber(
                  value
                )}
              </p>

            </div>

          )
        )}

      </div>

    </div>

  );
}


// ============================================================
// PACKET / PORT / FLAG ATTRIBUTION
// ============================================================

function PacketAttribution({
  attribution,
}) {

  if (
    !attribution ||
    !attribution.available
  ) {

    return (

      <div className="rounded-2xl border border-slate-700 bg-threatcast-card p-6">

        <h3 className="text-lg font-semibold text-slate-100">
          Packet / Port / Flag Attribution
        </h3>

        <p className="mt-2 text-sm text-slate-500">
          No usable packet-level flow attribution
          was available for this capture.
        </p>

      </div>

    );
  }


  const flaggedFlows =
    attribution.flagged_flows ||
    [];

  const topFlows =
    attribution.top_flows ||
    [];


  return (

    <div className="rounded-2xl border border-red-400/20 bg-threatcast-card p-6">

      {/* Header */}

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

        <div>

          <h3 className="text-lg font-semibold text-slate-100">
            Packet / Port / Flag Attribution
          </h3>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Concrete flow-level evidence extracted
            directly from the uploaded PCAP.
          </p>

        </div>

        <span className="rounded-full border border-red-400/30 bg-red-400/10 px-3 py-1 text-xs text-red-300">
          Raw PCAP attribution
        </span>

      </div>


      {/* Summary */}

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">

        <InfoItem
          label="Packets"
          value={
            attribution.packet_count
          }
        />

        <InfoItem
          label="Flows"
          value={
            attribution.flow_count
          }
        />

        <InfoItem
          label="Flagged Flows"
          value={
            attribution.flagged_flow_count
          }
        />

        <InfoItem
          label="Attribution"
          value="Flow evidence"
        />

      </div>


      {/* Flagged flows */}

      <div className="mt-7">

        <div className="flex flex-col gap-1">

          <p className="text-xs uppercase tracking-wider text-slate-500">
            Flagged Flow Evidence
          </p>

          <p className="text-xs text-slate-600">
            Flows are ranked using observable
            packet, port and TCP-flag indicators.
          </p>

        </div>


        {flaggedFlows.length === 0 ? (

          <div className="mt-4 rounded-lg border border-slate-800 bg-threatcast-elevated p-5">

            <p className="text-sm text-slate-400">
              No flows crossed the configured
              evidence threshold.
            </p>

          </div>

        ) : (

          <div className="mt-4 space-y-4">

            {flaggedFlows.map(
              (flow, index) => (

                <FlaggedFlowCard
                  key={
                    `${flow.src_ip}-${flow.src_port}-${flow.dst_ip}-${flow.dst_port}-${index}`
                  }
                  flow={flow}
                  index={index}
                />

              )
            )}

          </div>

        )}

      </div>


      {/* Top flows */}

      {topFlows.length > 0 && (

        <div className="mt-7">

          <p className="text-xs uppercase tracking-wider text-slate-500">
            Highest Evidence Flows
          </p>

          <div className="mt-3 overflow-x-auto rounded-lg border border-slate-800">

            <table className="min-w-full text-left text-sm">

              <thead>

                <tr className="border-b border-slate-800 bg-threatcast-elevated">

                  <th className="whitespace-nowrap px-4 py-3 text-xs uppercase tracking-wider text-slate-500">
                    Source
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-xs uppercase tracking-wider text-slate-500">
                    Destination
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-xs uppercase tracking-wider text-slate-500">
                    Protocol
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-xs uppercase tracking-wider text-slate-500">
                    Packets
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-xs uppercase tracking-wider text-slate-500">
                    Score
                  </th>

                </tr>

              </thead>

              <tbody>

                {topFlows.map(
                  (flow, index) => (

                    <tr
                      key={
                        `top-${index}`
                      }
                      className="border-b border-slate-800 last:border-0"
                    >

                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-cyan-300">
                        {flow.src_ip}:{flow.src_port}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-300">
                        {flow.dst_ip}:{flow.dst_port}
                      </td>

                      <td className="px-4 py-3 text-xs text-slate-400">
                        {flow.protocol}
                      </td>

                      <td className="px-4 py-3 text-xs text-slate-400">
                        {flow.packet_count}
                      </td>

                      <td className="px-4 py-3 text-xs font-semibold text-red-300">
                        {Number(
                          flow.evidence_score || 0
                        ).toFixed(1)}
                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        </div>

      )}


      {/* Scientific note */}

      <div className="mt-7 rounded-lg border border-slate-800 bg-threatcast-elevated p-4">

        <p className="text-xs leading-5 text-slate-500">
          This is deterministic packet/flow evidence
          attribution. It is not SHAP, causal attribution,
          or a maliciousness probability. The trained
          CTU13 world model continues to use only its
          original 12 aggregated input features.
        </p>

      </div>

    </div>

  );
}


// ============================================================
// FLAGGED FLOW CARD
// ============================================================

function FlaggedFlowCard({
  flow,
  index,
}) {

  const flags =
    flow.tcp_flags || {};


  return (

    <div className="rounded-xl border border-red-400/20 bg-threatcast-elevated p-5">

      {/* Flow header */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

        <div className="min-w-0">

          <div className="flex flex-wrap items-center gap-2">

            <span className="rounded-md border border-red-400/20 bg-red-400/5 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-red-300">
              Flagged Flow #{index + 1}
            </span>

            <span className="rounded-full border border-slate-700 bg-slate-900/50 px-2 py-1 text-[10px] text-slate-500">
              {flow.protocol}
            </span>

          </div>


          <div className="mt-4 flex flex-wrap items-center gap-2">

            <span className="font-mono text-sm text-cyan-300">
              {flow.src_ip}:{flow.src_port}
            </span>

            <span className="text-slate-600">
              →
            </span>

            <span className="font-mono text-sm text-slate-200">
              {flow.dst_ip}:{flow.dst_port}
            </span>

          </div>

        </div>


        <span className="w-fit rounded-full bg-red-400/10 px-3 py-1 text-xs font-medium text-red-300">
          FLAGGED
        </span>

      </div>


      {/* Flow metrics */}

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">

        <InfoItem
          label="Packets"
          value={
            flow.packet_count
          }
        />

        <InfoItem
          label="Bytes"
          value={
            formatNumber(
              flow.byte_count
            )
          }
        />

        <InfoItem
          label="Duration"
          value={
            `${Number(
              flow.duration_seconds || 0
            ).toFixed(3)}s`
          }
        />

        <InfoItem
          label="Evidence Score"
          value={
            Number(
              flow.evidence_score || 0
            ).toFixed(1)
          }
        />

      </div>


      {/* TCP flags */}

      <div className="mt-5">

        <p className="text-xs uppercase tracking-wider text-slate-600">
          TCP Flags
        </p>

        <div className="mt-2 flex flex-wrap gap-2">

          {Object.entries(
            flags
          ).map(
            ([flag, count]) => (

              <span
                key={flag}
                className="
                  rounded-md
                  border
                  border-slate-700
                  bg-slate-900/50
                  px-2.5
                  py-1
                  font-mono
                  text-[11px]
                  text-slate-300
                "
              >
                {flag}={count}
              </span>

            )
          )}

        </div>

      </div>


      {/* SYN without ACK */}

      {flow.syn_without_ack && (

        <div className="mt-4 rounded-lg border border-orange-400/20 bg-orange-400/5 p-3">

          <p className="text-xs font-medium text-orange-300">
            SYN without observed ACK
          </p>

          <p className="mt-1 text-xs leading-5 text-orange-300/70">
            The flow contains SYN packets without
            an observed ACK response within the
            aggregated flow record.
          </p>

        </div>

      )}


      {/* Reasons */}

      {flow.evidence_reasons?.length > 0 && (

        <div className="mt-5">

          <p className="text-xs uppercase tracking-wider text-slate-600">
            Evidence Reasons
          </p>

          <div className="mt-3 space-y-2">

            {flow.evidence_reasons.map(
              (
                reason,
                reasonIndex
              ) => (

                <div
                  key={reasonIndex}
                  className="flex items-start gap-2 text-xs text-slate-400"
                >

                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />

                  <span>
                    {reason}
                  </span>

                </div>

              )
            )}

          </div>

        </div>

      )}

    </div>

  );
}


// ============================================================
// TEMPORAL INPUT
// ============================================================

function TemporalInput({
  result,
}) {

  return (

    <div className="rounded-2xl border border-slate-700 bg-threatcast-card p-6">

      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">

        <div>

          <h3 className="text-lg font-semibold text-slate-100">
            Temporal Model Input
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            {result.features.length} features ×{" "}
            {result.input.sequence.length} states
          </p>

        </div>

        <span className="rounded-full border border-slate-700 bg-slate-800/50 px-3 py-1 text-xs text-slate-400">
          {result.input.sequence.length} ×{" "}
          {result.features.length}
        </span>

      </div>


      <div className="mt-4 overflow-auto rounded-lg border border-slate-800">

        <table className="min-w-full text-left text-sm">

          <thead>

            <tr className="border-b border-slate-700 bg-threatcast-elevated text-slate-400">

              <th className="whitespace-nowrap px-3 py-3 text-xs uppercase tracking-wider">
                State
              </th>

              {result.features.map(
                (feature) => (

                  <th
                    key={feature}
                    className="whitespace-nowrap px-3 py-3 text-xs uppercase tracking-wider"
                  >
                    {feature}
                  </th>

                )
              )}

            </tr>

          </thead>


          <tbody>

            {result.input.sequence.map(
              (row, index) => (

                <tr
                  key={index}
                  className="border-b border-slate-800 last:border-0"
                >

                  <td className="whitespace-nowrap px-3 py-2 font-medium text-cyan-300">
                    T-
                    {
                      result.input.sequence.length
                      - 1
                      - index
                    }
                  </td>

                  {row.map(
                    (
                      value,
                      column
                    ) => (

                      <td
                        key={column}
                        className="whitespace-nowrap px-3 py-2 text-slate-300"
                      >
                        {formatNumber(
                          value
                        )}
                      </td>

                    )
                  )}

                </tr>

              )
            )}

          </tbody>

        </table>

      </div>

    </div>

  );
}


// ============================================================
// INFO ITEM
// ============================================================

function InfoItem({
  label,
  value,
}) {

  return (

    <div>

      <p className="text-xs uppercase tracking-wider text-slate-600">
        {label}
      </p>

      <p className="mt-1 break-words text-sm text-slate-300">
        {value ?? "—"}
      </p>

    </div>

  );
}


// ============================================================
// FORMAT BADGE
// ============================================================

function FormatBadge({
  label,
}) {

  return (

    <span className="rounded-full border border-slate-700 bg-slate-800/40 px-3 py-1 text-xs font-medium text-slate-400">
      .{label.toLowerCase()}
    </span>

  );
}


// ============================================================
// SOURCE BADGE
// ============================================================

function SourceBadge({
  source,
}) {

  return (

    <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-300">
      {source}
    </span>

  );
}


// ============================================================
// HELPERS
// ============================================================

function detectSource(
  file,
) {

  if (!file) {
    return "file";
  }

  const extension =
    file.name
      .split(".")
      .pop()
      ?.toLowerCase();

  if (
    extension === "pcap" ||
    extension === "pcapng" ||
    extension === "cap"
  ) {

    return "pcap";
  }

  return "csv";
}


function formatNumber(
  value,
) {

  if (
    value === null ||
    value === undefined
  ) {

    return "—";
  }

  const number =
    Number(value);

  if (
    !Number.isFinite(
      number
    )
  ) {

    return String(value);
  }

  if (
    Math.abs(number) >=
    1000000
  ) {

    return number.toLocaleString(
      undefined,
      {
        maximumFractionDigits: 2,
      }
    );
  }

  return number.toFixed(3);
}


function formatPercent(
  value,
) {

  const number =
    Number(value);

  if (
    !Number.isFinite(
      number
    )
  ) {

    return "—";
  }

  return `${number.toFixed(2)}%`;
}


function formatBytes(
  bytes,
) {

  const number =
    Number(bytes);

  if (
    !Number.isFinite(number) ||
    number < 0
  ) {

    return "—";
  }

  if (number < 1024) {
    return `${number} B`;
  }

  if (
    number <
    1024 * 1024
  ) {

    return `${(
      number / 1024
    ).toFixed(1)} KB`;
  }

  if (
    number <
    1024 * 1024 * 1024
  ) {

    return `${(
      number /
      (1024 * 1024)
    ).toFixed(1)} MB`;
  }

  return `${(
    number /
    (1024 * 1024 * 1024)
  ).toFixed(1)} GB`;
}
