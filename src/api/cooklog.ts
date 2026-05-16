import { apiClient } from './client';
import { CookLog, PaginatedResponse } from './types';
import { getRecipe } from './recipes';

export interface ListCookLogsOptions {
  recipe?: number;
  limit?: number;
  page?: number;
  fetchAll?: boolean;
  startdate?: string;
  enddate?: string;
  minRating?: number;
  maxRating?: number;
}

/** Max page size for Tandoor's DefaultPagination on /cook-log/. */
const COOKLOG_PAGE_SIZE = 200;

const PARALLEL_PAGE_FETCHES = 8;

function buildCookLogListParams(
  opts: ListCookLogsOptions,
  page: number,
  pageSize: number,
): Record<string, string | number> {
  const params: Record<string, string | number> = {
    page_size: pageSize,
    page,
  };
  if (opts.recipe) params.recipe = opts.recipe;
  if (opts.startdate) params.created_at__gte = opts.startdate;
  if (opts.enddate) params.created_at__lte = opts.enddate;
  return params;
}

async function fetchCookLogPage(
  opts: ListCookLogsOptions,
  page: number,
  pageSize: number,
): Promise<PaginatedResponse<CookLog>> {
  const res = await apiClient.get<PaginatedResponse<CookLog>>('/cook-log/', {
    params: buildCookLogListParams(opts, page, pageSize),
  });
  return res.data;
}

async function fetchAllCookLogPages(opts: ListCookLogsOptions): Promise<CookLog[]> {
  const first = await fetchCookLogPage(opts, 1, COOKLOG_PAGE_SIZE);
  const all = [...first.results];

  const totalPages = Math.max(1, Math.ceil(first.count / COOKLOG_PAGE_SIZE));
  if (totalPages <= 1) return all;

  for (let batchStart = 2; batchStart <= totalPages; batchStart += PARALLEL_PAGE_FETCHES) {
    const pages: number[] = [];
    for (
      let page = batchStart;
      page < batchStart + PARALLEL_PAGE_FETCHES && page <= totalPages;
      page++
    ) {
      pages.push(page);
    }

    const pageResponses = await Promise.all(
      pages.map((page) => fetchCookLogPage(opts, page, COOKLOG_PAGE_SIZE)),
    );

    for (const data of pageResponses) {
      all.push(...data.results);
    }
  }

  return all;
}

/**
 * Apply date and rating filters. Date filters run client-side as a fallback when
 * the API does not apply created_at query params.
 */
export function filterCookLogs(logs: CookLog[], opts: ListCookLogsOptions): CookLog[] {
  let result = logs;

  if (opts.startdate) {
    result = result.filter((log) => log.created_at.slice(0, 10) >= opts.startdate!);
  }
  if (opts.enddate) {
    result = result.filter((log) => log.created_at.slice(0, 10) <= opts.enddate!);
  }
  if (opts.minRating !== undefined) {
    result = result.filter((log) => log.rating !== null && log.rating >= opts.minRating!);
  }
  if (opts.maxRating !== undefined) {
    result = result.filter((log) => log.rating !== null && log.rating <= opts.maxRating!);
  }

  return result;
}

export function sortCookLogsByDateDesc(logs: CookLog[]): CookLog[] {
  return [...logs].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export async function listCookLogs(options: ListCookLogsOptions = {}): Promise<CookLog[]> {
  const all = await fetchAllCookLogPages(options);
  let result = sortCookLogsByDateDesc(filterCookLogs(all, options));

  if (options.fetchAll) return result;

  const limit = options.limit ?? 20;
  const page = options.page ?? 1;
  const start = (page - 1) * limit;
  return result.slice(start, start + limit);
}

export async function createCookLog(
  recipeId: number,
  servings: number,
  rating?: number,
  createdAt?: string,
): Promise<CookLog> {
  const payload: {
    recipe: number;
    servings: number;
    rating?: number;
    created_at?: string;
  } = {
    recipe: recipeId,
    servings,
  };

  if (rating !== undefined) {
    payload.rating = rating;
  }

  if (createdAt) {
    payload.created_at = createdAt;
  }

  const res = await apiClient.post<CookLog>('/cook-log/', payload);
  return res.data;
}

export async function updateCookLog(
  id: number,
  recipeId: number,
  servings: number,
  rating?: number,
  createdAt?: string,
): Promise<CookLog> {
  const payload: {
    id: number;
    recipe: number;
    servings: number;
    rating?: number;
    created_at?: string;
  } = {
    id,
    recipe: recipeId,
    servings,
  };

  if (rating !== undefined) {
    payload.rating = rating;
  }

  if (createdAt) {
    payload.created_at = createdAt;
  }

  const res = await apiClient.post<CookLog>('/cook-log/', payload);
  return res.data;
}

export async function deleteCookLog(id: number): Promise<void> {
  await apiClient.delete(`/cook-log/${id}/`);
}

export interface CookLogWithRecipeName extends CookLog {
  recipe_name: string;
}

export async function findCookLogsByIngredient(
  ingredientName: string,
  options?: {
    limit?: number;
    startdate?: string;
    enddate?: string;
    minRating?: number;
    maxRating?: number;
  },
): Promise<CookLogWithRecipeName[]> {
  const allLogs = await listCookLogs({
    fetchAll: true,
    startdate: options?.startdate,
    enddate: options?.enddate,
    minRating: options?.minRating,
    maxRating: options?.maxRating,
  });

  const matchingLogs: CookLogWithRecipeName[] = [];
  const ingredientLower = ingredientName.toLowerCase();

  for (const log of allLogs) {
    try {
      const recipe = await getRecipe(log.recipe);

      const hasIngredient = recipe.steps.some((step) =>
        step.ingredients.some((ing) =>
          ing.food.name.toLowerCase().includes(ingredientLower),
        ),
      );

      if (hasIngredient) {
        matchingLogs.push({
          ...log,
          recipe_name: recipe.name,
        });
      }
    } catch {
      continue;
    }
  }

  const limit = options?.limit ?? 100;
  return matchingLogs.slice(0, limit);
}
