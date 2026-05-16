import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  cookLogToListPayload,
  cookLogsToListPayload,
  cookLogsToListPayloadWithEnrichment,
} from '../api/cooklog-payload';
import type { CookLog } from '../api/types';

vi.mock('../api/cooklog', () => ({
  enrichCookLogsWithRecipeNames: vi.fn(),
}));

import { enrichCookLogsWithRecipeNames } from '../api/cooklog';

const log: CookLog = {
  id: 3,
  recipe: 42,
  servings: 4,
  rating: 5,
  comment: 'Kids loved it',
  created_at: '2024-03-10T18:30:00Z',
  created_by: 1,
};

describe('cookLogToListPayload()', () => {
  it('maps to slim list shape', () => {
    expect(cookLogToListPayload(log, 'Pasta Carbonara')).toEqual({
      id: 3,
      recipe: { id: 42, name: 'Pasta Carbonara' },
      rating: 5,
      comment: 'Kids loved it',
      servings: 4,
      date: '2024-03-10',
    });
  });

  it('defaults missing rating and comment', () => {
    const minimal: CookLog = {
      id: 1,
      recipe: 10,
      servings: 2,
      rating: null,
      created_at: '2024-01-01T12:00:00Z',
      created_by: 1,
    };
    expect(cookLogToListPayload(minimal, 'Soup')).toEqual({
      id: 1,
      recipe: { id: 10, name: 'Soup' },
      rating: 0,
      comment: '',
      servings: 2,
      date: '2024-01-01',
    });
  });
});

describe('cookLogsToListPayload()', () => {
  it('maps enriched entries', () => {
    const payload = cookLogsToListPayload([{ ...log, recipe_name: 'Pasta Carbonara' }]);
    expect(payload[0].recipe.name).toBe('Pasta Carbonara');
  });
});

describe('cookLogsToListPayloadWithEnrichment()', () => {
  beforeEach(() => {
    vi.mocked(enrichCookLogsWithRecipeNames).mockResolvedValue([
      { ...log, recipe_name: 'Pasta Carbonara' },
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('enriches recipe names before mapping', async () => {
    const payload = await cookLogsToListPayloadWithEnrichment([log]);
    expect(enrichCookLogsWithRecipeNames).toHaveBeenCalledWith([log]);
    expect(payload[0].recipe.name).toBe('Pasta Carbonara');
  });
});
