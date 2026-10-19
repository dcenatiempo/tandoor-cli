import { describe, it, expect } from 'vitest';
import { mealPlanLabel } from '../api/mealplan';
import type { MealPlan } from '../api/types';

function plan(overrides: Partial<MealPlan> = {}): MealPlan {
  return {
    id: 1,
    recipe: { id: 42, name: 'Pasta Carbonara' },
    from_date: '2024-03-10T12:00:00Z',
    to_date: '2024-03-10T23:59:59Z',
    meal_type: { id: 1, name: 'Dinner' },
    servings: 2,
    ...overrides,
  };
}

describe('mealPlanLabel()', () => {
  it('uses the recipe name when there is a recipe', () => {
    expect(mealPlanLabel(plan())).toBe('Pasta Carbonara');
  });

  it('falls back to the title when there is no recipe', () => {
    expect(mealPlanLabel(plan({ recipe: null, title: 'Takeaway night' }))).toBe('Takeaway night');
  });

  it('prefers the recipe name over a title when both are present', () => {
    expect(mealPlanLabel(plan({ title: 'Pasta night' }))).toBe('Pasta Carbonara');
  });

  it('degrades to a placeholder rather than throwing when both are missing', () => {
    expect(mealPlanLabel(plan({ recipe: null }))).toBe('(untitled)');
    expect(mealPlanLabel(plan({ recipe: null, title: '' }))).toBe('(untitled)');
  });
});
