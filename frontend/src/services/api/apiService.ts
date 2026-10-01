import axios from 'axios';
import { API_BASE_URL } from './ideWebSocket';

/**
 * One axios instance for the whole app.
 *
 * The base URL is configurable via `VITE_API_URL` and falls back to
 * `http://127.0.0.1:3001/api`, matching the backend default.
 */
export const apiService = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

/** Extracts a human-readable message from a backend error response. */
export function apiErrorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (typeof error === 'object' && error !== null) {
    const axiosError = error as {
      response?: { data?: { error?: { message?: string; code?: string } } };
      code?: string;
      message?: string;
    };
    const message = axiosError.response?.data?.error?.message;
    if (typeof message === 'string' && message.length > 0) return message;
    if (axiosError.code === 'ECONNABORTED') return 'The backend took too long to respond.';
    if (axiosError.code === 'ERR_NETWORK') {
      return 'Cannot reach the IDE backend. Is it running? Start it with `npm run dev:backend`.';
    }
    if (axiosError.message && axiosError.message !== 'Network Error') return axiosError.message;
  }
  return fallback;
}

/** The backend's uniform envelope: `{ success, data, error }`. */
export async function unwrap<T>(promise: Promise<{ data: { data: T } }>): Promise<T> {
  const response = await promise;
  return response.data.data;
}
