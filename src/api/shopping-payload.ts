import type { ShoppingListEntry } from './types';

export interface ShoppingListEntryPayload {
  id: number;
  food: string;
  amount: number;
  unit: string;
  checked: boolean;
  category: string | null;
}

export function toShoppingListPayload(
  entries: ShoppingListEntry[],
): ShoppingListEntryPayload[] {
  return entries.map((e) => ({
    id: e.id,
    food: e.food.name,
    amount: e.amount,
    unit: e.unit?.name ?? '',
    checked: e.checked,
    category: e.food.supermarket_category?.name ?? null,
  }));
}
