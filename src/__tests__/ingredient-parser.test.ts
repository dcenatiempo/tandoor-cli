import { describe, it, expect } from 'vitest';
import { parseIngredientLine } from '../utils';

describe('parseIngredientLine()', () => {
  it('parses amount, unit, and food from a standard line', () => {
    const result = parseIngredientLine('2 cups flour');
    expect(result.amount).toBe(2);
    expect(result.unit?.name).toBe('cups');
    expect(result.food.name).toBe('flour');
  });

  it('parses a decimal amount', () => {
    const result = parseIngredientLine('1.5 tsp salt');
    expect(result.amount).toBe(1.5);
    expect(result.unit?.name).toBe('tsp');
    expect(result.food.name).toBe('salt');
  });

  it('parses food with multiple words', () => {
    const result = parseIngredientLine('3 tbsp olive oil');
    expect(result.amount).toBe(3);
    expect(result.unit?.name).toBe('tbsp');
    expect(result.food.name).toBe('olive oil');
  });

  it('sets unit to null when only amount and food are given', () => {
    const result = parseIngredientLine('2 eggs');
    expect(result.amount).toBe(2);
    expect(result.unit).toBeNull();
    expect(result.food.name).toBe('eggs');
  });

  it('handles leading/trailing whitespace', () => {
    const result = parseIngredientLine('  100 g butter  ');
    expect(result.amount).toBe(100);
    expect(result.unit?.name).toBe('g');
    expect(result.food.name).toBe('butter');
  });

  it('sets amount to 0 when first token is not a number', () => {
    const result = parseIngredientLine('some ingredient');
    expect(result.amount).toBe(0);
  });
});
