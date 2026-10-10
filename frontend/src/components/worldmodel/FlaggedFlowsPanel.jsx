import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
  ShieldAlert,
  SlidersHorizontal,
} from "lucide-react";

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? parsed.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : "—";
}

function formatBytes(value) {
  const bytes = toNumber(value, NaN);

  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function endpoint(ip, port) {
  if (!ip) return "—";
  if (port === null || port === undefined || port === "") return String(ip);
  return `${ip}:${port}`;
}

function protocolLabel(flow) {
  return flow?.protocol || flow?.protocol_name || "Unknown";
}

function FlowFlag({ label, value, activeTone = "cyan" }) {
  const active = toNumber(value) > 0;

  const activeClasses =
    activeTone === "red"
      ? "border-red-400/30 bg-red-400/10 text-red-300"
      : "border-cyan-400/30 bg-cyan-400/10 text-cyan-300";

  return (
    <div
      className={`rounded-lg border px-3 py-2 ${
        active
          ? activeClasses
          : "border-slate-800 bg-threatcast-elevated text-slate-500"
      }`}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wider">
        {label}
      </div>
      <div className="mt-1 text-sm font-bold">{formatNumber(value)}</div>
    </div>
  );
}

function EvidenceReasons({ flow }) {
  const reasons = Array.isArray(flow?.evidence_reasons)
    ? flow.evidence_reasons
    : [];

  if (reasons.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-threatcast-elevated p-4 text-xs text-slate-500">
        No deterministic evidence rule was triggered for this flow.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {reasons.map((reason, index) => (
        <div
          key={`${String(reason)}-${index}`}
          className="flex items-start gap-3 rounded-xl border border-red-500/10 bg-red-500/5 p-3"
        >
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
          <span className="text-xs leading-5 text-slate-300">{reason}</span>
        </div>
      ))}
    </div>
  );
}

function FlowCard({ flow, index }) {
  const [expanded, setExpanded] = useState(false);
  const flagged = Boolean(flow?.flagged);
  const score = toNumber(flow?.evidence_score);
  const flags = flow?.tcp_flags || {};

  return (
    <article
      className={`overflow-hidden rounded-2xl border ${
        flagged
          ? "border-red-500/20 bg-threatcast-card"
          : "border-slate-800 bg-threatcast-card"
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="w-full p-5 text-left transition hover:bg-threatcast-card/[0.02]"
        aria-expanded={expanded}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {flagged ? (
                <span className="rounded-full border border-red-400/30 bg-red-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-red-300">
                  Flagged
                </span>
              ) : (
                <span className="rounded-full border border-slate-700 bg-slate-800/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Observed
                </span>
              )}

              <span className="rounded-full border border-slate-700 bg-slate-800/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {protocolLabel(flow)}
              </span>

              <span className="text-[10px] uppercase tracking-wider text-slate-600">
                Flow #{index + 1}
              </span>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <span className="break-all font-mono text-sm font-semibold text-slate-100">
                {endpoint(flow?.src_ip, flow?.src_port)}
              </span>
              <span className="text-cyan-400">→</span>
              <span className="break-all font-mono text-sm font-semibold text-slate-100">
                {endpoint(flow?.dst_ip, flow?.dst_port)}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-lg border border-slate-800 bg-threatcast-elevated px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-slate-600">
                  Packets
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-200">
                  {formatNumber(flow?.packet_count)}
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-threatcast-elevated px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-slate-600">
                  Bytes
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-200">
                  {formatBytes(flow?.byte_count)}
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-threatcast-elevated px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-slate-600">
                  SYN
                </div>
                <div className="mt-1 text-sm font-semibold text-cyan-300">
                  {formatNumber(flags.SYN)}
                </div>
              </div>

              <div
                className={`rounded-lg border px-3 py-2 ${
                  flagged
                    ? "border-red-400/20 bg-red-400/5"
                    : "border-slate-800 bg-threatcast-elevated"
                }`}
              >
                <div className="text-[10px] uppercase tracking-wider text-slate-600">
                  Evidence Score
                </div>
                <div
                  className={`mt-1 text-sm font-bold ${
                    flagged ? "text-red-300" : "text-slate-200"
                  }`}
                >
                  {score.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 text-slate-500">
            <span className="hidden text-xs sm:inline">
              {expanded ? "Hide details" : "Inspect"}
            </span>
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-800 p-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
              TCP Flags
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
              <FlowFlag label="SYN" value={flags.SYN} />
              <FlowFlag label="ACK" value={flags.ACK} />
              <FlowFlag label="RST" value={flags.RST} />
              <FlowFlag label="FIN" value={flags.FIN} />
              <FlowFlag label="PSH" value={flags.PSH} />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-threatcast-elevated p-4">
              <p className="text-[10px] uppercase tracking-wider text-slate-600">
                SYN without ACK
              </p>
              <p
                className={`mt-2 text-sm font-bold ${
                  flow?.syn_without_ack ? "text-red-300" : "text-emerald-300"
                }`}
              >
                {flow?.syn_without_ack ? "YES" : "NO"}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-threatcast-elevated p-4">
              <p className="text-[10px] uppercase tracking-wider text-slate-600">
                SYN Ratio
              </p>
              <p className="mt-2 text-sm font-bold text-slate-200">
                {(toNumber(flow?.syn_ratio) * 100).toFixed(1)}%
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-threatcast-elevated p-4">
              <p className="text-[10px] uppercase tracking-wider text-slate-600">
                Duration
              </p>
              <p className="mt-2 text-sm font-bold text-slate-200">
                {toNumber(flow?.duration_seconds).toFixed(2)}s
              </p>
            </div>
          </div>

          <div className="mt-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
              Evidence rules
            </p>
            <div className="mt-3">
              <EvidenceReasons flow={flow} />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-threatcast-elevated p-4">
              <p className="text-[10px] uppercase tracking-wider text-slate-600">
                First Seen
              </p>
              <p className="mt-2 break-all font-mono text-xs text-slate-300">
                {flow?.first_seen ?? "—"}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-threatcast-elevated p-4">
              <p className="text-[10px] uppercase tracking-wider text-slate-600">
                Last Seen
              </p>
              <p className="mt-2 break-all font-mono text-xs text-slate-300">
                {flow?.last_seen ?? "—"}
              </p>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

function FlowTable({ flows }) {
  if (!flows.length) {
    return (
      <div className="rounded-xl border border-slate-800 bg-threatcast-elevated p-6 text-center text-sm text-slate-500">
        No flow summary available.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-threatcast-elevated">
          <tr className="border-b border-slate-800">
            <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-slate-600">
              Source
            </th>
            <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-slate-600">
              Destination
            </th>
            <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-slate-600">
              Protocol
            </th>
            <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-slate-600">
              Packets
            </th>
            <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-slate-600">
              SYN / ACK / RST
            </th>
            <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-slate-600">
              Score
            </th>
          </tr>
        </thead>
        <tbody>
          {flows.map((flow, index) => {
            const flags = flow?.tcp_flags || {};
            return (
              <tr
                key={`${flow?.src_ip}-${flow?.src_port}-${flow?.dst_ip}-${flow?.dst_port}-${index}`}
                className="border-b border-slate-800 last:border-0 hover:bg-threatcast-card/[0.02]"
              >
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-300">
                  {endpoint(flow?.src_ip, flow?.src_port)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-300">
                  {endpoint(flow?.dst_ip, flow?.dst_port)}
                </td>
                <td className="px-4 py-3 text-xs text-cyan-300">
                  {protocolLabel(flow)}
                </td>
                <td className="px-4 py-3 text-xs text-slate-300">
                  {formatNumber(flow?.packet_count)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-400">
                  {formatNumber(flags.SYN)} / {formatNumber(flags.ACK)} /{" "}
                  {formatNumber(flags.RST)}
                </td>
                <td
                  className={`px-4 py-3 text-xs font-bold ${
                    flow?.flagged ? "text-red-300" : "text-slate-300"
                  }`}
                >
                  {toNumber(flow?.evidence_score).toFixed(2)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function FlaggedFlowsPanel({ attribution }) {
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState("score");
  const [viewMode, setViewMode] = useState("flagged");
  const [showAll, setShowAll] = useState(false);

  const flaggedFlows = Array.isArray(attribution?.flagged_flows)
    ? attribution.flagged_flows
    : [];

  const allFlows = Array.isArray(attribution?.all_flows)
    ? attribution.all_flows
    : Array.isArray(attribution?.top_flows)
      ? attribution.top_flows.map((flow) => ({
          ...flow,
          flagged: Boolean(flow?.flagged),
        }))
      : [];

  const sourceFlows = viewMode === "flagged" ? flaggedFlows : allFlows;

  const filteredFlows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    let flows = [...sourceFlows];

    if (normalizedQuery) {
      flows = flows.filter((flow) => {
        const reasons = Array.isArray(flow?.evidence_reasons)
          ? flow.evidence_reasons
          : [];

        const searchable = [
          flow?.src_ip,
          flow?.dst_ip,
          flow?.src_port,
          flow?.dst_port,
          flow?.protocol,
          flow?.protocol_name,
          ...reasons,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchable.includes(normalizedQuery);
      });
    }

    if (sortMode === "packets") {
      flows.sort(
        (a, b) =>
          toNumber(b?.packet_count) - toNumber(a?.packet_count)
      );
    } else if (sortMode === "bytes") {
      flows.sort(
        (a, b) => toNumber(b?.byte_count) - toNumber(a?.byte_count)
      );
    } else {
      flows.sort(
        (a, b) =>
          toNumber(b?.evidence_score) - toNumber(a?.evidence_score)
      );
    }

    return flows;
  }, [sourceFlows, query, sortMode]);

  const visibleFlows = showAll
    ? filteredFlows
    : filteredFlows.slice(0, 10);

  const flaggedCount = toNumber(attribution?.flagged_flow_count);
  const totalFlows = toNumber(attribution?.flow_count);
  const packetCount = toNumber(attribution?.packet_count);
  const threshold = toNumber(attribution?.flag_threshold, 2);

  if (!attribution) return null;

  if (!attribution.available) {
    return (
      <section className="rounded-2xl border border-slate-800 bg-threatcast-card p-6">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-5 w-5 text-slate-500" />
          <div>
            <h3 className="text-lg font-semibold text-slate-100">
              Evidence-Flagged Flows
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Packet attribution is unavailable for this capture.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-red-500/20 bg-threatcast-card p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                flaggedCount > 0
                  ? "border-red-400/20 bg-red-400/10"
                  : "border-emerald-400/20 bg-emerald-400/10"
              }`}
            >
              {flaggedCount > 0 ? (
                <AlertTriangle className="h-5 w-5 text-red-300" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-emerald-300" />
              )}
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-100">
                Evidence-Flagged Flows
              </h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Deterministic packet, port, and TCP-flag evidence extracted
                from the uploaded PCAP.
              </p>
            </div>
          </div>
        </div>

        <span className="w-fit rounded-full border border-red-400/30 bg-red-400/10 px-3 py-1 text-xs font-semibold text-red-300">
          Evidence rules
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-threatcast-elevated p-4">
          <p className="text-[10px] uppercase tracking-wider text-slate-600">
            Total Flows
          </p>
          <p className="mt-2 text-xl font-bold text-slate-100">
            {formatNumber(totalFlows)}
          </p>
        </div>

        <div
          className={`rounded-xl border p-4 ${
            flaggedCount > 0
              ? "border-red-400/20 bg-red-400/5"
              : "border-slate-800 bg-threatcast-elevated"
          }`}
        >
          <p className="text-[10px] uppercase tracking-wider text-slate-600">
            Flagged
          </p>
          <p
            className={`mt-2 text-xl font-bold ${
              flaggedCount > 0 ? "text-red-300" : "text-slate-300"
            }`}
          >
            {formatNumber(flaggedCount)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-threatcast-elevated p-4">
          <p className="text-[10px] uppercase tracking-wider text-slate-600">
            Packets
          </p>
          <p className="mt-2 text-xl font-bold text-slate-100">
            {formatNumber(packetCount)}
          </p>
        </div>

        <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4">
          <p className="text-[10px] uppercase tracking-wider text-slate-600">
            Visible
          </p>
          <p className="mt-2 text-xl font-bold text-cyan-300">
            {formatNumber(visibleFlows.length)}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
        <p className="text-xs leading-5 text-amber-300">
          Evidence score threshold: <strong>{threshold.toFixed(2)}</strong>.
          These flags come from deterministic packet/flow rules. They are
          not ground-truth malicious-flow labels and the score is not a
          maliciousness probability.
        </p>
      </div>

      <div className="mt-5 flex flex-col gap-3 xl:flex-row">
        <div className="flex rounded-xl border border-slate-800 bg-threatcast-elevated p-1">
          <button
            type="button"
            onClick={() => {
              setViewMode("flagged");
              setShowAll(false);
            }}
            className={`rounded-lg px-4 py-2.5 text-xs font-semibold transition ${
              viewMode === "flagged"
                ? "bg-red-400/10 text-red-300"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Flagged ({formatNumber(flaggedCount)})
          </button>

          <button
            type="button"
            onClick={() => {
              setViewMode("all");
              setShowAll(false);
            }}
            className={`rounded-lg px-4 py-2.5 text-xs font-semibold transition ${
              viewMode === "all"
                ? "bg-cyan-400/10 text-cyan-300"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            All analyzed ({formatNumber(allFlows.length)})
          </button>
        </div>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setShowAll(false);
            }}
            placeholder="Search source, destination, port, protocol, or evidence reason..."
            className="w-full rounded-xl border border-slate-800 bg-threatcast-elevated py-3 pl-10 pr-4 text-xs text-slate-300 outline-none placeholder:text-slate-600 focus:border-cyan-400/40"
          />
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-threatcast-elevated px-3">
          <SlidersHorizontal className="h-4 w-4 text-slate-600" />
          <select
            value={sortMode}
            onChange={(event) => {
              setSortMode(event.target.value);
              setShowAll(false);
            }}
            className="bg-transparent py-3 text-xs text-slate-300 outline-none"
          >
            <option value="score">Highest evidence score</option>
            <option value="packets">Most packets</option>
            <option value="bytes">Most bytes</option>
          </select>
        </div>
      </div>

      {viewMode === "flagged" && flaggedCount === 0 && (
        <div className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
            <div>
              <p className="text-sm font-semibold text-emerald-200">
                No flows crossed the evidence threshold
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                {formatNumber(totalFlows)} flows were analyzed. None satisfied
                the deterministic flagging rules for this capture. Switch to
                <strong className="text-slate-300"> All analyzed </strong>
                to inspect the observed flows and their evidence scores.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-5 space-y-3">
        {visibleFlows.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-threatcast-elevated p-6 text-center">
            <Filter className="mx-auto h-5 w-5 text-slate-600" />
            <p className="mt-2 text-sm text-slate-400">
              No flows match the current search and sort view.
            </p>
          </div>
        ) : (
          visibleFlows.map((flow, index) => (
            <FlowCard
              key={`${flow?.src_ip}-${flow?.src_port}-${flow?.dst_ip}-${flow?.dst_port}-${flow?.protocol}-${index}`}
              flow={flow}
              index={index}
            />
          ))
        )}
      </div>

      {filteredFlows.length > 10 && (
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={() => setShowAll((current) => !current)}
            className="rounded-xl border border-slate-700 bg-slate-800/40 px-5 py-2.5 text-xs font-semibold text-slate-300 transition hover:border-cyan-400/30 hover:text-cyan-300"
          >
            {showAll
              ? "Show top 10"
              : `Show all ${formatNumber(filteredFlows.length)} matching flows`}
          </button>
        </div>
      )}

      <div className="mt-7">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
          Top Flow Summary
        </p>
        <FlowTable
          flows={allFlows
            .slice()
            .sort(
              (a, b) =>
                toNumber(b?.evidence_score) -
                toNumber(a?.evidence_score)
            )
            .slice(0, 10)}
        />
      </div>
    </section>
  );
}
