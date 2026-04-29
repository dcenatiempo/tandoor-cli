import axios from 'axios';
import { config } from '../config';

// 3.3 CliError class with message, exitCode, and optional hint
export class CliError extends Error {
  constructor(
    message: string,
    public readonly exitCode: number = 1,
    public readonly hint?: string,
  ) {
    super(message);
    this.name = 'CliError';
  }
}

// 3.1 Axios instance with baseURL and auth header
// Use fallback empty string so module load doesn't crash in test environments
// where config is an empty object (VITEST guard in config.ts).
export const apiClient = axios.create({
  baseURL: `${config.baseUrl ?? ''}/api`,
  headers: { Authorization: config.authHeader ?? '' },
});

// 3.2 Response interceptor mapping HTTP/network errors to CliError
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response) {
      const status: number = err.response.status;

      if (status === 401) {
        return Promise.reject(
          new CliError(
            'Authentication failed. Check your TANDOOR_API_TOKEN or credentials.',
            1,
          ),
        );
      }

      if (status === 404) {
        return Promise.reject(
          new CliError('Not found: the requested resource does not exist.', 1),
        );
      }

      if (status === 400 || status === 422) {
        const body = err.response.data;
        const details =
          typeof body === 'string'
            ? body
            : JSON.stringify(body);
        return Promise.reject(
          new CliError(`Validation error: ${details}`, 1),
        );
      }

      if (status >= 500 && status <= 599) {
        return Promise.reject(
          new CliError(
            `Server error (${status}): the Tandoor instance returned an unexpected error.`,
            1,
          ),
        );
      }

      // Fallback for other HTTP errors
      return Promise.reject(
        new CliError(`HTTP error ${status}: ${err.message}`, 1),
      );
    }

    // Network error (no response received)
    const tandoorUrl = config.baseUrl ?? process.env.TANDOOR_URL ?? 'the server';
    return Promise.reject(
      new CliError(
        `Connection failed: could not reach ${tandoorUrl}. Is the instance running?`,
        1,
      ),
    );
  },
);
