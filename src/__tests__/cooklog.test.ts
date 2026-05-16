import { describe, it, expect } from 'vitest';
import {
  filterCookLogs,
  sortCookLogsByDateDesc,
  buildCookLogPatchBody,
} from '../api/cooklog';
import type { CookLog } from '../api/types';

function log(overrides: Partial<CookLog> = {}): CookLog {
  return {
    id: 1,
    recipe: 1,
    servings: 4,
    rating: null,
    created_at: '2026-05-01T12:00:00Z',
    created_by: 1,
    ...overrides,
  };
}

describe('filterCookLogs()', () => {
  it('filters by date range', () => {
    const logs = [
      log({ id: 1, created_at: '2026-04-15T12:00:00Z' }),
      log({ id: 2, created_at: '2026-05-15T12:00:00Z' }),
    ];
    const result = filterCookLogs(logs, {
      startdate: '2026-05-01',
      enddate: '2026-05-31',
    });
    expect(result.map((e) => e.id)).toEqual([2]);
  });

  it('filters by rating range', () => {
    const logs = [
      log({ id: 1, rating: 2 }),
      log({ id: 2, rating: 5 }),
    ];
    const result = filterCookLogs(logs, { minRating: 4 });
    expect(result.map((e) => e.id)).toEqual([2]);
  });
});

describe('sortCookLogsByDateDesc()', () => {
  it('orders most recent first', () => {
    const logs = [
      log({ id: 1, created_at: '2026-01-01T12:00:00Z' }),
      log({ id: 2, created_at: '2026-06-01T12:00:00Z' }),
    ];
    const sorted = sortCookLogsByDateDesc(logs);
    expect(sorted.map((e) => e.id)).toEqual([2, 1]);
  });
});

describe('buildCookLogPatchBody()', () => {
  it('includes only patched fields', () => {
    expect(buildCookLogPatchBody({ servings: 6 })).toEqual({ servings: 6 });
  });

  it('maps createdAt to created_at', () => {
    expect(
      buildCookLogPatchBody({ createdAt: '2026-06-01T08:00:00.000Z' }),
    ).toEqual({ created_at: '2026-06-01T08:00:00.000Z' });
  });

  it('can patch multiple fields at once', () => {
    expect(
      buildCookLogPatchBody({ recipe: 31, rating: 5 }),
    ).toEqual({ recipe: 31, rating: 5 });
  });
});
