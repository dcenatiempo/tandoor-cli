import { apiClient } from './client';
import { Food, PaginatedResponse } from './types';

export interface ListFoodsOptions {
  /** Results per page (ignored when fetchAll is true). */
  limit?: number;
  /** 1-based page number (ignored when fetchAll is true). */
  page?: number;
  /** Fetch every matching food across all API pages. */
  fetchAll?: boolean;
  search?: string;
  ignoredOnly?: boolean;
  onhandOnly?: boolean;
}

/** Max page size allowed by Tandoor's DefaultPagination. */
const FILTER_SCAN_PAGE_SIZE = 200;

/** Concurrent /food/ page requests when scanning for filtered results. */
const PARALLEL_PAGE_FETCHES = 8;

export interface FoodListCollectState {
  matched: Food[];
  skipRemaining: number;
  /** Max items to collect after skip; null means no cap. */
  take: number | null;
}

export type FoodListFilterOpts = Pick<ListFoodsOptions, 'ignoredOnly' | 'onhandOnly'>;

/**
 * Returns true when a food row matches active list filters.
 */
export function foodMatchesListFilters(food: Food, opts: FoodListFilterOpts): boolean {
  if (opts.ignoredOnly && !food.ignore_shopping) return false;
  if (opts.onhandOnly && !food.food_onhand) return false;
  return true;
}

/**
 * Build initial collection state for a list request.
 */
export function createFoodListCollectState(opts: ListFoodsOptions): FoodListCollectState {
  const page = opts.page ?? 1;
  if (opts.fetchAll) {
    return { matched: [], skipRemaining: 0, take: null };
  }
  const limit = opts.limit ?? 20;
  return {
    matched: [],
    skipRemaining: (page - 1) * limit,
    take: limit,
  };
}

export function isFoodListCollectDone(state: FoodListCollectState): boolean {
  return state.take !== null && state.matched.length >= state.take;
}

/**
 * Apply filters and pagination (skip/take) to foods from one API page.
 */
export function collectMatchingFoods(
  state: FoodListCollectState,
  foods: Food[],
  filterOpts: FoodListFilterOpts,
): FoodListCollectState {
  const matched = [...state.matched];
  let skipRemaining = state.skipRemaining;

  for (const food of foods) {
    if (!foodMatchesListFilters(food, filterOpts)) continue;
    if (skipRemaining > 0) {
      skipRemaining--;
      continue;
    }
    matched.push(food);
    if (state.take !== null && matched.length >= state.take) {
      return { matched, skipRemaining, take: state.take };
    }
  }

  return { matched, skipRemaining, take: state.take };
}

function needsClientSideFilter(opts: ListFoodsOptions): boolean {
  return Boolean(opts.ignoredOnly || opts.onhandOnly);
}

function buildListParams(
  opts: ListFoodsOptions,
  pageSize: number,
  page: number,
): Record<string, string | number> {
  const params: Record<string, string | number> = {
    page_size: pageSize,
    page,
  };
  if (opts.search) {
    params.query = opts.search;
  }
  return params;
}

async function fetchFoodPage(
  opts: ListFoodsOptions,
  page: number,
  pageSize: number,
): Promise<PaginatedResponse<Food>> {
  const res = await apiClient.get<PaginatedResponse<Food>>('/food/', {
    params: buildListParams(opts, pageSize, page),
  });
  return res.data;
}

async function fetchAllFoodPagesUnfiltered(opts: ListFoodsOptions): Promise<Food[]> {
  const all: Food[] = [];
  let page = 1;

  while (true) {
    const data = await fetchFoodPage(opts, page, FILTER_SCAN_PAGE_SIZE);
    all.push(...data.results);
    if (!data.next) break;
    page += 1;
  }

  return all;
}

async function listFoodsWithClientFilter(opts: ListFoodsOptions): Promise<Food[]> {
  const filterOpts: FoodListFilterOpts = {
    ignoredOnly: opts.ignoredOnly,
    onhandOnly: opts.onhandOnly,
  };
  let state = createFoodListCollectState(opts);

  const first = await fetchFoodPage(opts, 1, FILTER_SCAN_PAGE_SIZE);
  state = collectMatchingFoods(state, first.results, filterOpts);
  if (isFoodListCollectDone(state) && !opts.fetchAll) return state.matched;

  const totalPages = Math.max(1, Math.ceil(first.count / FILTER_SCAN_PAGE_SIZE));
  if (totalPages <= 1) return state.matched;

  for (let batchStart = 2; batchStart <= totalPages; batchStart += PARALLEL_PAGE_FETCHES) {
    if (isFoodListCollectDone(state) && !opts.fetchAll) return state.matched;

    const pages: number[] = [];
    for (let page = batchStart; page < batchStart + PARALLEL_PAGE_FETCHES && page <= totalPages; page++) {
      pages.push(page);
    }

    const pageResponses = await Promise.all(
      pages.map((page) => fetchFoodPage(opts, page, FILTER_SCAN_PAGE_SIZE)),
    );

    for (const data of pageResponses) {
      state = collectMatchingFoods(state, data.results, filterOpts);
      if (isFoodListCollectDone(state) && !opts.fetchAll) return state.matched;
    }
  }

  return state.matched;
}

/**
 * List foods with optional search, pagination, ignore_shopping, and on-hand filters.
 *
 * `--ignored` and `--onhand` are filtered client-side because the Tandoor list
 * endpoint does not support those query parameters.
 */
export async function listFoods(opts: ListFoodsOptions = {}): Promise<Food[]> {
  if (!needsClientSideFilter(opts)) {
    if (opts.fetchAll) {
      return fetchAllFoodPagesUnfiltered(opts);
    }

    const limit = opts.limit ?? 20;
    const page = opts.page ?? 1;
    const data = await fetchFoodPage(opts, page, limit);
    return data.results;
  }

  return listFoodsWithClientFilter(opts);
}

/**
 * Look up a food by exact name. Returns null if not found.
 */
export async function getFoodByName(name: string): Promise<Food | null> {
  const res = await apiClient.get<PaginatedResponse<Food>>('/food/', {
    params: { query: name },
  });
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
