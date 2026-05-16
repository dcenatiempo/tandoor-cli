import { describe, it, expect } from 'vitest';
import {
  collectMatchingFoods,
  createFoodListCollectState,
  foodMatchesListFilters,
  isFoodListCollectDone,
} from '../api/food';
import type { Food } from '../api/types';

function food(overrides: Partial<Food> = {}): Food {
  return { id: 1, name: 'test', ...overrides };
}

describe('foodMatchesListFilters()', () => {
  it('passes all foods when no filters are active', () => {
    expect(foodMatchesListFilters(food(), {})).toBe(true);
    expect(foodMatchesListFilters(food({ ignore_shopping: true, food_onhand: true }), {})).toBe(true);
  });

  it('requires ignore_shopping when --ignored is active', () => {
    expect(
      foodMatchesListFilters(food({ ignore_shopping: true }), { ignoredOnly: true }),
    ).toBe(true);
    expect(
      foodMatchesListFilters(food({ ignore_shopping: false }), { ignoredOnly: true }),
    ).toBe(false);
    expect(foodMatchesListFilters(food(), { ignoredOnly: true })).toBe(false);
  });

  it('requires food_onhand when --onhand is active', () => {
    expect(
      foodMatchesListFilters(food({ food_onhand: true }), { onhandOnly: true }),
    ).toBe(true);
    expect(
      foodMatchesListFilters(food({ food_onhand: false }), { onhandOnly: true }),
    ).toBe(false);
    expect(foodMatchesListFilters(food(), { onhandOnly: true })).toBe(false);
  });

  it('applies both filters when both flags are set', () => {
    expect(
      foodMatchesListFilters(
        food({ ignore_shopping: true, food_onhand: true }),
        { ignoredOnly: true, onhandOnly: true },
      ),
    ).toBe(true);
    expect(
      foodMatchesListFilters(
        food({ ignore_shopping: true, food_onhand: false }),
        { ignoredOnly: true, onhandOnly: true },
      ),
    ).toBe(false);
    expect(
      foodMatchesListFilters(
        food({ ignore_shopping: false, food_onhand: true }),
        { ignoredOnly: true, onhandOnly: true },
      ),
    ).toBe(false);
  });
});

describe('createFoodListCollectState()', () => {
  it('uses skip/take for paginated requests', () => {
    const state = createFoodListCollectState({ page: 3, limit: 10 });
    expect(state.skipRemaining).toBe(20);
    expect(state.take).toBe(10);
  });

  it('collects without cap when fetchAll is set', () => {
    const state = createFoodListCollectState({ fetchAll: true });
    expect(state.skipRemaining).toBe(0);
    expect(state.take).toBeNull();
  });
});

describe('collectMatchingFoods()', () => {
  it('stops once take limit is reached', () => {
    const initial = createFoodListCollectState({ limit: 1 });
    const foods = [
      food({ id: 1, ignore_shopping: false }),
      food({ id: 2, ignore_shopping: true }),
      food({ id: 3, ignore_shopping: true }),
    ];
    const state = collectMatchingFoods(initial, foods, { ignoredOnly: true });
    expect(isFoodListCollectDone(state)).toBe(true);
    expect(state.matched).toHaveLength(1);
    expect(state.matched[0].id).toBe(2);
  });

  it('skips leading matches for later pages', () => {
    const initial = createFoodListCollectState({ page: 2, limit: 2 });
    const foods = [
      food({ id: 1, ignore_shopping: true }),
      food({ id: 2, ignore_shopping: true }),
      food({ id: 3, ignore_shopping: true }),
      food({ id: 4, ignore_shopping: true }),
    ];
    const state = collectMatchingFoods(initial, foods, { ignoredOnly: true });
    expect(state.matched.map((f) => f.id)).toEqual([3, 4]);
    expect(isFoodListCollectDone(state)).toBe(true);
  });

  it('continues collecting when take is not yet reached', () => {
    const initial = createFoodListCollectState({ limit: 5 });
    const state = collectMatchingFoods(
      initial,
      [food({ id: 1, ignore_shopping: false })],
      { ignoredOnly: true },
    );
    expect(isFoodListCollectDone(state)).toBe(false);
    expect(state.matched).toHaveLength(0);
  });

  it('collects all matches when take is null', () => {
    const initial = createFoodListCollectState({ fetchAll: true });
    const foods = [
      food({ id: 1, ignore_shopping: true }),
      food({ id: 2, ignore_shopping: false }),
      food({ id: 3, ignore_shopping: true }),
    ];
    const state = collectMatchingFoods(initial, foods, { ignoredOnly: true });
    expect(state.matched.map((f) => f.id)).toEqual([1, 3]);
    expect(isFoodListCollectDone(state)).toBe(false);
  });
});
