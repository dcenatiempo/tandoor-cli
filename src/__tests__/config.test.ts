import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { loadConfig, readConfigFile } from '../config';

// The module-level singleton fires at import time with whatever env is set then.
// We test loadConfig() directly — it reads process.env at call time, so we can
// control behavior by setting env before each call.

describe('loadConfig()', () => {
  const originalEnv = process.env;
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    process.env = { ...originalEnv };
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((_code?: number) => {
      throw new Error(`process.exit(${_code})`);
    });
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('exits with code 1 when TANDOOR_URL is missing', () => {
    delete process.env.TANDOOR_URL;
    delete process.env.TANDOOR_API_TOKEN;
    expect(() => loadConfig()).toThrow('process.exit(1)');
  });

  it('prints a descriptive message when TANDOOR_URL is missing', () => {
    delete process.env.TANDOOR_URL;
    delete process.env.TANDOOR_API_TOKEN;
    try { loadConfig(); } catch { /* expected */ }
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('TANDOOR_URL'));
  });

  it('strips a single trailing slash from TANDOOR_URL', () => {
    process.env.TANDOOR_URL = 'http://localhost:8050/';
    process.env.TANDOOR_API_TOKEN = 'tok';
    expect(loadConfig().baseUrl).toBe('http://localhost:8050');
  });

  it('strips multiple trailing slashes from TANDOOR_URL', () => {
    process.env.TANDOOR_URL = 'http://localhost:8050///';
    process.env.TANDOOR_API_TOKEN = 'tok';
    expect(loadConfig().baseUrl).toBe('http://localhost:8050');
  });

  it('leaves a URL without trailing slash unchanged', () => {
    process.env.TANDOOR_URL = 'http://localhost:8050';
    process.env.TANDOOR_API_TOKEN = 'tok';
    expect(loadConfig().baseUrl).toBe('http://localhost:8050');
  });

  it('uses Bearer token when TANDOOR_API_TOKEN is set', () => {
    process.env.TANDOOR_URL = 'http://localhost:8050';
    process.env.TANDOOR_API_TOKEN = 'mytoken123';
    const cfg = loadConfig();
    expect(cfg.authHeader).toBe('Bearer mytoken123');
    expect(cfg.authType).toBe('token');
  });

  it('falls back to Basic auth when only username/password are set', () => {
    process.env.TANDOOR_URL = 'http://localhost:8050';
    delete process.env.TANDOOR_API_TOKEN;
    process.env.TANDOOR_USERNAME = 'alice';
    process.env.TANDOOR_PASSWORD = 'secret';
    const cfg = loadConfig();
    const expected = 'Basic ' + Buffer.from('alice:secret').toString('base64');
    expect(cfg.authHeader).toBe(expected);
    expect(cfg.authType).toBe('basic');
  });

  it('prefers token over username/password when both are set', () => {
    process.env.TANDOOR_URL = 'http://localhost:8050';
    process.env.TANDOOR_API_TOKEN = 'preferme';
    process.env.TANDOOR_USERNAME = 'alice';
    process.env.TANDOOR_PASSWORD = 'secret';
    const cfg = loadConfig();
    expect(cfg.authHeader).toBe('Bearer preferme');
    expect(cfg.authType).toBe('token');
  });

  it('exits with code 1 when no credentials are present', () => {
    process.env.TANDOOR_URL = 'http://localhost:8050';
    delete process.env.TANDOOR_API_TOKEN;
    delete process.env.TANDOOR_USERNAME;
    delete process.env.TANDOOR_PASSWORD;
    expect(() => loadConfig()).toThrow('process.exit(1)');
  });

  it('prints instructions to set TANDOOR_API_TOKEN when no credentials are present', () => {
    process.env.TANDOOR_URL = 'http://localhost:8050';
    delete process.env.TANDOOR_API_TOKEN;
    delete process.env.TANDOOR_USERNAME;
    delete process.env.TANDOOR_PASSWORD;
    try { loadConfig(); } catch { /* expected */ }
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('TANDOOR_API_TOKEN'));
  });
});

describe('config file fallback behavior', () => {
  const originalEnv = process.env;
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let tmpDir: string;

  beforeEach(() => {
    process.env = { ...originalEnv };
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((_code?: number) => {
      throw new Error(`process.exit(${_code})`);
    });
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tandoor-test-'));
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // readConfigFile() tests
  it('readConfigFile() returns null when file does not exist', () => {
    const result = readConfigFile(path.join(tmpDir, 'nonexistent.json'));
    expect(result).toBeNull();
  });

  it('readConfigFile() returns null and warns on invalid JSON', () => {
    const filePath = path.join(tmpDir, 'config.json');
    fs.writeFileSync(filePath, '{ not valid json }');
    const result = readConfigFile(filePath);
    expect(result).toBeNull();
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('invalid JSON'));
  });

  it('readConfigFile() returns { url, token } for a valid file', () => {
    const filePath = path.join(tmpDir, 'config.json');
    const data = { url: 'http://localhost:8050', token: 'mytoken' };
    fs.writeFileSync(filePath, JSON.stringify(data));
    const result = readConfigFile(filePath);
    expect(result).toEqual(data);
  });

  // loadConfig() config file fallback tests
  it('loadConfig() uses config file URL when TANDOOR_URL env var is absent', () => {
    delete process.env.TANDOOR_URL;
    process.env.TANDOOR_API_TOKEN = 'tok';
    const filePath = path.join(tmpDir, 'config.json');
    fs.writeFileSync(filePath, JSON.stringify({ url: 'http://from-file:8050', token: 'tok' }));
    const cfg = loadConfig(filePath);
    expect(cfg.baseUrl).toBe('http://from-file:8050');
  });

  it('loadConfig() uses config file token when TANDOOR_API_TOKEN env var is absent', () => {
    process.env.TANDOOR_URL = 'http://localhost:8050';
    delete process.env.TANDOOR_API_TOKEN;
    delete process.env.TANDOOR_USERNAME;
    delete process.env.TANDOOR_PASSWORD;
    const filePath = path.join(tmpDir, 'config.json');
    fs.writeFileSync(filePath, JSON.stringify({ url: 'http://localhost:8050', token: 'file-token' }));
    const cfg = loadConfig(filePath);
    expect(cfg.authHeader).toBe('Bearer file-token');
    expect(cfg.authType).toBe('token');
  });

  it('loadConfig() prefers env var URL over config file URL', () => {
    process.env.TANDOOR_URL = 'http://env-url:9000';
    process.env.TANDOOR_API_TOKEN = 'tok';
    const filePath = path.join(tmpDir, 'config.json');
    fs.writeFileSync(filePath, JSON.stringify({ url: 'http://file-url:8050', token: 'file-tok' }));
    const cfg = loadConfig(filePath);
    expect(cfg.baseUrl).toBe('http://env-url:9000');
  });

  it('loadConfig() prefers env var token over config file token', () => {
    process.env.TANDOOR_URL = 'http://localhost:8050';
    process.env.TANDOOR_API_TOKEN = 'env-token';
    const filePath = path.join(tmpDir, 'config.json');
    fs.writeFileSync(filePath, JSON.stringify({ url: 'http://localhost:8050', token: 'file-token' }));
    const cfg = loadConfig(filePath);
    expect(cfg.authHeader).toBe('Bearer env-token');
  });
});
