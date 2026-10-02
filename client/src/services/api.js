/**
 * Base API Service configuration for SkillUp.
 *
 * In development, requests to '/api' are proxied to the Express backend via vite.config.js.
 * In production or custom environments, VITE_API_URL specifies the backend base origin.
 * All requests include credentials to send and receive httpOnly authentication cookies.
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const { timeoutMs = 15000, ...fetchOptions } = options;
  const headers = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers || {}),
  };

  let response;
  try {
    response = await fetch(url, {
      ...fetchOptions,
      headers,
      credentials: 'include', // Ensure cookies are sent and received
      signal: fetchOptions.signal || AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw err;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.message || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

/**
 * Health check endpoint
 */
export async function checkHealth() {
  return apiRequest('/api/health', { method: 'GET' });
}

/**
 * Authentication API
 */
export async function register(userData) {
  return apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
}

export async function login(credentials) {
  return apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

export async function getMe() {
  return apiRequest('/api/auth/me', { method: 'GET' });
}

export async function logout() {
  return apiRequest('/api/auth/logout', { method: 'POST' });
}

/**
 * Student Profile API
 */
export async function getProfile() {
  return apiRequest('/api/profile', { method: 'GET' });
}

export async function updateProfile(profileData) {
  return apiRequest('/api/profile', {
    method: 'PUT',
    body: JSON.stringify(profileData),
  });
}

/**
 * Learning Resource Discovery API (Milestone 3)
 */
export async function getRecommendations(searchParams) {
  return apiRequest('/api/learn/recommend', {
    method: 'POST',
    body: JSON.stringify(searchParams),
  });
}

/**
 * Personalized Learning Tracks API (Milestone 4)
 */
export async function generateTrackPreview(payload) {
  return apiRequest('/api/tracks/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function createTrack(payload) {
  return apiRequest('/api/tracks', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getTracks() {
  return apiRequest('/api/tracks', {
    method: 'GET',
  });
}

export async function getTrackById(trackId) {
  return apiRequest(`/api/tracks/${trackId}`, {
    method: 'GET',
  });
}

export async function updateTrackTask(trackId, taskId, completed) {
  return apiRequest(`/api/tracks/${trackId}/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify({ completed }),
  });
}

/**
 * Opportunity Discovery API (Milestone 5)
 */
export async function getOpportunities(params = {}) {
  const searchParams = new URLSearchParams();
  if (params.type && params.type !== 'All') {
    searchParams.set('type', params.type);
  }
  if (params.search && params.search.trim()) {
    searchParams.set('search', params.search.trim());
  }
  if (params.recommended !== undefined) {
    searchParams.set('recommended', String(params.recommended));
  }
  if (params.includeExpired !== undefined) {
    searchParams.set('includeExpired', String(params.includeExpired));
  }
  const queryString = searchParams.toString();
  const endpoint = queryString ? `/api/opportunities?${queryString}` : '/api/opportunities';
  return apiRequest(endpoint, { method: 'GET' });
}

export async function getOpportunityById(opportunityId) {
  return apiRequest(`/api/opportunities/${opportunityId}`, {
    method: 'GET',
  });
}

export default {
  checkHealth,
  register,
  login,
  getMe,
  logout,
  getProfile,
  updateProfile,
  getRecommendations,
  generateTrackPreview,
  createTrack,
  getTracks,
  getTrackById,
  updateTrackTask,
  getOpportunities,
  getOpportunityById,
};

