import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mealPlansToListPayload } from '../api/mealplan-payload';
import type { MealPlan, Recipe } from '../api/types';

vi.mock('../api/recipes', () => ({
  getRecipe: vi.fn(),
}));

import { getRecipe } from '../api/recipes';

const entry: MealPlan = {
  id: 7,
  recipe: { id: 42, name: 'Pasta Carbonara' },
  from_date: '2024-03-10T12:00:00Z',
  to_date: '2024-03-10T23:59:59Z',
  meal_type: { id: 1, name: 'Dinner' },
  servings: 4,
};

const fullRecipe: Recipe = {
  id: 42,
  name: 'Pasta Carbonara',
  description: 'Classic Italian pasta',
  servings: 4,
  working_time: 20,
  waiting_time: 5,
  created_at: '2024-01-15T10:00:00Z',
  keywords: [],
  steps: [],
};

describe('mealPlansToListPayload()', () => {
  beforeEach(() => {
    vi.mocked(getRecipe).mockResolvedValue(fullRecipe);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns flattened entries with recipe details and meal_type as string', async () => {
    const payload = await mealPlansToListPayload([entry]);
    expect(payload).toEqual([
      {
        id: 7,
        date: '2024-03-10',
        recipe: {
          id: 42,
          name: 'Pasta Carbonara',
          description: 'Classic Italian pasta',
          working_time: 20,
          waiting_time: 5,
        },
        servings: 4,
        meal_type: 'Dinner',
      },
    ]);
  });

  it('fetches each unique recipe only once', async () => {
    const second = { ...entry, id: 8 };
    await mealPlansToListPayload([entry, second]);
    expect(getRecipe).toHaveBeenCalledTimes(1);
    expect(getRecipe).toHaveBeenCalledWith(42);
  });
});
