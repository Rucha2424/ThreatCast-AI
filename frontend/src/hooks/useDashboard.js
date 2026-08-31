import { useState, useEffect, useCallback } from 'react';
import { getDashboardSummary, getDashboardKpis } from '../services/api';

export function useDashboard() {
  const [summary, setSummary] = useState(null);
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
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
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return { summary, kpis, loading, error, refetch: fetchDashboard };
}
