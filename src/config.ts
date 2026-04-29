import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export interface ApiConfig {
  baseUrl: string;       // TANDOOR_URL, trailing slash stripped
  authHeader: string;    // "Bearer <token>" or "Basic <base64>"
  authType: 'token' | 'basic';
}

// Task 4.1: Internal helper — not exported
function getConfigFilePath(): string {
  const base = process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), '.config');
  return path.join(base, 'tandoor-cli', 'config.json');
}

// Task 4.2: Read and parse the config file; returns null on absence or invalid JSON
export function readConfigFile(filePath?: string): Partial<{ url: string; token: string }> | null {
  const resolvedPath = filePath ?? getConfigFilePath();
  let raw: string;
  try {
    raw = fs.readFileSync(resolvedPath, 'utf-8');
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    // Unexpected read error — treat as missing
    return null;
  }

  try {
    return JSON.parse(raw) as Partial<{ url: string; token: string }>;
  } catch {
    process.stderr.write(
      `Warning: Config file at ${resolvedPath} contains invalid JSON. Ignoring.\n`,
    );
    return null;
  }
}

// Task 4.3 & 4.4: Updated loadConfig with config file fallback and improved error messages
export function loadConfig(configFilePath?: string): ApiConfig {
  // Resolve URL: env var > config file > error
  const rawUrl = process.env.TANDOOR_URL ?? readConfigFile(configFilePath)?.url;
  if (!rawUrl) {
    process.stderr.write(
      'Error: TANDOOR_URL is not set. Run `tandoor configure` or set the TANDOOR_URL environment variable.\n',
    );
    process.exit(1);
  }

  const baseUrl = rawUrl.replace(/\/+$/, '');

  // Resolve token: env var > config file
  const token = process.env.TANDOOR_API_TOKEN ?? readConfigFile(configFilePath)?.token;
  if (token) {
    return {
      baseUrl,
      authHeader: `Bearer ${token}`,
      authType: 'token',
    };
  }

  // Fall back to basic auth (env-var only — not stored in config file)
  const username = process.env.TANDOOR_USERNAME;
  const password = process.env.TANDOOR_PASSWORD;
  if (username && password) {
    const encoded = Buffer.from(`${username}:${password}`).toString('base64');
    return {
      baseUrl,
      authHeader: `Basic ${encoded}`,
      authType: 'basic',
    };
  }

  process.stderr.write(
    'Error: No authentication credentials found. Run `tandoor configure` to set your API token, or set TANDOOR_API_TOKEN environment variable.\n',
  );
  process.exit(1);
}

// No module-level singleton — loadConfig() is called lazily by getApiClient()
// so that --version and --help work without credentials being configured.
