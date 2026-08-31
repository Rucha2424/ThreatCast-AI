import axios from 'axios';

// Resolve base URL from environment or default to local backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Response interceptor for consistent error extraction
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const errorMsg =
      error.response?.data?.detail ||
      error.message ||
      'Failed to communicate with ThreatCast AI backend.';
    console.error(`[API Error] ${error.config?.url}:`, errorMsg);
    return Promise.reject(new Error(errorMsg));
  }
);

// -----------------------------------------------------------------------------
// System & Health
// -----------------------------------------------------------------------------
export const getHealth = () => apiClient.get('/api/health');

// -----------------------------------------------------------------------------
// Dashboard & Executive Metrics
// -----------------------------------------------------------------------------
export const getDashboardSummary = () => apiClient.get('/api/dashboard/summary');
export const getDashboardKpis = () => apiClient.get('/api/dashboard/kpis');

// -----------------------------------------------------------------------------
// Telemetry & Security Events
// -----------------------------------------------------------------------------
export const getEvents = (params = {}) => apiClient.get('/api/events', { params });

// -----------------------------------------------------------------------------
// Network Topology & Activity
// -----------------------------------------------------------------------------
export const getNetworkGraph = () => apiClient.get('/api/network/graph');
export const getNetworkActivity = () => apiClient.get('/api/network/activity');

// -----------------------------------------------------------------------------
// Attack Forecasting (K=3 Future States)
// -----------------------------------------------------------------------------
export const getForecast = () => apiClient.get('/api/forecast');
export const getForecastComparison = () => apiClient.get('/api/forecast/comparison');

// -----------------------------------------------------------------------------
// Security Rules & Model-Rule Disagreements
// -----------------------------------------------------------------------------
export const getRules = () => apiClient.get('/api/rules');
export const getDisagreements = () => apiClient.get('/api/disagreements');

// -----------------------------------------------------------------------------
// Incidents
// -----------------------------------------------------------------------------
export const getIncidents = () => apiClient.get('/api/incidents');
export const getIncident = (incidentId) => apiClient.get(`/api/incidents/${incidentId}`);

// -----------------------------------------------------------------------------
// Explainability
// -----------------------------------------------------------------------------
export const getExplainability = (incidentId = 'INC-8042') =>
  apiClient.get(`/api/explainability/${incidentId}`);

// -----------------------------------------------------------------------------
// Demo Attack Simulation
// -----------------------------------------------------------------------------
export const simulateAttack = (scenario = 'lateral_movement_wave') =>
  apiClient.post('/api/demo/simulate-attack', { scenario });

export const resetSimulation = () => apiClient.post('/api/demo/reset');

export default {
  getHealth,
  getDashboardSummary,
  getDashboardKpis,
  getEvents,
  getNetworkGraph,
  getNetworkActivity,
  getForecast,
  getForecastComparison,
  getRules,
  getDisagreements,
  getIncidents,
  getIncident,
  getExplainability,
  simulateAttack,
  resetSimulation,
};
