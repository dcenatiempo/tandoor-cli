import { describe, it, expect } from 'vitest';
import { foodsToListPayload } from '../api/food-payload';
import type { Food } from '../api/types';

describe('foodsToListPayload()', () => {
  it('maps API fields to slim list shape', () => {
    const foods: Food[] = [
      {
        id: 1,
        name: 'olive oil',
        food_onhand: true,
        ignore_shopping: false,
      },
      {
        id: 2,
        name: 'salt',
      },
    ];

    expect(foodsToListPayload(foods)).toEqual([
      {
        id: 1,
        name: 'olive oil',
        onhand: true,
        ignore_shopping: false,
        category: null,
      },
      {
        id: 2,
        name: 'salt',
        onhand: false,
        ignore_shopping: false,
        category: null,
      },
    ]);
  });
});
