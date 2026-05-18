import { apiClient } from './client';
import { SupermarketCategory, PaginatedResponse } from './types';

/**
 * Fetch all supermarket categories, following pagination.
 */
export async function listSupermarketCategories(): Promise<SupermarketCategory[]> {
  const results: SupermarketCategory[] = [];
  let nextUrl: string | null = '/supermarket-category/';

  while (nextUrl) {
    const res: { data: PaginatedResponse<SupermarketCategory> } =
      await apiClient.get<PaginatedResponse<SupermarketCategory>>(nextUrl);
    results.push(...res.data.results);
    if (res.data.next) {
      const url: URL = new URL(res.data.next);
      nextUrl = url.pathname.replace(/^\/api/, '') + url.search;
    } else {
      nextUrl = null;
    }
  }

  return results;
}

/**
 * Resolve a category by name (case-insensitive) or numeric ID string.
 * Returns null if not found.
 */
export async function resolveCategory(
  nameOrId: string,
): Promise<SupermarketCategory | null> {
  const numericId = parseInt(nameOrId, 10);
  const byId = !isNaN(numericId) && String(numericId) === nameOrId;

  const all = await listSupermarketCategories();

  if (byId) {
    return all.find((c) => c.id === numericId) ?? null;
  }
  return all.find((c) => c.name.toLowerCase() === nameOrId.toLowerCase()) ?? null;
}
