import { useState, useEffect, useCallback } from 'react';
import { getIncidents, getIncident } from '../services/api';

export function useIncidents() {
  const [incidentsData, setIncidentsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getIncidents();
      setIncidentsData(res);
    } catch (err) {
      console.error('Failed to fetch incidents:', err);
      setError(err.message || 'Failed to load incident log.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  return { incidentsData, loading, error, refetch: fetchIncidents };
}

export function useIncidentDetail(incidentId) {
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDetail = useCallback(async () => {
    if (!incidentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getIncident(incidentId);
      setIncident(res.incident);
    } catch (err) {
      console.error(`Failed to fetch incident ${incidentId}:`, err);
      setError(err.message || 'Failed to load incident detail.');
    } finally {
      setLoading(false);
    }
  }, [incidentId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  return { incident, loading, error, refetch: fetchDetail };
}
