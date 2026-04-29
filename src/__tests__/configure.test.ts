import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as readline from 'readline';
import { Command } from 'commander';
import { writeConfigFile, registerConfigureCommand, RlFactory } from '../commands/configure';

// ---------------------------------------------------------------------------
// writeConfigFile() tests — use real filesystem (temp dir)
// ---------------------------------------------------------------------------

describe('writeConfigFile()', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tandoor-configure-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates parent directory if it does not exist', () => {
    const filePath = path.join(tmpDir, 'nested', 'deep', 'config.json');
    writeConfigFile(filePath, { url: 'http://localhost:8050', token: 'tok' });
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('writes file with mode 0600', () => {
    const filePath = path.join(tmpDir, 'config.json');
    writeConfigFile(filePath, { url: 'http://localhost:8050', token: 'tok' });
    const mode = fs.statSync(filePath).mode & 0o777;
    expect(mode).toBe(0o600);
  });

  it('writes valid JSON containing url and token', () => {
    const filePath = path.join(tmpDir, 'config.json');
    const data = { url: 'http://localhost:8050', token: 'mytoken123' };
    writeConfigFile(filePath, data);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as { url: string; token: string };
    expect(parsed.url).toBe(data.url);
    expect(parsed.token).toBe(data.token);
  });

  it('propagates error on permission failure', () => {
    // Create a read-only directory so writing inside it fails
    const roDir = path.join(tmpDir, 'readonly');
    fs.mkdirSync(roDir);
    fs.chmodSync(roDir, 0o555); // r-xr-xr-x — no write permission

    const filePath = path.join(roDir, 'config.json');
    expect(() => writeConfigFile(filePath, { url: 'http://x', token: 't' })).toThrow();

    // Restore permissions so cleanup can remove the dir
    fs.chmodSync(roDir, 0o755);
  });
});

// ---------------------------------------------------------------------------
// registerConfigureCommand() tests — inject a mock readline factory
// ---------------------------------------------------------------------------

/**
 * Creates a mock readline.Interface that returns the given answers in order.
 * Each call to rl.question() resolves with the next answer.
 */
function makeMockRl(answers: string[]) {
  let callIndex = 0;
  const questionMock = vi.fn((_prompt: string, callback: (answer: string) => void) => {
    callback(answers[callIndex++] ?? '');
  });
  const closeMock = vi.fn();
  const rl = { question: questionMock, close: closeMock } as unknown as readline.Interface;
  return { rl, questionMock, closeMock };
}

describe('registerConfigureCommand()', () => {
  let tmpDir: string;
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tandoor-configure-cmd-test-'));
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((_code?: number) => {
      throw new Error(`process.exit(${_code})`);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('prompts for URL and token and writes config file', async () => {
    const configFilePath = path.join(tmpDir, 'config.json');
    const { rl: mockRl } = makeMockRl(['http://localhost:8050', 'mytoken']);

    const rlFactory: RlFactory = () => mockRl;

    const program = new Command();
    registerConfigureCommand(program, configFilePath, rlFactory);
    await program.parseAsync(['node', 'tandoor', 'configure']);

    expect(fs.existsSync(configFilePath)).toBe(true);
    const parsed = JSON.parse(fs.readFileSync(configFilePath, 'utf-8')) as {
      url: string;
      token: string;
    };
    expect(parsed.url).toBe('http://localhost:8050');
    expect(parsed.token).toBe('mytoken');
    expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining(configFilePath));
  });

  it('pre-fills prompts with existing config values when config file exists', async () => {
    const configFilePath = path.join(tmpDir, 'config.json');

    // Write an existing config file
    fs.writeFileSync(
      configFilePath,
      JSON.stringify({ url: 'http://existing:8050', token: 'existingtoken' }),
      { mode: 0o600 },
    );

    // User presses Enter (empty input) to accept existing values
    const { rl: mockRl, questionMock } = makeMockRl(['', '']);
    const rlFactory: RlFactory = () => mockRl;

    const program = new Command();
    registerConfigureCommand(program, configFilePath, rlFactory);
    await program.parseAsync(['node', 'tandoor', 'configure']);

    // Verify the prompts showed the existing values as defaults
    const urlPromptCall = questionMock.mock.calls[0];
    expect(urlPromptCall[0]).toContain('http://existing:8050');

    const tokenPromptCall = questionMock.mock.calls[1];
    expect(tokenPromptCall[0]).toContain('existing token');

    // Verify the written file still has the existing values (user accepted defaults)
    const parsed = JSON.parse(fs.readFileSync(configFilePath, 'utf-8')) as {
      url: string;
      token: string;
    };
    expect(parsed.url).toBe('http://existing:8050');
    expect(parsed.token).toBe('existingtoken');
  });
});
