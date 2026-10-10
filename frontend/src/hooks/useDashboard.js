import { useState, useEffect, useCallback } from 'react';
import { getDashboardSummary, getDashboardKpis } from '../services/api';
import { buildPcapTopologyGraph, buildUploadedRuleComparison, usePcapAnalysis } from '../context/PcapAnalysisContext';

export function useDashboard() {
  const { analysis, fileName } = usePcapAnalysis();
  const [summary, setSummary] = useState(null);
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (analysis) {
        const first = analysis.world_model?.rollout?.[0] || {};
        const probability = Number(first.risk_probability ?? 0);
        const ruleComparison = buildUploadedRuleComparison(analysis);
        const flaggedFlows = Number(ruleComparison?.flagged_flow_count ?? analysis.packet_attribution?.flagged_flow_count ?? 0);
        const graph = buildPcapTopologyGraph(analysis.packet_attribution);
        const warning = Boolean(first.predicted_attack) || probability >= 0.08;
        const percent = `${(probability * 100).toFixed(2)}%`;
        const timestamp = new Date().toISOString();
        setSummary({
          threat_level: probability >= 0.8 ? 'CRITICAL' : probability >= 0.08 ? 'HIGH' : 'LOW',
          threat_score: Math.round(probability * 100),
          current_stage: warning ? 'Early Warning' : 'Normal Network State',
          current_stage_tactic: 'PCAP-derived telemetry',
          next_predicted_stage: first.horizon || 'T+1',
          next_predicted_tactic: 'PCAP upload',
          forecast_confidence: probability,
          forecast_horizon: `${analysis.sequence_length || 5} x 30-second states`,
          recommended_action: warning ? 'Investigate flagged flows from the uploaded PCAP.' : 'Continue monitoring the uploaded PCAP assessment.',
          system_status: `Uploaded PCAP: ${fileName}`,
          active_threat_count: flaggedFlows,
          high_risk_node_count: graph?.high_risk_nodes_count || 0,
          disagreement_detected: false,
          disagreement_count: 0,
          last_updated: timestamp,
          active_scenario: 'uploaded_pcap',
        });
        setKpis({
          cards: [
            { id: 'kpi-threats', label: 'Active Threats', value: `${flaggedFlows} Active`, context: 'Flagged flows in uploaded PCAP', trend: { direction: flaggedFlows ? 'up' : 'neutral', value: fileName }, status: flaggedFlows ? 'danger' : 'safe' },
            { id: 'kpi-forecast', label: 'Early Warnings', value: `${warning ? 1 : 0} Warning${warning ? '' : 's'}`, context: 'Uploaded PCAP forecast', trend: { direction: warning ? 'up' : 'neutral', value: `${percent} probability` }, status: warning ? 'warning' : 'safe' },
            { id: 'kpi-nodes', label: 'High-Risk Nodes', value: `${graph?.high_risk_nodes_count || 0} Assets`, context: 'Derived from uploaded PCAP flows', trend: { direction: 'neutral', value: 'PCAP topology' }, status: graph?.high_risk_nodes_count ? 'danger' : 'safe' },
            { id: 'kpi-confidence', label: 'Forecast Confidence', value: percent, context: 'Uploaded PCAP world model', trend: { direction: warning ? 'up' : 'neutral', value: warning ? 'Above threshold' : 'Below threshold' }, status: warning ? 'warning' : 'safe' },
            { id: 'kpi-disagreement', label: 'Model-Rule Disagreements', value: 'PCAP', context: 'Not evaluated for uploaded capture', trend: { direction: 'neutral', value: 'Awaiting PCAP rule mapping' }, status: 'safe' },
          ],
          last_updated: timestamp,
        });
        return;
      }
      const [sumRes, kpiRes] = await Promise.all([
        getDashboardSummary(),
        getDashboardKpis(),
      ]);
      setSummary(sumRes);
      setKpis(kpiRes);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err.message || 'Unable to connect to ThreatCast AI engine.');
    } finally {
      setLoading(false);
    }
  }, [analysis, fileName]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return { summary, kpis, loading, error, refetch: fetchDashboard };
}
