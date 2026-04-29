/**
 * Property-Based Tests for tandoor-cli npm publish preparation.
 * Properties 1–3 from the design document (npm-publish feature).
 * Uses fast-check with a minimum of 100 runs per property.
 *
 * Feature: tandoor-cli-npm-publish
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Command } from 'commander';
import { writeConfigFile } from '../commands/configure';
import { readConfigFile, loadConfig } from '../config';
import { normalizeUrl } from '../utils';

// ---------------------------------------------------------------------------
// Property 1: Version round-trip — package.json is the single source of truth
// Feature: tandoor-cli-npm-publish, Property 1: version round-trip
// Validates: Requirements 5.1, 5.2
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('../../package.json') as { version: string };

describe('Property 1: Version round-trip', () => {
  it('pkg.version from package.json is a valid semver string', () => {
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('any semver string passed to program.version() is returned unchanged by program.version()', () => {
    /**
     * Validates: Requirements 5.1, 5.2
     *
     * For any semver string, Commander's .version() getter returns exactly
     * the string that was passed to .version() setter — no transformation.
     */
    fc.assert(
      fc.property(
        fc.stringMatching(/^\d+\.\d+\.\d+$/),
        (version) => {
          const program = new Command();
          program.version(version);
          expect(program.version()).toBe(version);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 2: Config file write/read round-trip preserves URL and token
// Feature: tandoor-cli-npm-publish, Property 2: config file write/read round-trip
// Validates: Requirements 6.2, 6.3
// ---------------------------------------------------------------------------

describe('Property 2: Config file write/read round-trip', () => {
  let tmpDir: string;
  let configFilePath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tandoor-pbt-roundtrip-'));
    configFilePath = path.join(tmpDir, 'config.json');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writeConfigFile then readConfigFile returns the original URL and token', () => {
    /**
     * Validates: Requirements 6.2, 6.3
     *
     * For any valid URL and non-empty token, writing to the config file and
     * reading it back must return the exact same values.
     */
    fc.assert(
      fc.property(
        fc.webUrl(),
        fc.string({ minLength: 1, maxLength: 64 }).filter(s => s.trim().length > 0),
        (url, token) => {
          writeConfigFile(configFilePath, { url, token });
          const result = readConfigFile(configFilePath);
          expect(result?.url).toBe(url);
          expect(result?.token).toBe(token);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 3: Environment variable always takes precedence over config file
// Feature: tandoor-cli-npm-publish, Property 3: env var precedence over config file
// Validates: Requirements 6.4, 9.5
// ---------------------------------------------------------------------------

describe('Property 3: Env var precedence over config file', () => {
  let tmpDir: string;
  let configFilePath: string;
  const originalEnv = process.env;
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tandoor-pbt-precedence-'));
    configFilePath = path.join(tmpDir, 'config.json');
    process.env = { ...originalEnv };
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((_code?: number) => {
      throw new Error(`process.exit(${_code})`);
    });
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('loadConfig() returns env var values when both env vars and config file are set', () => {
    /**
     * Validates: Requirements 6.4, 9.5
     *
     * For any env var URL/token and config file URL/token (with different values),
     * loadConfig() must always return the env var values, not the config file values.
     */
    fc.assert(
      fc.property(
        fc.webUrl(),
        fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
        fc.webUrl(),
        fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
        (envUrl, envToken, fileUrl, fileToken) => {
          // Write config file with different values
          writeConfigFile(configFilePath, { url: fileUrl, token: fileToken });

          // Set env vars
          process.env.TANDOOR_URL = envUrl;
          process.env.TANDOOR_API_TOKEN = envToken;

          const cfg = loadConfig(configFilePath);

          expect(cfg.baseUrl).toBe(normalizeUrl(envUrl));
          expect(cfg.authHeader).toBe(`Bearer ${envToken}`);
          expect(cfg.authType).toBe('token');
        },
      ),
      { numRuns: 100 },
    );
  });
});
