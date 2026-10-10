import React, { useEffect, useMemo, useState } from "react";
import MotionReveal from "../components/common/MotionReveal";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";


const API_BASE_URL = "http://127.0.0.1:8000";


// ============================================================
// HELPERS
// ============================================================

function formatNumber(value, decimals = 2) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return number.toFixed(decimals);
}


function formatTime(value) {
  if (!value) {
    return "Unavailable";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}


// ============================================================
// SMALL UI COMPONENTS
// ============================================================

function MetricCard({
  title,
  value,
  description,
}) {
  return (
    <MotionReveal hover>
    <div className="rounded-2xl border border-tc-border bg-threatcast-card p-5 shadow-sm">

      <div className="text-xs font-semibold uppercase tracking-wider text-threatcast-cyan">
        {title}
      </div>

      <div className="mt-3 text-2xl font-bold text-threatcast-text">
        {value}
      </div>

      <div className="mt-2 text-xs leading-5 text-threatcast-muted">
        {description}
      </div>

    </div>
    </MotionReveal>
  );
}


function NoticeCard({
  title,
  children,
}) {
  return (
    <MotionReveal hover>
    <div className="rounded-2xl border border-tc-border bg-threatcast-elevated p-5">

      <div className="text-xs font-bold uppercase tracking-wider text-threatcast-cyan">
        {title}
      </div>

      <div className="mt-2 text-sm leading-6 text-threatcast-text">
        {children}
      </div>

    </div>
    </MotionReveal>
  );
}


// ============================================================
// MAIN PAGE
// ============================================================

export default function LiveNetwork() {

  const [activity, setActivity] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");


  // ==========================================================
  // LOAD NETWORK ACTIVITY
  // ==========================================================

  const loadActivity = async () => {

    try {

      setLoading(true);

      setError("");


      const response = await fetch(
        `${API_BASE_URL}/api/network/activity`
      );


      if (!response.ok) {

        throw new Error(
          `Network activity request failed with status ${response.status}.`
        );

      }


      const data = await response.json();


      setActivity(data);

    } catch (err) {

      console.error(
        "Failed to load CTU13 network activity:",
        err
      );


      setError(
        err?.message ||
          "Unable to load CTU13 network activity."
      );

    } finally {

      setLoading(false);

    }

  };


  // ==========================================================
  // INITIAL LOAD + REFRESH
  // ==========================================================

  useEffect(() => {

    loadActivity();


    const refreshInterval = setInterval(
      loadActivity,
      30000
    );


    return () => {
      clearInterval(refreshInterval);
    };

  }, []);


  // ==========================================================
  // TRAFFIC DATA
  // ==========================================================

  const trafficData = useMemo(() => {

    if (
      !activity ||
      !Array.isArray(activity.traffic_series)
    ) {
      return [];
    }


    return activity.traffic_series.map(
      (point) => ({
        time: point.time,

        ingress: Number(
          point.bytes_in_mbps || 0
        ),

        egress: Number(
          point.bytes_out_mbps || 0
        ),

        flowChange: Number(
          point.anomalous_mbps || 0
        ),
      })
    );

  }, [activity]);


  // ==========================================================
  // ACTIVITY DATA
  // ==========================================================

  const activityData = useMemo(() => {

    if (
      !activity ||
      !Array.isArray(activity.risk_trend)
    ) {
      return [];
    }


    return activity.risk_trend.map(
      (point) => ({
        time: point.time,

        activityScore: Number(
          point.risk_score || 0
        ),

        threatEvents: Number(
          point.threat_events || 0
        ),
      })
    );

  }, [activity]);


  // ==========================================================
  // LATEST VALUES
  // ==========================================================

  const latestTraffic =
    trafficData.length > 0
      ? trafficData[trafficData.length - 1]
      : null;


  const latestActivity =
    activityData.length > 0
      ? activityData[activityData.length - 1]
      : null;


  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <div className="min-h-screen bg-threatcast-card px-5 py-6 md:px-8">

      {/* ==================================================== */}
      {/* HEADER */}
      {/* ==================================================== */}

      <div className="mb-6 border-b border-tc-border pb-5">

        <div className="flex flex-wrap items-start justify-between gap-4">

          <div>

            <h1 className="text-3xl font-bold tracking-tight text-threatcast-text">
              Network Activity &amp; Telemetry
            </h1>


            <p className="mt-2 max-w-3xl text-sm leading-6 text-threatcast-muted">
              Aggregate network-state activity from the
              CTU13 dataset used by the ThreatCast early-warning
              pipeline.
            </p>

          </div>


          <div className="rounded-full border border-tc-border bg-threatcast-elevated px-4 py-2 text-xs font-semibold text-threatcast-cyan">
            CTU13 DATA SOURCE
          </div>

        </div>

      </div>


      {/* ==================================================== */}
      {/* MODEL SCOPE */}
      {/* ==================================================== */}

      <div className="mb-6">

        <NoticeCard title="Model scope">

          The deployed CTU13 LSTM analyzes 12 statistical
          network-state features across five consecutive
          30-second observations. It produces an aggregate
          early-warning probability. It does not provide
          authentication events, individual-host attribution,
          MITRE ATT&amp;CK stage classification, or graph-based
          attack paths.

        </NoticeCard>

      </div>


      {/* ==================================================== */}
      {/* ERROR */}
      {/* ==================================================== */}

      {error && (

        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5">

          <div className="text-sm font-bold text-red-700">
            Unable to load network activity
          </div>


          <div className="mt-2 text-sm text-red-600">
            {error}
          </div>


          <button
            type="button"
            onClick={loadActivity}
            className="mt-4 rounded-lg border border-red-300 bg-threatcast-card px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
          >
            Retry
          </button>

        </div>

      )}


      {/* ==================================================== */}
      {/* METRIC CARDS */}
      {/* ==================================================== */}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <MetricCard
          title="Ingress Traffic"
          value={
            latestTraffic
              ? `${formatNumber(
                  latestTraffic.ingress,
                  3
                )} Mbps`
              : loading
                ? "Loading..."
                : "Unavailable"
          }
          description="Latest aggregate network-state throughput."
        />


        <MetricCard
          title="Egress Traffic"
          value={
            latestTraffic
              ? `${formatNumber(
                  latestTraffic.egress,
                  3
                )} Mbps`
              : loading
                ? "Loading..."
                : "Unavailable"
          }
          description="Latest aggregate source-byte throughput."
        />


        <MetricCard
          title="Activity Indicator"
          value={
            latestActivity
              ? `${latestActivity.activityScore}/100`
              : loading
                ? "Loading..."
                : "Unavailable"
          }
          description="Visualization metric derived from network flow activity."
        />


        <MetricCard
          title="Event Stream"
          value="Not Available"
          description="CTU13 network-state data does not provide event-level security counts."
        />

      </div>


      {/* ==================================================== */}
      {/* NETWORK BANDWIDTH */}
      {/* ==================================================== */}

      <MotionReveal hover className="mb-6">
      <div className="overflow-hidden rounded-2xl border border-threatcast-cyan/25 bg-[radial-gradient(ellipse_at_top_right,rgba(0,229,255,0.12),transparent_42%),linear-gradient(135deg,var(--tc-card),var(--tc-bg-deep))] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.22)]">

        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">

          <div>

            <h2 className="text-lg font-bold text-threatcast-text">
              Network Bandwidth Activity
            </h2>


            <p className="mt-1 text-sm text-threatcast-muted">
              Aggregate ingress and egress throughput
              across recent CTU13 network states.
            </p>

          </div>


          <div className="rounded-lg border border-tc-border bg-threatcast-elevated px-3 py-2 text-xs font-semibold text-threatcast-cyan">
            30-SECOND STATES
          </div>

        </div>


        <div className="h-[340px] w-full">

          {trafficData.length > 0 ? (

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <AreaChart
                data={trafficData}
                margin={{
                  top: 10,
                  right: 20,
                  left: 0,
                  bottom: 10,
                }}
              >

                <defs>
                  <linearGradient id="liveIngressGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.42" />
                    <stop offset="100%" stopColor="#00e5ff" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="liveEgressGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="liveFlowGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffb000" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#ffb000" stopOpacity="0" />
                  </linearGradient>
                  <filter id="liveBandwidthGlow" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(184,192,200,0.16)"
                  vertical={false}
                />


                <XAxis
                  dataKey="time"
                  tick={{
                    fontSize: 11,
                    fill: "var(--tc-muted)",
                    fontFamily: "monospace",
                  }}
                  axisLine={{ stroke: "rgba(184,192,200,0.25)" }}
                  tickLine={false}
                />


                <YAxis
                  tick={{
                    fontSize: 11,
                    fill: "var(--tc-muted)",
                    fontFamily: "monospace",
                  }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) =>
                    `${value}`
                  }
                />


                <Tooltip
                  formatter={(value) =>
                    `${formatNumber(
                      value,
                      3
                    )} Mbps`
                  }
                  contentStyle={{
                    backgroundColor: "rgba(9, 16, 28, 0.96)",
                    border: "1px solid rgba(0, 229, 255, 0.35)",
                    borderRadius: "12px",
                    boxShadow: "0 16px 40px rgba(0,0,0,0.36)",
                    color: "#eef5ff",
                    fontFamily: "monospace",
                    fontSize: "11px",
                  }}
                />


                <Legend wrapperStyle={{ color: "var(--tc-silver)", fontSize: "11px", paddingTop: "12px" }} />


                <Area
                  type="monotone"
                  dataKey="ingress"
                  name="Ingress Traffic"
                  stroke="#00e5ff"
                  strokeWidth={2.5}
                  fill="url(#liveIngressGradient)"
                  filter="url(#liveBandwidthGlow)"
                  dot={false}
                  activeDot={{ r: 5, fill: "#00e5ff", stroke: "#07101c", strokeWidth: 2 }}
                />


                <Area
                  type="monotone"
                  dataKey="egress"
                  name="Egress Traffic"
                  stroke="#a78bfa"
                  strokeWidth={2.5}
                  fill="url(#liveEgressGradient)"
                  filter="url(#liveBandwidthGlow)"
                  dot={false}
                  activeDot={{ r: 5, fill: "#a78bfa", stroke: "#07101c", strokeWidth: 2 }}
                />


                <Area
                  type="monotone"
                  dataKey="flowChange"
                  name="Flow-Change Indicator"
                  stroke="#ffb000"
                  strokeWidth={2.5}
                  fill="url(#liveFlowGradient)"
                  filter="url(#liveBandwidthGlow)"
                  dot={false}
                  activeDot={{ r: 5, fill: "#ffb000", stroke: "#07101c", strokeWidth: 2 }}
                />

              </AreaChart>

            </ResponsiveContainer>

          ) : (

            <div className="flex h-full items-center justify-center text-sm text-threatcast-muted">

              {loading
                ? "Loading CTU13 network states..."
                : "No network activity data available."}

            </div>

          )}

        </div>

      </div>
      </MotionReveal>


      {/* ==================================================== */}
      {/* NETWORK ACTIVITY TREND */}
      {/* ==================================================== */}

      <MotionReveal hover className="mb-6">
      <div className="overflow-hidden rounded-2xl border border-[rgba(167,139,250,0.28)] bg-[radial-gradient(ellipse_at_top_left,rgba(124,58,237,0.16),transparent_46%),linear-gradient(135deg,var(--tc-card),var(--tc-bg-deep))] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.22)]">

        <div className="mb-5">

          <h2 className="text-lg font-bold text-threatcast-text">
            Network Activity Trend
          </h2>


          <p className="mt-1 text-sm text-threatcast-muted">
            Aggregate network activity across recent
            CTU13 observation windows.
          </p>

        </div>


        <div className="h-[320px] w-full">

          {activityData.length > 0 ? (

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <AreaChart
                data={activityData}
                margin={{
                  top: 10,
                  right: 20,
                  left: 0,
                  bottom: 10,
                }}
              >

                <defs>
                  <linearGradient id="liveActivityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.72" />
                    <stop offset="52%" stopColor="#00e5ff" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#00e5ff" stopOpacity="0" />
                  </linearGradient>
                  <filter id="liveActivityGlow" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(184,192,200,0.16)"
                  vertical={false}
                />


                <XAxis
                  dataKey="time"
                  tick={{
                    fontSize: 11,
                    fill: "var(--tc-muted)",
                    fontFamily: "monospace",
                  }}
                  axisLine={{ stroke: "rgba(184,192,200,0.25)" }}
                  tickLine={false}
                />


                <YAxis
                  domain={[0, 100]}
                  tick={{
                    fontSize: 11,
                    fill: "var(--tc-muted)",
                    fontFamily: "monospace",
                  }}
                  axisLine={false}
                  tickLine={false}
                />


                <Tooltip
                  formatter={(value) => `${formatNumber(value, 1)} / 100`}
                  contentStyle={{
                    backgroundColor: "rgba(9, 16, 28, 0.96)",
                    border: "1px solid rgba(167, 139, 250, 0.4)",
                    borderRadius: "12px",
                    boxShadow: "0 16px 40px rgba(0,0,0,0.36)",
                    color: "#eef5ff",
                    fontFamily: "monospace",
                    fontSize: "11px",
                  }}
                />


                <Legend wrapperStyle={{ color: "var(--tc-silver)", fontSize: "11px", paddingTop: "12px" }} />


                <Area
                  type="monotone"
                  dataKey="activityScore"
                  name="Network Activity Indicator"
                  stroke="#a78bfa"
                  strokeWidth={3}
                  fill="url(#liveActivityGradient)"
                  filter="url(#liveActivityGlow)"
                  dot={false}
                  activeDot={{ r: 6, fill: "#00e5ff", stroke: "#07101c", strokeWidth: 2 }}
                />

              </AreaChart>

            </ResponsiveContainer>

          ) : (

            <div className="flex h-full items-center justify-center text-sm text-threatcast-muted">

              {loading
                ? "Loading activity trend..."
                : "No activity trend available."}

            </div>

          )}

        </div>

      </div>
      </MotionReveal>


      {/* ==================================================== */}
      {/* DATA LIMITATIONS */}
      {/* ==================================================== */}

      <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-2">

        <NoticeCard title="Authentication telemetry unavailable">

          The CTU13 network-state data used by ThreatCast
          does not contain successful-login, failed-login,
          or privilege-escalation event counts. These are
          therefore not presented as real security events.

        </NoticeCard>


        <NoticeCard title="Node attribution unavailable">

          The CTU13 LSTM operates on aggregate network-state
          features. It does not identify compromised hosts,
          individual nodes, future attack paths, or specific
          MITRE ATT&amp;CK techniques.

        </NoticeCard>

      </div>


      {/* ==================================================== */}
      {/* PIPELINE STATUS */}
      {/* ==================================================== */}

      <div className="rounded-2xl border border-tc-border bg-threatcast-card p-5 shadow-sm">

        <div className="flex flex-wrap items-center justify-between gap-5">

          <div>

            <div className="text-xs font-bold uppercase tracking-wider text-threatcast-cyan">
              Data status
            </div>


            <div className="mt-2 text-sm font-semibold text-threatcast-text">
              CTU13 aggregate network-state pipeline
            </div>


            <div className="mt-1 text-xs leading-5 text-threatcast-muted">
              The page refreshes the network activity endpoint
              every 30 seconds while open.
            </div>

          </div>


          <div className="text-right">

            <div className="text-xs text-threatcast-muted">
              Last dataset timestamp
            </div>


            <div className="mt-1 text-sm font-semibold text-threatcast-text">
              {formatTime(
                activity?.last_updated
              )}
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
