import React from "react";
import WorldModelUpload from "../components/worldmodel/WorldModelUpload";

export default function WorldModel() {
  return (
    <div className="space-y-6">

      {/* HEADER */}
      <section>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">

          <div>
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)]" />

              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-600">
                THREATCAST AI
              </span>
            </div>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-cyber-brown-900">
              World Model
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-cyber-brown-600">
              Upload network telemetry or a raw packet
              capture and run the trained CTU13 temporal
              world model for multi-step infiltration risk
              forecasting, weakly-supervised stage prediction,
              and telemetry evidence.
            </p>
          </div>

          <div className="rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-xs font-semibold text-cyan-700">
            LIVE INFERENCE
          </div>

        </div>
      </section>

      {/* PIPELINE */}
      <section className="rounded-2xl border border-cyber-brown-200 bg-threatcast-card p-5 shadow-sm">

        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">

          {[
            ["01", "Upload", "CSV / PCAP"],
            ["02", "Extract", "30-second states"],
            ["03", "Encode", "64-D latent"],
            ["04", "Forecast", "T+1 / T+2 / T+3"],
            ["05", "Explain", "Stage + evidence"],
          ].map(
            ([number, title, subtitle]) => (
              <div
                key={number}
                className="
                  rounded-xl
                  border border-cyber-brown-100
                  bg-threatcast-bg
                  p-4
                "
              >
                <div className="text-[10px] font-bold tracking-widest text-cyber-brown-400">
                  STEP {number}
                </div>

                <div className="mt-2 text-sm font-bold text-cyber-brown-900">
                  {title}
                </div>

                <div className="mt-1 text-xs text-cyber-brown-500">
                  {subtitle}
                </div>
              </div>
            )
          )}

        </div>
      </section>

      {/* UPLOAD + RESULTS */}
      <WorldModelUpload />

    </div>
  );
}