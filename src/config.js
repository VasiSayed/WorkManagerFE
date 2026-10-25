const rawApiBase = String(import.meta.env.VITE_API_BASE_URL || '').trim();

export const API_BASE_URL = rawApiBase.replace(/\/$/, '');

export function requireApiBaseUrl() {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL is not configured. Add it to frontend/.env before starting the app.');
  }
  return API_BASE_URL;
}
