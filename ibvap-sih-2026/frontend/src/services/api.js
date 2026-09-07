const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error?.message || 'API Error');
  }
  return response.json();
};

export const getHealth = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    return await handleResponse(response);
  } catch (error) {
    return { status: 'offline' };
  }
};

export const getCameras = async () => {
  const response = await fetch(`${API_BASE_URL}/api/cameras/`);
  return handleResponse(response);
};

export const getEvents = async () => {
  const response = await fetch(`${API_BASE_URL}/api/events/`);
  return handleResponse(response);
};

export const getZones = async () => {
  const response = await fetch(`${API_BASE_URL}/api/zones/`);
  return handleResponse(response);
};
