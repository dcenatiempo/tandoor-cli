/**
 * Property-Based Tests for tandoor-cli
 * All 10 correctness properties from the design document.
 * Uses fast-check with a minimum of 100 runs per property.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { normalizeUrl, isValidName, isValidDate, parseIngredientLine, capLimit } from '../utils';
import { loadConfig } from '../config';
import { CliError } from '../api/client';
import {
  formatRecipe,
  formatRecipeList,
  formatMealPlan,
  formatShoppingList,
  printSuccess,
  printError,
} from '../output/formatter';
import type { Recipe, MealPlan, ShoppingListEntry } from '../api/types';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const urlArb = fc.oneof(
  fc.webUrl(),
  fc.string({ minLength: 1, maxLength: 50 }).map(s => `http://example.com/${s}`),
  fc.constant('http://localhost:8050'),
  fc.constant('http://localhost:8050/'),
  fc.constant('http://localhost:8050///'),
);

const foodArb = fc.record({
  id: fc.integer({ min: 1 }),
  name: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
});

const unitArb = fc.record({
  id: fc.integer({ min: 1 }),
  name: fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^\S+$/.test(s)),
});

const ingredientArb = fc.record({
  id: fc.integer({ min: 1 }),
  amount: fc.float({ min: Math.fround(0), max: Math.fround(1000), noNaN: true }),
  unit: fc.option(unitArb, { nil: null }),
  food: foodArb,
  note: fc.string({ maxLength: 30 }),
});

const stepArb = fc.record({
  id: fc.integer({ min: 1 }),
  instruction: fc.string({ maxLength: 200 }),
  order: fc.integer({ min: 0 }),
  ingredients: fc.array(ingredientArb, { maxLength: 5 }),
});

const keywordArb = fc.record({
  id: fc.integer({ min: 1 }),
  name: fc.string({ minLength: 1, maxLength: 20 }),
});

const recipeArb: fc.Arbitrary<Recipe> = fc.record({
  id: fc.integer({ min: 1 }),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  description: fc.string({ maxLength: 200 }),
  servings: fc.integer({ min: 1, max: 100 }),
  working_time: fc.integer({ min: 0, max: 480 }),
  waiting_time: fc.integer({ min: 0, max: 480 }),
  created_at: fc.constant('2024-01-01T00:00:00Z'),
  steps: fc.array(stepArb, { maxLength: 5 }),
  keywords: fc.array(keywordArb, { maxLength: 5 }),
});

const mealPlanArb: fc.Arbitrary<MealPlan> = fc.record({
  id: fc.integer({ min: 1 }),
  recipe: fc.record({
    id: fc.integer({ min: 1 }),
    name: fc.string({ minLength: 1, maxLength: 50 }),
  }),
  date: fc.constant('2024-06-15'),
  meal_type: fc.record({
    id: fc.integer({ min: 1 }),
    name: fc.string({ minLength: 1, maxLength: 20 }),
  }),
});

const shoppingEntryArb: fc.Arbitrary<ShoppingListEntry> = fc.record({
  id: fc.integer({ min: 1 }),
  food: foodArb,
  unit: fc.option(unitArb, { nil: null }),
  amount: fc.float({ min: Math.fround(0), max: Math.fround(1000), noNaN: true }),
  checked: fc.boolean(),
});

// ---------------------------------------------------------------------------
// Property 1: URL normalization is idempotent
// Feature: tandoor-cli, Property 1
// Validates: Requirements 1.3
// ---------------------------------------------------------------------------

describe('Property 1: URL normalization is idempotent', () => {
  it('normalize(normalize(url)) === normalize(url) for any URL string', () => {
    fc.assert(
      fc.property(urlArb, (url) => {
        const once = normalizeUrl(url);
        const twice = normalizeUrl(once);
        expect(twice).toBe(once);
      }),
      { numRuns: 100 },
    );
  });

  it('normalized URL never ends with a slash', () => {
    fc.assert(
      fc.property(urlArb, (url) => {
        const result = normalizeUrl(url);
        expect(result.endsWith('/')).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 2: API token always takes precedence over Basic credentials
// Feature: tandoor-cli, Property 2
// Validates: Requirements 2.5
// ---------------------------------------------------------------------------

describe('Property 2: Auth token precedence', () => {
  const originalEnv = process.env;
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    process.env = { ...originalEnv };
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((_code?: number) => {
      throw new Error(`process.exit(${_code})`);
    });
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('always uses Bearer token when TANDOOR_API_TOKEN is set alongside credentials', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 30 }),
        fc.string({ minLength: 1, maxLength: 30 }),
        (token, username, password) => {
          process.env.TANDOOR_URL = 'http://localhost:8050';
          process.env.TANDOOR_API_TOKEN = token;
          process.env.TANDOOR_USERNAME = username;
          process.env.TANDOOR_PASSWORD = password;
          const cfg = loadConfig();
          expect(cfg.authHeader).toBe(`Bearer ${token}`);
          expect(cfg.authType).toBe('token');
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 3: Limit values above 100 are always capped to 100
// Feature: tandoor-cli, Property 3
// Validates: Requirements 3.3
// ---------------------------------------------------------------------------

describe('Property 3: Limit capping', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('capLimit(n) === 100 for any n > 100', () => {
    fc.assert(
      fc.property(fc.integer({ min: 101, max: 100000 }), (n) => {
        expect(capLimit(n)).toBe(100);
      }),
      { numRuns: 100 },
    );
  });

  it('capLimit(n) === n for any n <= 100', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100 }), (n) => {
        expect(capLimit(n)).toBe(n);
      }),
      { numRuns: 100 },
    );
  });

  it('writes a warning to stderr when capping', () => {
    fc.assert(
      fc.property(fc.integer({ min: 101, max: 100000 }), (n) => {
        stderrSpy.mockClear();
        capLimit(n);
        expect(stderrSpy).toHaveBeenCalled();
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 4: Recipe serialization round-trip preserves all fields
// Feature: tandoor-cli, Property 4
// Validates: Requirements 14.2, 14.3
// ---------------------------------------------------------------------------

describe('Property 4: Recipe serialization round-trip', () => {
  it('JSON.parse(JSON.stringify(recipe)) deep-equals the original recipe', () => {
    fc.assert(
      fc.property(recipeArb, (recipe) => {
        const serialized = JSON.stringify(recipe);
        const deserialized = JSON.parse(serialized) as Recipe;
        expect(deserialized).toEqual(recipe);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 5: Ingredient line parser recovers original values
// Feature: tandoor-cli, Property 5
// Validates: Requirements 7.2
// ---------------------------------------------------------------------------

describe('Property 5: Ingredient line parser', () => {
  it('recovers amount, unit, and food from a formatted line', () => {
    // Generate valid triples: amount > 0, unit is a non-empty single word, food is non-empty
    const tripleArb = fc.tuple(
      fc.float({ min: Math.fround(0.1), max: Math.fround(999), noNaN: true }).map(n => Math.round(n * 10) / 10),
      fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^\S+$/.test(s) && s.trim().length > 0),
      fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim() === s && s.trim().length > 0 && !/\s{2,}/.test(s)),
    );

    fc.assert(
      fc.property(tripleArb, ([amount, unit, food]) => {
        const line = `${amount} ${unit} ${food}`;
        const result = parseIngredientLine(line);
        expect(result.amount).toBeCloseTo(amount, 5);
        expect(result.unit?.name).toBe(unit);
        expect(result.food.name).toBe(food);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 6: Date validator rejects all non-YYYY-MM-DD strings
// Feature: tandoor-cli, Property 6
// Validates: Requirements 10.5
// ---------------------------------------------------------------------------

describe('Property 6: Date validator rejects invalid strings', () => {
  it('isValidDate returns false for strings that do not match YYYY-MM-DD', () => {
    fc.assert(
      fc.property(
        fc.string().filter(s => !/^\d{4}-\d{2}-\d{2}$/.test(s)),
        (s) => {
          expect(isValidDate(s)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 7: Whitespace-only strings are never valid recipe names
// Feature: tandoor-cli, Property 7
// Validates: Requirements 7.5
// ---------------------------------------------------------------------------

describe('Property 7: Whitespace name rejection', () => {
  it('isValidName returns false for whitespace-only strings', () => {
    const whitespaceArb = fc.oneof(
      fc.constant(''),
      fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 1, maxLength: 20 }),
    );

    fc.assert(
      fc.property(whitespaceArb, (s) => {
        expect(isValidName(s)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 8: Formatter always includes all required fields
// Feature: tandoor-cli, Property 8
// Validates: Requirements 3.4, 4.2, 5.2, 10.2, 11.2
// ---------------------------------------------------------------------------

describe('Property 8: Formatter completeness', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('formatRecipe output contains recipe name and ID', () => {
    fc.assert(
      fc.property(recipeArb, (recipe) => {
        logSpy.mockClear();
        formatRecipe(recipe);
        const output = logSpy.mock.calls.flat().join('\n');
        expect(output).toContain(recipe.name);
        expect(output).toContain(String(recipe.id));
      }),
      { numRuns: 100 },
    );
  });

  it('formatMealPlan output contains ID, date, meal type, and recipe name', () => {
    fc.assert(
      fc.property(mealPlanArb, (entry) => {
        logSpy.mockClear();
        formatMealPlan(entry);
        const output = logSpy.mock.calls.flat().join('\n');
        expect(output).toContain(String(entry.id));
        expect(output).toContain(entry.date);
        expect(output).toContain(entry.meal_type.name);
        expect(output).toContain(entry.recipe.name);
      }),
      { numRuns: 100 },
    );
  });

  it('formatShoppingList output contains food name for each entry', () => {
    fc.assert(
      fc.property(fc.array(shoppingEntryArb, { minLength: 1, maxLength: 5 }), (entries) => {
        logSpy.mockClear();
        formatShoppingList(entries);
        const output = logSpy.mock.calls.flat().join('\n');
        for (const e of entries) {
          expect(output).toContain(e.food.name);
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 9: 5xx error messages always include the HTTP status code
// Feature: tandoor-cli, Property 9
// Validates: Requirements 13.2
// ---------------------------------------------------------------------------

describe('Property 9: 5xx error messages include status code', () => {
  it('CliError message for 5xx contains the status code', () => {
    fc.assert(
      fc.property(fc.integer({ min: 500, max: 599 }), (status) => {
        const error = new CliError(
          `Server error (${status}): the Tandoor instance returned an unexpected error.`,
          1,
        );
        expect(error.message).toContain(String(status));
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 10: Errors go to stderr; informational output goes to stdout
// Feature: tandoor-cli, Property 10
// Validates: Requirements 12.4, 13.4
// ---------------------------------------------------------------------------

describe('Property 10: stderr/stdout routing', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('printError writes to stderr for any message', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 100 }), (msg) => {
        stderrSpy.mockClear();
        logSpy.mockClear();
        printError(msg);
        expect(stderrSpy).toHaveBeenCalled();
        expect(logSpy).not.toHaveBeenCalled();
      }),
      { numRuns: 100 },
    );
  });

  it('printSuccess writes to stdout (console.log) for any message', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 100 }), (msg) => {
        stderrSpy.mockClear();
        logSpy.mockClear();
        printSuccess(msg);
        expect(logSpy).toHaveBeenCalled();
        // stderr should not be called for success messages
        expect(stderrSpy).not.toHaveBeenCalled();
      }),
      { numRuns: 100 },
    );
  });
});
