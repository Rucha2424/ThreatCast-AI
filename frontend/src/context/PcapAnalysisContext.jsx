import React, { createContext, useContext, useMemo, useState } from 'react';
import { createBlockchainDisagreement } from '../services/api';

const PcapAnalysisContext = createContext(null);

const API_URL = import.meta.env.VITE_API_URL !== undefined
  ? `${import.meta.env.VITE_API_URL}/api/world-model/risk`
  : '/api/world-model/risk';

const SERVER_PORTS = new Set([80, 443, 22, 21, 25, 53, 8080, 8443]);
const DATABASE_PORTS = new Set([3306, 5432, 1433, 1521, 27017, 6379, 9200]);

export function buildPcapTopologyGraph(attribution) {
  const flows = Array.isArray(attribution?.top_flows) ? attribution.top_flows : [];
  if (!flows.length) return null;
  const ports = new Map();
  flows.forEach((flow) => {
    if (!flow?.dst_ip) return;
    const seen = ports.get(flow.dst_ip) || new Set();
    if (Number.isFinite(Number(flow.dst_port))) seen.add(Number(flow.dst_port));
    ports.set(flow.dst_ip, seen);
  });
  const flagged = new Set();
  const compromised = new Set();
  const scores = new Map();
  flows.forEach((flow) => {
    if (!flow?.src_ip || !flow?.dst_ip) return;
    const score = Number(flow.evidence_score) || 0;
    [flow.src_ip, flow.dst_ip].forEach((ip) => scores.set(ip, Math.max(scores.get(ip) || 0, score)));
    if (flow.flagged) {
      flagged.add(flow.src_ip); flagged.add(flow.dst_ip);
      if (score >= 3) { compromised.add(flow.src_ip); compromised.add(flow.dst_ip); }
    }
  });
  const forecast = new Set();
  flows.filter((flow) => flagged.has(flow?.src_ip) && !flagged.has(flow?.dst_ip))
    .sort((a, b) => (Number(b.packet_count) || 0) - (Number(a.packet_count) || 0))
    .slice(0, 3).forEach((flow) => forecast.add(flow.dst_ip));
  const nodeIds = new Set();
  flows.forEach((flow) => { if (flow?.src_ip) nodeIds.add(flow.src_ip); if (flow?.dst_ip) nodeIds.add(flow.dst_ip); });
  const nodes = [...nodeIds].map((ip) => {
    const seen = ports.get(ip) || new Set();
    const type = [...seen].some((port) => DATABASE_PORTS.has(port)) ? 'database' : [...seen].some((port) => SERVER_PORTS.has(port)) ? 'server' : ip.endsWith('.1') || ip.endsWith('.254') ? 'gateway' : 'endpoint';
    return { id: ip, ip, type, state: compromised.has(ip) ? 'compromised' : flagged.has(ip) ? 'suspicious' : forecast.has(ip) ? 'target' : undefined, risk_score: Math.min(100, Math.round((scores.get(ip) || 0) * 20)) };
  });
  return {
    nodes,
    edges: flows.filter((flow) => flow?.src_ip && flow?.dst_ip).map((flow, index) => ({ id: `${flow.src_ip}-${flow.dst_ip}-${index}`, source: flow.src_ip, target: flow.dst_ip, protocol: flow.protocol, is_attack_path: Boolean(flow.flagged), is_forecasted_path: !flow.flagged && forecast.has(flow.dst_ip) })),
    attack_path_node_ids: [...flagged],
    forecasted_path_node_ids: [...forecast],
    high_risk_nodes_count: nodes.filter((node) => node.state === 'compromised' || node.state === 'suspicious').length,
  };
}

export function buildPcapRuleComparison(analysis) {
  if (!analysis) return null;
  const attribution = analysis.packet_attribution;
  const rollout = analysis.world_model?.rollout || [];
  if (!attribution || !rollout.length) return null;

  const modelItem = rollout[0];
  const probability = Number(modelItem.risk_probability ?? 0);
  const modelAlert = Boolean(modelItem.predicted_attack) || probability >= 0.08;
  const flaggedCount = Number(attribution.flagged_flow_count ?? 0);
  const ruleAlert = flaggedCount > 0;
  const disagreement = modelAlert !== ruleAlert;
  const ruleName = flaggedCount > 0 ? 'PCAP Flow Evidence Rules' : 'No PCAP Flow Rule Trigger';

  return {
    total_disagreements: disagreement ? 1 : 0,
    disagreements: disagreement ? [{
      id: 'pcap-disagreement-1',
      timestamp: new Date().toISOString(),
      model_prediction: modelAlert ? 'Early Warning' : 'No Early Warning',
      model_confidence: probability,
      model_architecture: 'CTU13 LSTM',
      rule_name: ruleName,
      rule_output: ruleAlert ? `${flaggedCount} flagged flow(s)` : 'No flagged flows',
      rule_severity: ruleAlert ? 'High' : 'Low',
      status: 'Disagreement',
      why_it_matters: 'The uploaded PCAP produced different model and deterministic flow-evidence decisions for the same capture.',
      observed_signals: attribution.flagged_flows?.slice(0, 3)?.flatMap((flow) => flow.evidence_reasons || []) || [],
      network_context: 'Uploaded PCAP',
      recommended_action: 'Review the flagged flows and the five-state model input window.',
      target_node: 'Uploaded capture',
    }] : [],
    analytical_summary: disagreement
      ? 'The CTU13 model and deterministic PCAP flow rules disagree for this uploaded capture.'
      : `The CTU13 model and deterministic PCAP flow rules agree: ${modelAlert ? 'both indicate elevated activity.' : 'neither indicates elevated activity.'}`,
    last_updated: new Date().toISOString(),
    model_alert: modelAlert,
    rule_alert: ruleAlert,
    flagged_flow_count: flaggedCount,
    model_prediction: modelAlert ? 'Early Warning' : 'No Early Warning',
    rule_output: ruleAlert ? `${flaggedCount} flagged flow(s)` : 'No flagged flows',
    rule_severity: ruleAlert ? 'High' : 'Low',
  };
}

export function buildUploadedRuleComparison(analysis) {
  if (!analysis) return null;
  if (analysis.packet_attribution) return buildPcapRuleComparison(analysis);

  const sequence = analysis.input?.sequence || [];
  const latest = sequence[sequence.length - 1] || [];
  const featureNames = analysis.features || [];
  const values = Object.fromEntries(featureNames.map((name, index) => [name, Number(latest[index]) || 0]));
  const modelItem = analysis.world_model?.rollout?.[0] || {};
  const probability = Number(modelItem.risk_probability ?? 0);
  const modelAlert = Boolean(modelItem.predicted_attack) || probability >= 0.08;
  const ruleSignals = [
    values.Flow_Count > 30,
    values.Total_Packets > 1000,
    values.Total_Bytes > 500000,
    values.Flow_Count_Change > 20,
    values.Total_Packets_Change > 500,
  ];
  const triggeredRules = ruleSignals.filter(Boolean).length;
  const ruleAlert = triggeredRules > 0;
  const disagreement = modelAlert !== ruleAlert;

  return {
    total_disagreements: disagreement ? 1 : 0,
    disagreements: disagreement ? [{
      id: 'csv-disagreement-1',
      timestamp: new Date().toISOString(),
      model_prediction: modelAlert ? 'Early Warning' : 'No Early Warning',
      model_confidence: probability,
      model_architecture: 'CTU13 LSTM',
      rule_name: 'CSV Feature Threshold Rules',
      rule_output: `${triggeredRules} feature rule(s) triggered`,
      rule_severity: ruleAlert ? 'High' : 'Low',
      status: 'Disagreement',
      why_it_matters: 'The uploaded CSV model result differs from deterministic thresholds applied to its latest feature state.',
      observed_signals: Object.entries(values).filter(([, value]) => value > 0).slice(0, 5).map(([name, value]) => `${name}=${value}`),
      network_context: 'Uploaded CSV telemetry',
      recommended_action: 'Review the latest CSV feature state and model forecast window.',
      target_node: 'Uploaded CSV',
    }] : [],
    analytical_summary: disagreement
      ? 'The CTU13 model and deterministic CSV feature rules disagree for this uploaded file.'
      : `The CTU13 model and deterministic CSV feature rules agree: ${modelAlert ? 'both indicate elevated activity.' : 'neither indicates elevated activity.'}`,
    last_updated: new Date().toISOString(),
    model_alert: modelAlert,
    rule_alert: ruleAlert,
    flagged_flow_count: triggeredRules,
    model_prediction: modelAlert ? 'Early Warning' : 'No Early Warning',
    rule_output: `${triggeredRules} feature rule(s) triggered`,
    rule_severity: ruleAlert ? 'High' : 'Low',
  };
}

export function PcapAnalysisProvider({ children }) {
  const [analysis, setAnalysis] = useState(null);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function uploadPcap(file) {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(API_URL, { method: 'POST', body: formData });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        throw new Error(data?.detail || `Upload failed with HTTP ${response.status}.`);
      }
      setAnalysis(data);
      setFileName(file.name);

      const comparison = buildUploadedRuleComparison(data);
      if (comparison) {
        const item = comparison.disagreements[0] || {
          model_prediction: comparison.model_prediction,
          model_confidence: data.world_model?.rollout?.[0]?.risk_probability || 0,
          rule_output: comparison.rule_output,
          rule_severity: comparison.rule_severity,
          observed_signals: [],
        };
        try {
          await createBlockchainDisagreement({
            event_id: `${file.name}-${Date.now()}`.replace(/[^a-zA-Z0-9_-]/g, '_'),
            network_state_id: `${file.name}:latest-window`,
            prediction_id: `${file.name}:world-model:${Date.now()}`,
            ai_label: item.model_prediction,
            ai_confidence: Number(item.model_confidence) || 0,
            ai_threshold: 0.08,
            rule_id: comparison.rule_alert ? 'uploaded-flow-or-feature-thresholds' : 'uploaded-no-rule-trigger',
            rule_output: item.rule_output,
            rule_severity: item.rule_severity,
            disagreement_type: comparison.total_disagreements > 0 ? 'MODEL_RULE_DECISION_MISMATCH' : 'MODEL_RULE_AGREEMENT',
            severity: item.rule_severity,
            evidence: {
              filename: file.name,
              model: data.world_model?.rollout?.[0] || null,
              packet_attribution: data.packet_attribution || null,
              input: data.input || null,
            },
          });
        } catch (ledgerError) {
          console.warn('Disagreement could not be written to the audit ledger:', ledgerError);
        }
      }
    } catch (uploadError) {
      setError(uploadError.message || 'Unable to analyze this PCAP.');
    } finally {
      setLoading(false);
    }
  }

  function clearPcap() {
    setAnalysis(null);
    setFileName('');
    setError('');
  }

  const value = useMemo(() => ({ analysis, fileName, loading, error, uploadPcap, clearPcap }), [analysis, fileName, loading, error]);
  return <PcapAnalysisContext.Provider value={value}>{children}</PcapAnalysisContext.Provider>;
}

export function usePcapAnalysis() {
  const context = useContext(PcapAnalysisContext);
  if (!context) throw new Error('usePcapAnalysis must be used inside PcapAnalysisProvider');
  return context;
}
