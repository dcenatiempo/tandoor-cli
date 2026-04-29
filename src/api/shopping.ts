import { apiClient } from './client';
import { ShoppingListEntry, PaginatedResponse } from './types';

export async function listShoppingEntries(): Promise<ShoppingListEntry[]> {
  const res = await apiClient.get<PaginatedResponse<ShoppingListEntry>>('/shopping-list-entry/');
  return res.data.results;
}

export async function createShoppingEntry(
  food: string,
  amount: number,
  unit: string,
): Promise<ShoppingListEntry> {
  const res = await apiClient.post<ShoppingListEntry>('/shopping-list-entry/', {
    food: { name: food },
    unit: { name: unit },
    amount,
  });
  return res.data;
}

export async function checkShoppingEntry(id: number): Promise<ShoppingListEntry> {
  const res = await apiClient.patch<ShoppingListEntry>(`/shopping-list-entry/${id}/`, {
    checked: true,
  });
  return res.data;
}

export async function clearCheckedEntries(): Promise<void> {
  const res = await apiClient.get<PaginatedResponse<ShoppingListEntry>>('/shopping-list-entry/');
  const checked = res.data.results.filter((entry) => entry.checked);
  await Promise.all(checked.map((entry) => apiClient.delete(`/shopping-list-entry/${entry.id}/`)));
}
