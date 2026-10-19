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
        title: null,
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

  // Tandoor lets a meal plan slot be a bare title with no recipe ("Takeaway").
  // These used to throw "cannot read properties of null (reading 'id')" and take
  // the whole listing down with them.
  describe('entries without a recipe', () => {
    const titleOnly: MealPlan = {
      id: 9,
      recipe: null,
      title: 'Takeaway night',
      from_date: '2024-03-11T12:00:00Z',
      to_date: '2024-03-11T23:59:59Z',
      meal_type: { id: 1, name: 'Dinner' },
      servings: 2,
    };

    it('emits a null recipe and carries the title', async () => {
      const payload = await mealPlansToListPayload([titleOnly]);
      expect(payload).toEqual([
        {
          id: 9,
          date: '2024-03-11',
          recipe: null,
          title: 'Takeaway night',
          servings: 2,
          meal_type: 'Dinner',
        },
      ]);
    });

    it('never fetches a recipe for them', async () => {
      await mealPlansToListPayload([titleOnly]);
      expect(getRecipe).not.toHaveBeenCalled();
    });

    it('does not stop recipe-backed entries in the same listing', async () => {
      const payload = await mealPlansToListPayload([titleOnly, entry]);
      expect(payload.map((p) => p.id)).toEqual([9, 7]);
      expect(payload[0].recipe).toBeNull();
      expect(payload[1].recipe?.name).toBe('Pasta Carbonara');
      expect(getRecipe).toHaveBeenCalledTimes(1);
    });

    it('falls back to a null title when the entry has neither', async () => {
      const bare = { ...titleOnly, title: undefined };
      const payload = await mealPlansToListPayload([bare]);
      expect(payload[0]).toMatchObject({ recipe: null, title: null });
    });
  });
});
