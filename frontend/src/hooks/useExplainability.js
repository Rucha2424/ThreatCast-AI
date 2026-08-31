import { useState, useEffect, useCallback } from 'react';
import { getExplainability } from '../services/api';

export function useExplainability(incidentId = 'INC-8042') {
  const [explainData, setExplainData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchExplainability = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getExplainability(incidentId);
      setExplainData(res);
    } catch (err) {
      console.error(`Failed to fetch explainability for ${incidentId}:`, err);
      setError(err.message || 'Failed to retrieve AI explainability telemetry.');
    } finally {
      setLoading(false);
    }
  }, [incidentId]);

  useEffect(() => {
    fetchExplainability();
  }, [fetchExplainability]);

  return { explainData, loading, error, refetch: fetchExplainability };
}
