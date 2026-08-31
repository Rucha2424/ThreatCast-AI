import { useState, useEffect, useCallback } from 'react';
import { getForecast, getForecastComparison } from '../services/api';

export function useForecast() {
  const [forecast, setForecast] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchForecast = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fRes, cRes] = await Promise.all([
        getForecast(),
        getForecastComparison(),
      ]);
      setForecast(fRes);
      setComparison(cRes);
    } catch (err) {
      console.error('Failed to fetch forecast data:', err);
      setError(err.message || 'Failed to load attack forecast projections.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchForecast();
  }, [fetchForecast]);

  return { forecast, comparison, loading, error, refetch: fetchForecast };
}
