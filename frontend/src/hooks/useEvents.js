import { useState, useEffect, useCallback } from 'react';
import { getEvents } from '../services/api';

export function useEvents(filters = {}) {
  const [eventsData, setEventsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getEvents(filters);
      setEventsData(res);
    } catch (err) {
      console.error('Failed to fetch security events:', err);
      setError(err.message || 'Failed to stream telemetry events.');
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters)]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return { eventsData, loading, error, refetch: fetchEvents };
}
