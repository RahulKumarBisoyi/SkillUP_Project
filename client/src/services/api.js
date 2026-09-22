/**
 * Base API Service configuration.
 *
 * In development, requests to '/api' are proxied to the backend via vite.config.js.
 * In production or custom environments, VITE_API_URL can specify the backend base origin.
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Perform a health check call against the backend API.
 * @returns {Promise<{status: string, message: string, timestamp?: string}>}
 */
export async function checkHealth() {
  const response = await fetch(`${API_BASE_URL}/api/health`);
  if (!response.ok) {
    throw new Error(`Health check failed with status: ${response.status}`);
  }
  return response.json();
}

export default {
  checkHealth,
};
