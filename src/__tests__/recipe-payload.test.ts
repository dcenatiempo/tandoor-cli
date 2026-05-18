import { describe, it, expect } from 'vitest';
import { recipeToCreatePayload } from '../api/recipe-payload';
import type { Recipe } from '../api/types';

const fullRecipe: Recipe = {
  id: 42,
  name: 'Pasta Carbonara',
  description: 'Classic Italian pasta',
  servings: 4,
  working_time: 20,
  waiting_time: 5,
  created_at: '2024-01-15T10:00:00Z',
  keywords: [{ id: 1, name: 'Italian' }],
  steps: [
    {
      id: 2,
      instruction: 'Serve immediately.',
      order: 2,
      ingredients: [],
    },
    {
      id: 1,
      instruction: 'Boil the pasta.',
      order: 1,
      ingredients: [
        {
          id: 1,
          amount: 200,
          unit: { id: 1, name: 'g' },
          food: { id: 10, name: 'pasta', ignore_shopping: true },
          note: '',
          order: 0,
        },
        {
          id: 2,
          amount: 1,
          unit: null,
          food: { id: 11, name: 'salt' },
          note: 'to taste',
        },
      ],
    },
  ],
};

describe('recipeToCreatePayload()', () => {
  it('includes recipe id and omits other API-only fields', () => {
    const payload = recipeToCreatePayload(fullRecipe);
    expect(payload.id).toBe(42);
    expect(payload).not.toHaveProperty('keywords');
    expect(payload).not.toHaveProperty('created_at');
    expect(payload.steps?.[0]?.ingredients?.[0]).toEqual({
      food: { name: 'pasta' },
      unit: { name: 'g' },
      amount: 200,
      order: 0,
    });
    expect(payload.steps?.[0]?.ingredients?.[1]).toEqual({
      food: { name: 'salt' },
      unit: null,
      amount: 1,
      order: 1,
      note: 'to taste',
    });
  });

  it('preserves recipe metadata and sorts steps by order', () => {
    const payload = recipeToCreatePayload(fullRecipe);
    expect(payload).toEqual({
      id: 42,
      name: 'Pasta Carbonara',
      description: 'Classic Italian pasta',
      servings: 4,
      working_time: 20,
      waiting_time: 5,
      steps: [
        {
          instruction: 'Boil the pasta.',
          order: 1,
          ingredients: [
            { food: { name: 'pasta' }, unit: { name: 'g' }, amount: 200, order: 0 },
            {
              food: { name: 'salt' },
              unit: null,
              amount: 1,
              order: 1,
              note: 'to taste',
            },
          ],
        },
        {
          instruction: 'Serve immediately.',
          order: 2,
          ingredients: [],
        },
      ],
    });
  });

  it('omits empty description', () => {
    const payload = recipeToCreatePayload({ ...fullRecipe, description: '   ' });
    expect(payload).not.toHaveProperty('description');
  });

  it('omits steps key for list-summary recipes without step data', () => {
    const summary = {
      ...fullRecipe,
      steps: undefined as unknown as Recipe['steps'],
    };
    const payload = recipeToCreatePayload(summary);
    expect(payload).not.toHaveProperty('steps');
  });
});
