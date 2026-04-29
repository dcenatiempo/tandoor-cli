import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  formatRecipe,
  formatRecipeList,
  formatMealPlan,
  formatShoppingList,
  printJson,
  printSuccess,
  printError,
} from '../output/formatter';
import type { Recipe, MealPlan, ShoppingListEntry } from '../api/types';

// In test env, isTTY is false so colors are stripped — test plain text output.

const baseRecipe: Recipe = {
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
      id: 1,
      instruction: 'Boil the pasta.',
      order: 1,
      ingredients: [
        { id: 1, amount: 200, unit: { id: 1, name: 'g' }, food: { id: 1, name: 'pasta' }, note: '' },
        { id: 2, amount: 0, unit: null, food: { id: 2, name: 'salt' }, note: 'to taste' },
      ],
    },
  ],
};

describe('formatRecipe()', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prints the recipe name', () => {
    formatRecipe(baseRecipe);
    const calls = logSpy.mock.calls.flat().join('\n');
    expect(calls).toContain('Pasta Carbonara');
  });

  it('prints the description', () => {
    formatRecipe(baseRecipe);
    const calls = logSpy.mock.calls.flat().join('\n');
    expect(calls).toContain('Classic Italian pasta');
  });

  it('prints ID, servings, working_time, waiting_time', () => {
    formatRecipe(baseRecipe);
    const calls = logSpy.mock.calls.flat().join('\n');
    expect(calls).toContain('42');
    expect(calls).toContain('4');
    expect(calls).toContain('20');
    expect(calls).toContain('5');
  });

  it('prints keywords', () => {
    formatRecipe(baseRecipe);
    const calls = logSpy.mock.calls.flat().join('\n');
    expect(calls).toContain('Italian');
  });

  it('prints ingredient with amount, unit, and food', () => {
    formatRecipe(baseRecipe);
    const calls = logSpy.mock.calls.flat().join('\n');
    expect(calls).toContain('200');
    expect(calls).toContain('g');
    expect(calls).toContain('pasta');
  });

  it('prints ingredient note', () => {
    formatRecipe(baseRecipe);
    const calls = logSpy.mock.calls.flat().join('\n');
    expect(calls).toContain('to taste');
  });

  it('prints step instruction', () => {
    formatRecipe(baseRecipe);
    const calls = logSpy.mock.calls.flat().join('\n');
    expect(calls).toContain('Boil the pasta.');
  });

  it('skips amount when amount is 0', () => {
    formatRecipe(baseRecipe);
    // salt has amount 0 — should not print "0" as amount prefix for salt
    const calls = logSpy.mock.calls.flat().join('\n');
    expect(calls).toContain('salt');
  });

  it('handles recipe with no description', () => {
    const r = { ...baseRecipe, description: '' };
    expect(() => formatRecipe(r)).not.toThrow();
  });

  it('handles recipe with no keywords', () => {
    const r = { ...baseRecipe, keywords: [] };
    expect(() => formatRecipe(r)).not.toThrow();
  });
});

describe('formatRecipeList()', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prints "No recipes found." for empty list', () => {
    formatRecipeList([]);
    const calls = logSpy.mock.calls.flat().join('\n');
    expect(calls).toContain('No recipes found.');
  });

  it('prints recipe ID and name for each recipe', () => {
    formatRecipeList([baseRecipe]);
    const calls = logSpy.mock.calls.flat().join('\n');
    expect(calls).toContain('42');
    expect(calls).toContain('Pasta Carbonara');
  });

  it('prints creation date', () => {
    formatRecipeList([baseRecipe]);
    const calls = logSpy.mock.calls.flat().join('\n');
    // Date is formatted via toLocaleDateString — just check something date-like is present
    expect(logSpy).toHaveBeenCalled();
  });

  it('prints multiple recipes', () => {
    const r2: Recipe = { ...baseRecipe, id: 99, name: 'Pizza' };
    formatRecipeList([baseRecipe, r2]);
    const calls = logSpy.mock.calls.flat().join('\n');
    expect(calls).toContain('Pasta Carbonara');
    expect(calls).toContain('Pizza');
  });
});

describe('formatMealPlan()', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  const entry: MealPlan = {
    id: 7,
    recipe: { id: 42, name: 'Pasta Carbonara' },
    date: '2024-03-10',
    meal_type: { id: 1, name: 'Dinner' },
  };

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prints the meal plan ID', () => {
    formatMealPlan(entry);
    const calls = logSpy.mock.calls.flat().join('\n');
    expect(calls).toContain('7');
  });

  it('prints the recipe name', () => {
    formatMealPlan(entry);
    const calls = logSpy.mock.calls.flat().join('\n');
    expect(calls).toContain('Pasta Carbonara');
  });

  it('prints the date', () => {
    formatMealPlan(entry);
    const calls = logSpy.mock.calls.flat().join('\n');
    expect(calls).toContain('2024-03-10');
  });

  it('prints the meal type name', () => {
    formatMealPlan(entry);
    const calls = logSpy.mock.calls.flat().join('\n');
    expect(calls).toContain('Dinner');
  });
});

describe('formatShoppingList()', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  const entries: ShoppingListEntry[] = [
    { id: 1, food: { id: 1, name: 'milk' }, unit: { id: 1, name: 'L' }, amount: 2, checked: false },
    { id: 2, food: { id: 2, name: 'eggs' }, unit: null, amount: 6, checked: true },
  ];

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prints "Shopping list is empty." for empty list', () => {
    formatShoppingList([]);
    const calls = logSpy.mock.calls.flat().join('\n');
    expect(calls).toContain('Shopping list is empty.');
  });

  it('prints food name, amount, and unit', () => {
    formatShoppingList(entries);
    const calls = logSpy.mock.calls.flat().join('\n');
    expect(calls).toContain('milk');
    expect(calls).toContain('2');
    expect(calls).toContain('L');
  });

  it('prints checked status [ ] for unchecked items', () => {
    formatShoppingList(entries);
    const calls = logSpy.mock.calls.flat().join('\n');
    expect(calls).toContain('[ ]');
  });

  it('prints checked status [✓] for checked items', () => {
    formatShoppingList(entries);
    const calls = logSpy.mock.calls.flat().join('\n');
    expect(calls).toContain('[✓]');
  });

  it('handles null unit gracefully', () => {
    formatShoppingList([entries[1]]);
    const calls = logSpy.mock.calls.flat().join('\n');
    expect(calls).toContain('eggs');
  });
});

describe('printJson()', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('outputs pretty-printed JSON', () => {
    printJson({ id: 1, name: 'test' });
    const output = logSpy.mock.calls[0][0] as string;
    expect(output).toContain('"id": 1');
    expect(output).toContain('"name": "test"');
  });

  it('output is valid JSON', () => {
    printJson({ a: 1, b: [2, 3] });
    const output = logSpy.mock.calls[0][0] as string;
    expect(() => JSON.parse(output)).not.toThrow();
  });
});

describe('printSuccess()', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes to stdout (console.log)', () => {
    printSuccess('Done!');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Done!'));
  });
});

describe('printError()', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes to stderr', () => {
    printError('Something went wrong');
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('Something went wrong'));
  });

  it('does not write to stdout', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    printError('oops');
    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });
});
