import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { capLimit } from '../utils';
import { isValidName } from '../utils';

describe('capLimit()', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the value unchanged when at or below 100', () => {
    expect(capLimit(100)).toBe(100);
    expect(capLimit(50)).toBe(50);
    expect(capLimit(1)).toBe(1);
  });

  it('caps to 100 when value exceeds 100', () => {
    expect(capLimit(101)).toBe(100);
    expect(capLimit(500)).toBe(100);
    expect(capLimit(10000)).toBe(100);
  });

  it('writes a warning to stderr when capping', () => {
    capLimit(200);
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('200'));
  });

  it('does not write to stderr when value is exactly 100', () => {
    capLimit(100);
    expect(stderrSpy).not.toHaveBeenCalled();
  });

  it('does not write to stderr when value is below 100', () => {
    capLimit(10);
    expect(stderrSpy).not.toHaveBeenCalled();
  });
});

describe('isValidName()', () => {
  it('returns true for a normal name', () => {
    expect(isValidName('Pasta Carbonara')).toBe(true);
  });

  it('returns false for an empty string', () => {
    expect(isValidName('')).toBe(false);
  });

  it('returns false for a whitespace-only string', () => {
    expect(isValidName('   ')).toBe(false);
  });

  it('returns false for a tab-only string', () => {
    expect(isValidName('\t\t')).toBe(false);
  });

  it('returns false for a newline-only string', () => {
    expect(isValidName('\n')).toBe(false);
  });

  it('returns true for a name with surrounding whitespace', () => {
    // trim() makes it non-empty
    expect(isValidName('  hello  ')).toBe(true);
  });
});
