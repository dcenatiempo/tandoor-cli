import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  resolveFormat,
  resolveInputFile,
  emitOutput,
  warnDeprecated,
} from '../output/format-option';

describe('resolveFormat()', () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit');
    }) as (code?: number) => never);
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to text', () => {
    expect(resolveFormat({})).toBe('text');
  });

  it('returns json when --format json', () => {
    expect(resolveFormat({ format: 'json' })).toBe('json');
  });

  it('maps deprecated --json to api with warning', () => {
    expect(resolveFormat({ json: true })).toBe('api');
    expect(stderrSpy).toHaveBeenCalled();
    const msg = stderrSpy.mock.calls.flat().join('');
    expect(msg).toContain('deprecated');
    expect(msg).toContain('--format api');
  });

  it('exits when --json conflicts with --format json', () => {
    expect(() => resolveFormat({ json: true, format: 'json' })).toThrow('process.exit');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('exits on invalid --format', () => {
    expect(() => resolveFormat({ format: 'xml' })).toThrow('process.exit');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});

describe('resolveInputFile()', () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit');
    }) as (code?: number) => never);
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prefers --file over --json', () => {
    expect(resolveInputFile({ file: 'a.json', json: 'a.json' })).toBe('a.json');
  });

  it('uses --json with deprecation warning when --file absent', () => {
    expect(resolveInputFile({ json: 'legacy.json' })).toBe('legacy.json');
    expect(stderrSpy).toHaveBeenCalled();
  });

  it('exits when --file and --json differ', () => {
    expect(() => resolveInputFile({ file: 'a.json', json: 'b.json' })).toThrow('process.exit');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});

describe('emitOutput()', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls text handler for text format', () => {
    const text = vi.fn();
    emitOutput('text', { text, json: () => ({}), api: () => ({}) });
    expect(text).toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('prints JSON for json format', () => {
    emitOutput('json', {
      text: () => {},
      json: () => ({ slim: true }),
      api: () => ({ raw: true }),
    });
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({ slim: true }, null, 2));
  });
});

describe('warnDeprecated()', () => {
  it('writes to stderr', () => {
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    warnDeprecated('--json', '--format api');
    expect(stderrSpy).toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});
