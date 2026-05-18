import { apiClient } from './client';
import { ShoppingListEntry, PaginatedResponse } from './types';
import { listMealPlans } from './mealplan';
import { getRecipe } from './recipes';
import { getFoodByName } from './food';

/**
 * Fetches all pages of a paginated Tandoor endpoint and returns the combined results.
 * Follows the `next` URL until there are no more pages.
 */
async function fetchAllPages<T>(path: string): Promise<T[]> {
  const results: T[] = [];
  // Use a relative path for the first request; subsequent pages use the full URL
  // returned by the API, so we strip the base URL prefix to keep axios happy.
  let nextUrl: string | null = path;

  while (nextUrl) {
    const res: { data: PaginatedResponse<T> } = await apiClient.get<PaginatedResponse<T>>(nextUrl);
    results.push(...res.data.results);
    // The `next` field is an absolute URL; extract just the path+query portion
    // so the axios instance (which already has a baseURL) handles it correctly.
    if (res.data.next) {
      const url: URL = new URL(res.data.next);
      nextUrl = url.pathname.replace(/^\/api/, '') + url.search;
    } else {
      nextUrl = null;
    }
  }

  return results;
}

export async function listShoppingEntries(): Promise<ShoppingListEntry[]> {
  return fetchAllPages<ShoppingListEntry>('/shopping-list-entry/');
}

/**
 * Returns a dedup key scoped to a specific meal plan.
 * An entry is a duplicate only if the same food+unit was already added
 * for the exact same meal plan ID.
 */
function mealplanEntryDedupKey(food: string, unit: string, mealplanId: number): string {
  return `${food.trim().toLowerCase()}|${unit.trim().toLowerCase()}|${mealplanId}`;
}

/**
 * Builds a Set of per-mealplan dedup keys from existing shopping list entries.
 * Only entries that are linked to a meal plan (via list_recipe_data) are included.
 */
function buildMealplanEntriesSet(entries: ShoppingListEntry[]): Set<string> {
  const keys = new Set<string>();
  for (const e of entries) {
    const mealplanId = e.list_recipe_data?.mealplan;
    if (mealplanId != null) {
      keys.add(mealplanEntryDedupKey(e.food.name, e.unit?.name ?? '', mealplanId));
    }
  }
  return keys;
}

export async function createShoppingEntry(
  food: string,
  amount: number,
  unit: string,
  mealplanId?: number,
): Promise<ShoppingListEntry> {
  const payload: {
    food: { name: string };
    unit?: { name: string };
    amount: number;
    mealplan_id?: number;
  } = {
    food: { name: food },
    amount,
  };

  if (unit && unit.trim() !== '') {
    payload.unit = { name: unit };
  }

  if (mealplanId != null) {
    payload.mealplan_id = mealplanId;
  }

  const res = await apiClient.post<ShoppingListEntry>('/shopping-list-entry/', payload);
  return res.data;
}

export async function checkShoppingEntry(id: number): Promise<ShoppingListEntry> {
  const res = await apiClient.patch<ShoppingListEntry>(`/shopping-list-entry/${id}/`, {
    checked: true,
  });
  return res.data;
}

export async function checkAllShoppingEntries(): Promise<ShoppingListEntry[]> {
  const all = await fetchAllPages<ShoppingListEntry>('/shopping-list-entry/');
  const unchecked = all.filter((entry) => !entry.checked);
  return Promise.all(unchecked.map((entry) => checkShoppingEntry(entry.id)));
}

export async function clearCheckedEntries(): Promise<void> {
  const all = await fetchAllPages<ShoppingListEntry>('/shopping-list-entry/');
  const checked = all.filter((entry) => entry.checked);
  await Promise.all(checked.map((entry) => apiClient.delete(`/shopping-list-entry/${entry.id}/`)));
}

export interface AddedIngredient {
  food: string;
  amount: number;
  unit: string;
  entry: ShoppingListEntry;
}

export interface SkippedIngredient {
  food: string;
  reason: 'ignore_shopping' | 'food_onhand' | 'already_on_list';
}

/**
 * Fetches all meal plan entries in the given date range, retrieves full recipe
 * details for each unique recipe, and adds every ingredient to the shopping list.
 * Ingredients marked ignore_shopping or food_onhand are skipped automatically.
 * Ingredients already linked to the same meal plan are skipped (idempotent re-runs).
 * Ingredients from different meal plans with the same food+unit are added normally
 * (amounts stack up across meal plans as expected).
 * Returns the list of added and skipped ingredients.
 */
export async function addMealPlanIngredientsToShopping(
  startdate: string,
  enddate: string,
): Promise<{ added: AddedIngredient[]; skipped: SkippedIngredient[] }> {
  const mealPlans = await listMealPlans({ startdate, enddate });

  if (mealPlans.length === 0) {
    return { added: [], skipped: [] };
  }

  // Fetch recipes for all unique recipe IDs up front
  const uniqueRecipeIds = [...new Set(mealPlans.map((mp) => mp.recipe.id))];
  const recipeList = await Promise.all(uniqueRecipeIds.map((id) => getRecipe(id)));
  const recipeMap = new Map(recipeList.map((r) => [r.id, r]));

  // Collect all unique food names so we can batch-check ignore_shopping / food_onhand
  const allFoodNames = [
    ...new Set(
      recipeList.flatMap((r) =>
        r.steps.flatMap((s) => s.ingredients.map((i) => i.food.name)),
      ),
    ),
  ];

  const foodDetails = await Promise.all(allFoodNames.map((n) => getFoodByName(n)));
  const foodMap = new Map<string, { ignore_shopping: boolean; food_onhand: boolean }>();
  for (const food of foodDetails) {
    if (food) {
      foodMap.set(food.name.toLowerCase(), {
        ignore_shopping: food.ignore_shopping ?? false,
        food_onhand: food.food_onhand ?? false,
      });
    }
  }

  // Fetch existing shopping list entries once and build a per-mealplan dedup set.
  // This lets us skip ingredients that were already added for a specific meal plan
  // while still allowing the same ingredient from a different meal plan to be added.
  const existingEntries = await listShoppingEntries();
  const mealplanKeys = buildMealplanEntriesSet(existingEntries);

  const added: AddedIngredient[] = [];
  const skipped: SkippedIngredient[] = [];

  for (const mealPlan of mealPlans) {
    const recipe = recipeMap.get(mealPlan.recipe.id);
    if (!recipe) continue;

    for (const step of recipe.steps) {
      for (const ingredient of step.ingredients) {
        const food = ingredient.food.name;
        const details = foodMap.get(food.toLowerCase());

        if (details?.ignore_shopping) {
          skipped.push({ food, reason: 'ignore_shopping' });
          continue;
        }
        if (details?.food_onhand) {
          skipped.push({ food, reason: 'food_onhand' });
          continue;
        }

        const amount = ingredient.amount;
        const unit = ingredient.unit?.name ?? '';
        const key = mealplanEntryDedupKey(food, unit, mealPlan.id);

        if (mealplanKeys.has(key)) {
          skipped.push({ food, reason: 'already_on_list' });
          continue;
        }

        const entry = await createShoppingEntry(food, amount, unit, mealPlan.id);
        // Track in the local set so duplicate ingredients within the same meal plan
        // (e.g. same food in two steps) are also caught within this run.
        mealplanKeys.add(key);
        added.push({ food, amount, unit, entry });
      }
    }
  }

  return { added, skipped };
}
