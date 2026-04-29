import { describe, it, expect } from 'vitest';
import { isValidDate } from '../utils';

describe('isValidDate()', () => {
  it('accepts a valid YYYY-MM-DD date', () => {
    expect(isValidDate('2024-03-15')).toBe(true);
  });

  it('accepts the minimum-looking date 0000-00-00', () => {
    expect(isValidDate('0000-00-00')).toBe(true);
  });

  it('rejects a date with slashes', () => {
    expect(isValidDate('2024/03/15')).toBe(false);
  });

  it('rejects a date with dots', () => {
    expect(isValidDate('2024.03.15')).toBe(false);
  });

  it('rejects a date in MM-DD-YYYY format', () => {
    expect(isValidDate('03-15-2024')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isValidDate('')).toBe(false);
  });

  it('rejects a string with letters', () => {
    expect(isValidDate('abcd-ef-gh')).toBe(false);
  });

  it('rejects a date with extra characters', () => {
    expect(isValidDate('2024-03-15T00:00:00')).toBe(false);
  });

  it('rejects a date missing leading zeros', () => {
    expect(isValidDate('2024-3-5')).toBe(false);
  });

  it('rejects a date with wrong number of digits in year', () => {
    expect(isValidDate('24-03-15')).toBe(false);
  });
});
