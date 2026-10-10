import { useState, useEffect, useCallback } from 'react';
import { getDisagreements, getRules } from '../services/api';

export function useDisagreements() {
  const [disagreementsData, setDisagreementsData] = useState(null);
  const [rulesData, setRulesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dRes, rRes] = await Promise.all([
        getDisagreements(),
        getRules(),
      ]);
      setDisagreementsData(dRes);
      setRulesData(rRes);
    } catch (err) {
      console.error('Failed to fetch model-rule disagreements:', err);
      setError(err.message || 'Failed to analyze security rules.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { disagreementsData, rulesData, loading, error, refetch: fetchData };
}
