import { apiClient } from './client';
import { Food, PaginatedResponse } from './types';

export interface ListFoodsOptions {
  limit?: number;
  search?: string;
  ignoredOnly?: boolean;
}

/**
 * List foods with optional search term, limit, and ignore_shopping filter.
 */
export async function listFoods(opts: ListFoodsOptions = {}): Promise<Food[]> {
  const params: Record<string, string | number | boolean> = {
    page_size: opts.limit ?? 20,
  };
  if (opts.search) {
    params.query = opts.search;
  }
  if (opts.ignoredOnly) {
    params.ignore_shopping = true;
  }
  const res = await apiClient.get<PaginatedResponse<Food>>('/food/', { params });
  return res.data.results;
}

/**
 * Look up a food by exact name. Returns null if not found.
 */
export async function getFoodByName(name: string): Promise<Food | null> {
  const res = await apiClient.get<PaginatedResponse<Food>>('/food/', {
    params: { query: name },
  });
  // The API does fuzzy search, so find the exact match
  const exact = res.data.results.find(
    (f) => f.name.toLowerCase() === name.toLowerCase(),
  );
  return exact ?? null;
}

/**
 * Fetch a food by ID.
 */
export async function getFoodById(id: number): Promise<Food> {
  const res = await apiClient.get<Food>(`/food/${id}/`);
  return res.data;
}

/**
 * Patch a food record by ID.
 */
export async function patchFood(id: number, patch: Partial<Food>): Promise<Food> {
  const res = await apiClient.patch<Food>(`/food/${id}/`, patch);
  return res.data;
}

/**
 * Set ignore_shopping on a food by name.
 * Returns the updated food, or null if the food was not found.
 */
export async function setIgnoreShopping(
  name: string,
  ignore: boolean,
): Promise<Food | null> {
  const food = await getFoodByName(name);
  if (!food) return null;
  return patchFood(food.id, { ignore_shopping: ignore });
}
