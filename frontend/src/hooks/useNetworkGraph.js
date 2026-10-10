import { useState, useEffect, useCallback } from 'react';
import { getNetworkGraph, getNetworkActivity } from '../services/api';
import { buildPcapTopologyGraph, usePcapAnalysis } from '../context/PcapAnalysisContext';

export function useNetworkGraph() {
  const { analysis } = usePcapAnalysis();
  const [graph, setGraph] = useState(null);
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchGraph = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [gRes, aRes] = await Promise.all([
        getNetworkGraph(),
        getNetworkActivity(),
      ]);
      setGraph(buildPcapTopologyGraph(analysis?.packet_attribution) || gRes);
      setActivity(aRes);
    } catch (err) {
      console.error('Failed to fetch network graph:', err);
      setError(err.message || 'Failed to retrieve network topology.');
    } finally {
      setLoading(false);
    }
  }, [analysis]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  return { graph, activity, loading, error, refetch: fetchGraph };
}
