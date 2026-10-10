import React, { useEffect, useState } from "react";
import { usePcapAnalysis, buildUploadedRuleComparison } from '../context/PcapAnalysisContext';
import { getBlockchainDisagreements, resolveBlockchainDisagreement } from '../services/api';


export default function Disagreements() {
  const { analysis, fileName } = usePcapAnalysis();
  const pcapComparison = buildUploadedRuleComparison(analysis);
  const activeComparison = pcapComparison || null;
  const isConnected = Boolean(activeComparison);
  const disagreementCount = activeComparison?.total_disagreements ?? 0;
  const [ledgerRecords, setLedgerRecords] = useState([]);
  const [ledgerError, setLedgerError] = useState('');

  const loadLedger = async () => {
    try {
      setLedgerRecords(await getBlockchainDisagreements());
      setLedgerError('');
    } catch (error) {
      setLedgerError(error?.response?.data?.detail || error.message || 'Unable to load disagreement ledger.');
    }
  };

  useEffect(() => {
    loadLedger();
  }, [analysis]);

  return (
    <div className="min-h-screen bg-threatcast-card px-5 py-6 md:px-8">

      <div className="mb-6 border-b border-tc-border pb-5">

        <div className="flex flex-wrap items-start justify-between gap-4">

          <div>

            <h1 className="text-3xl font-bold tracking-tight text-threatcast-text">
              Model vs Rule Verification
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-threatcast-muted">
              Verification status for comparison between the
              CTU13 LSTM early-warning output and a deterministic
              security-rule engine.
            </p>

          </div>


          <div className="rounded-full border border-tc-border bg-threatcast-elevated px-4 py-2 text-xs font-semibold text-threatcast-cyan">
            {isConnected ? 'PCAP RULES CONNECTED' : 'INTEGRATION PENDING'}
          </div>

        </div>

      </div>

      <LedgerReviewPanel records={ledgerRecords} error={ledgerError} onResolved={loadLedger} />


      {/* STATUS */}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

        <div className="rounded-2xl border border-tc-border bg-threatcast-elevated p-6">

          <div className="text-xs font-bold uppercase tracking-wider text-threatcast-cyan">
            ML model
          </div>

          <div className="mt-3 text-2xl font-bold text-threatcast-text">
            CTU13 LSTM
          </div>

          <div className="mt-2 text-sm leading-6 text-threatcast-muted">
            Produces an aggregate early-warning probability
            from five consecutive 30-second network states
            using 12 engineered features.
          </div>

        </div>


        <div className="rounded-2xl border border-tc-border bg-threatcast-card p-6">

          <div className="text-xs font-bold uppercase tracking-wider text-threatcast-cyan">
            Rule engine
          </div>

          <div className="mt-3 text-2xl font-bold text-threatcast-text">
            {isConnected ? 'Connected' : 'Not Connected'}
          </div>

          <div className="mt-2 text-sm leading-6 text-threatcast-muted">
            {isConnected
              ? `Evaluating ${fileName} with deterministic rules.`
              : 'Upload a CSV or PCAP from the header to connect deterministic rules to the model.'}
          </div>

        </div>

      </div>


      {/* RESULT */}

      <div className="mt-6 rounded-2xl border border-tc-border bg-threatcast-card p-6">

        <div className="text-xs font-bold uppercase tracking-wider text-threatcast-cyan">
          Current verification result
        </div>

        <div className="mt-3 text-2xl font-bold text-threatcast-green">
          {isConnected
            ? disagreementCount > 0
              ? `${disagreementCount} Model-Rule Disagreement`
              : 'Model and Rule Agreement'
            : 'No Model-Rule Disagreement Claim'}
        </div>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-threatcast-text">

          {isConnected
            ? activeComparison.analytical_summary
            : 'A disagreement is calculated after a PCAP upload provides both the CTU13 LSTM prediction and deterministic flow-evidence rules for the same capture.'}

        </p>

      </div>


      {/* WHY */}

      <div className="mt-6 rounded-2xl border border-tc-border bg-threatcast-card p-6">

        <div className="text-xs font-bold uppercase tracking-wider text-threatcast-cyan">
          {isConnected ? 'Uploaded PCAP comparison' : 'Why this is currently zero'}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">

          <div className="rounded-xl border border-tc-border bg-threatcast-card p-4">

            <div className="text-lg font-bold text-threatcast-text">
              01
            </div>

            <div className="mt-2 text-sm font-semibold text-threatcast-text">
              LSTM available
            </div>

            <div className="mt-1 text-xs leading-5 text-threatcast-muted">
              CTU13 inference is connected to FastAPI.
            </div>

          </div>


          <div className="rounded-xl border border-tc-border bg-threatcast-card p-4">

            <div className="text-lg font-bold text-threatcast-text">
              02
            </div>

            <div className="mt-2 text-sm font-semibold text-threatcast-text">
              {isConnected ? 'Rule result available' : 'Rule result unavailable'}
            </div>

            <div className="mt-1 text-xs leading-5 text-threatcast-muted">
              {isConnected ? `${activeComparison.flagged_flow_count} flagged flow(s) evaluated.` : 'Upload a PCAP to evaluate deterministic flow evidence.'}
            </div>

          </div>


          <div className="rounded-xl border border-tc-border bg-threatcast-card p-4">

            <div className="text-lg font-bold text-threatcast-text">
              03
            </div>

            <div className="mt-2 text-sm font-semibold text-threatcast-text">
              {isConnected ? 'Comparison active' : 'Comparison disabled'}
            </div>

            <div className="mt-1 text-xs leading-5 text-threatcast-muted">
              {isConnected ? `${disagreementCount} disagreement(s) for this PCAP.` : 'No disagreement claim is generated.'}
            </div>

          </div>

        </div>

      </div>


      {/* SCOPE */}

      <div className="mt-6 rounded-2xl border border-tc-border bg-threatcast-elevated p-6">

        <div className="text-xs font-bold uppercase tracking-wider text-threatcast-cyan">
          Integration note
        </div>

        <p className="mt-2 text-sm leading-6 text-threatcast-text">

          {isConnected
            ? 'This comparison uses deterministic flagged-flow evidence from the uploaded PCAP and the first CTU13 world-model forecast horizon.'
            : 'Upload a PCAP from the global header to compare deterministic flow evidence with the CTU13 LSTM classification.'}

        </p>

      </div>

    </div>
  );
}

function LedgerReviewPanel({ records, error, onResolved }) {
  const [busyId, setBusyId] = useState('');
  const [reason, setReason] = useState({});

  async function resolve(eventId, decision) {
    const resolutionReason = reason[eventId]?.trim();
    if (!resolutionReason) return;
    setBusyId(eventId);
    try {
      await resolveBlockchainDisagreement(eventId, {
        analyst_decision: decision,
        analyst_id: 'analyst-ui',
        resolution_reason: resolutionReason,
      });
      setReason((current) => ({ ...current, [eventId]: '' }));
      await onResolved();
    } finally {
      setBusyId('');
    }
  }

  return (
    <section className="mb-6 rounded-2xl border border-tc-border bg-threatcast-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-threatcast-cyan">Human analyst review</div>
          <h2 className="mt-2 text-xl font-bold text-threatcast-text">Ledgered disagreements</h2>
          <p className="mt-1 text-sm text-threatcast-muted">Stored model-rule disagreements from uploaded files.</p>
        </div>
        <span className="rounded-full border border-tc-border bg-threatcast-elevated px-3 py-1 text-xs font-semibold text-threatcast-cyan">{records.length} RECORDS</span>
      </div>

      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
      {!error && records.length === 0 && <p className="mt-5 rounded-xl bg-threatcast-card p-4 text-sm text-threatcast-muted">Upload a CSV or PCAP that produces a model-rule mismatch to create the first ledger record.</p>}

      <div className="mt-5 space-y-4">
        {records.map((record) => (
          <div key={record.eventId} className="rounded-xl border border-tc-border bg-threatcast-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs font-bold text-threatcast-text">{record.eventId}</p>
                <p className="mt-1 text-xs font-semibold text-threatcast-muted">File: {record.evidence?.filename || record.networkStateId || 'Uploaded file'}</p>
                <p className="mt-1 text-sm text-threatcast-text">AI: {record.aiLabel} vs Rule: {record.ruleOutput}</p>
              </div>
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${record.disagreementType === 'MODEL_RULE_AGREEMENT' ? 'border-tc-border bg-threatcast-elevated text-threatcast-green' : 'border-threatcast-red bg-threatcast-elevated text-threatcast-red'}`}>{record.disagreementType === 'MODEL_RULE_AGREEMENT' ? 'AGREEMENT' : 'DISAGREEMENT'} · {record.status}</span>
            </div>
            {record.status !== 'RESOLVED' && (
              <div className="mt-4 flex flex-col gap-2 md:flex-row">
                <input value={reason[record.eventId] || ''} onChange={(event) => setReason((current) => ({ ...current, [record.eventId]: event.target.value }))} placeholder="Analyst resolution reason" className="min-w-0 flex-1 rounded-lg border border-tc-border bg-threatcast-card px-3 py-2 text-sm text-threatcast-text" />
                <button type="button" disabled={busyId === record.eventId} onClick={() => resolve(record.eventId, 'TRUE_POSITIVE')} className="rounded-lg bg-threatcast-green px-3 py-2 text-xs font-bold text-threatcast-deep disabled:opacity-50">True positive</button>
                <button type="button" disabled={busyId === record.eventId} onClick={() => resolve(record.eventId, 'FALSE_POSITIVE')} className="rounded-lg bg-[var(--tc-red)] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">False positive</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
