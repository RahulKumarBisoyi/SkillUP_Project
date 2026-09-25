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
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Ensure cookies are sent and received
  });

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

export default {
  checkHealth,
  register,
  login,
  getMe,
  logout,
  getProfile,
  updateProfile,
};
