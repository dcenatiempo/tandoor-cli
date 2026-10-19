import { describe, it, expect } from 'vitest';
import { selectShoppingEntriesForDelete } from '../api/shopping';
import type { ShoppingListEntry } from '../api/types';

function entry(overrides: Partial<ShoppingListEntry> = {}): ShoppingListEntry {
  return {
    id: 1,
    food: { id: 1, name: 'milk' },
    unit: null,
    amount: 1,
    checked: false,
    list_recipe: null,
    list_recipe_data: null,
    ...overrides,
  };
}

describe('selectShoppingEntriesForDelete()', () => {
  it('selects by ID', () => {
    const entries = [entry({ id: 1 }), entry({ id: 2, food: { id: 2, name: 'eggs' } })];
    const result = selectShoppingEntriesForDelete(entries, { id: 2 });
    expect(result.map((e) => e.id)).toEqual([2]);
  });

  it('returns nothing for an unknown ID', () => {
    expect(selectShoppingEntriesForDelete([entry({ id: 1 })], { id: 99 })).toEqual([]);
  });

  it('selects by food name', () => {
    const entries = [entry({ id: 1 }), entry({ id: 2, food: { id: 2, name: 'eggs' } })];
    const result = selectShoppingEntriesForDelete(entries, { food: 'eggs' });
    expect(result.map((e) => e.id)).toEqual([2]);
  });

  it('matches food names case-insensitively', () => {
    const entries = [entry({ id: 7, food: { id: 1, name: 'Milk' } })];
    expect(selectShoppingEntriesForDelete(entries, { food: 'MILK' }).map((e) => e.id)).toEqual([7]);
  });

  it('tolerates surrounding and repeated whitespace', () => {
    const entries = [entry({ id: 7, food: { id: 1, name: 'spring onions' } })];
    expect(
      selectShoppingEntriesForDelete(entries, { food: '  spring   onions ' }).map((e) => e.id),
    ).toEqual([7]);
  });

  it('does not match on a partial name', () => {
    const entries = [entry({ id: 1, food: { id: 1, name: 'milk chocolate' } })];
    expect(selectShoppingEntriesForDelete(entries, { food: 'milk' })).toEqual([]);
  });

  it('returns every match so the caller can refuse an ambiguous delete', () => {
    const entries = [
      entry({ id: 1, food: { id: 1, name: 'milk' }, amount: 1 }),
      entry({ id: 2, food: { id: 1, name: 'milk' }, amount: 2 }),
    ];
    const result = selectShoppingEntriesForDelete(entries, { food: 'milk' });
    expect(result.map((e) => e.id)).toEqual([1, 2]);
  });

  it('returns nothing for an empty or whitespace-only food name', () => {
    const entries = [entry()];
    expect(selectShoppingEntriesForDelete(entries, { food: '' })).toEqual([]);
    expect(selectShoppingEntriesForDelete(entries, { food: '   ' })).toEqual([]);
  });

  it('returns nothing when no selector is given', () => {
    expect(selectShoppingEntriesForDelete([entry()], {})).toEqual([]);
  });

  it('prefers ID when both selectors are present', () => {
    const entries = [entry({ id: 1, food: { id: 1, name: 'milk' } }), entry({ id: 2, food: { id: 2, name: 'eggs' } })];
    const result = selectShoppingEntriesForDelete(entries, { id: 2, food: 'milk' });
    expect(result.map((e) => e.id)).toEqual([2]);
  });

  it('selects checked entries as readily as unchecked ones', () => {
    // `clear` only removes checked entries; delete is about a specific row,
    // whatever its state.
    const entries = [entry({ id: 3, checked: true })];
    expect(selectShoppingEntriesForDelete(entries, { id: 3 }).map((e) => e.id)).toEqual([3]);
  });
});
