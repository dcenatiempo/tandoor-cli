import axios, { AxiosInstance } from 'axios';
import { loadConfig } from '../config';

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

// 3.1 Axios instance — created lazily on first use so that --version and
// --help don't trigger loadConfig() (and its credential checks) at startup.
let _apiClient: AxiosInstance | null = null;

export function getApiClient(): AxiosInstance {
  if (_apiClient) return _apiClient;
  const cfg = loadConfig();
  _apiClient = axios.create({
    baseURL: `${cfg.baseUrl}/api`,
    headers: { Authorization: cfg.authHeader },
  });

  // 3.2 Response interceptor mapping HTTP/network errors to CliError
  _apiClient.interceptors.response.use(
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
      const tandoorUrl = cfg.baseUrl ?? process.env.TANDOOR_URL ?? 'the server';
      return Promise.reject(
        new CliError(
          `Connection failed: could not reach ${tandoorUrl}. Is the instance running?`,
          1,
        ),
      );
    },
  );

  return _apiClient;
}

// Proxy so existing callers using `apiClient.get(...)` etc. still work,
// but the real instance (and loadConfig) is only created on first API call.
export const apiClient = new Proxy({} as AxiosInstance, {
  get(_target, prop) {
    return (getApiClient() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
