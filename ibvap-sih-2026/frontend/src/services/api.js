const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

const handleResponse = async (response) => {
  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.detail || error?.error?.message || 'API Error');
  }
  return response.json();
};

export const fetchWithAuth = async (endpoint, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...options.headers,
  };
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
  
  return handleResponse(response);
};

// --- AUTHENTICATION ---
export const login = async (username, password) => {
  // OAuth2 requires form data
  const formData = new URLSearchParams();
  formData.append('username', username);
  formData.append('password', password);

  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData,
  });
  return handleResponse(response);
};

export const getCurrentUser = () => {
  return fetchWithAuth('/api/auth/me');
};

export const getHealth = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    return await handleResponse(response);
  } catch (error) {
    return { status: 'offline' };
  }
};

// --- CAMERAS ---
export const getCameras = () => fetchWithAuth('/api/cameras/');
export const getCamera = (id) => fetchWithAuth(`/api/cameras/${id}`);
export const addCamera = (data) => fetchWithAuth('/api/cameras/', { method: 'POST', body: JSON.stringify(data) });

// --- EVENTS ---
export const getEvents = () => fetchWithAuth('/api/events/');
export const getEvent = (id) => fetchWithAuth(`/api/events/${id}`);
export const reviewEvent = (id, status, notes = "") => 
  fetchWithAuth(`/api/events/${id}/review`, { method: 'PATCH', body: JSON.stringify({ status, notes }) });

// --- ZONES ---
export const getZones = () => fetchWithAuth('/api/zones/');
export const getZone = (id) => fetchWithAuth(`/api/zones/${id}`);

// --- ALERTS ---
export const getAlerts = () => fetchWithAuth('/api/alerts/');
export const getAlert = (id) => fetchWithAuth(`/api/alerts/${id}`);
export const acknowledgeAlert = (id) => fetchWithAuth(`/api/alerts/${id}/acknowledge`, { method: 'POST' });
export const resolveAlert = (id, notes = "") => fetchWithAuth(`/api/alerts/${id}/resolve`, { method: 'POST', body: JSON.stringify({ notes }) });

// --- ANALYTICS ---
export const getAnalyticsSummary = () => fetchWithAuth('/api/analytics/summary');
export const getAnalyticsEvents = () => fetchWithAuth('/api/analytics/events');
export const getAnalyticsTrends = () => fetchWithAuth('/api/analytics/events/trends');
export const getAnalyticsAlerts = () => fetchWithAuth('/api/analytics/alerts');

// --- EVIDENCE ---
export const fetchEvidenceBlob = async (path) => {
  const response = await fetch(`${API_BASE_URL}/api/evidence/snapshots/${path}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to fetch evidence');
  }
  return response.blob();
};
