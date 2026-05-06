import { apiClient } from './client';
import { ShoppingListEntry, PaginatedResponse } from './types';
import { listMealPlans } from './mealplan';
import { getRecipe } from './recipes';
import { getFoodByName } from './food';

export async function listShoppingEntries(): Promise<ShoppingListEntry[]> {
  const res = await apiClient.get<PaginatedResponse<ShoppingListEntry>>('/shopping-list-entry/');
  return res.data.results;
}

export async function createShoppingEntry(
  food: string,
  amount: number,
  unit: string,
): Promise<ShoppingListEntry> {
  const payload: {
    food: { name: string };
    unit?: { name: string };
    amount: number;
  } = {
    food: { name: food },
    amount,
  };
  
  // Only include unit if it's not empty
  if (unit && unit.trim() !== '') {
    payload.unit = { name: unit };
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
  const res = await apiClient.get<PaginatedResponse<ShoppingListEntry>>('/shopping-list-entry/');
  const unchecked = res.data.results.filter((entry) => !entry.checked);
  return Promise.all(unchecked.map((entry) => checkShoppingEntry(entry.id)));
}

export async function clearCheckedEntries(): Promise<void> {
  const res = await apiClient.get<PaginatedResponse<ShoppingListEntry>>('/shopping-list-entry/');
  const checked = res.data.results.filter((entry) => entry.checked);
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
  reason: 'ignore_shopping' | 'food_onhand';
}

/**
 * Fetches all meal plan entries in the given date range, retrieves full recipe
 * details for each unique recipe, and adds every ingredient to the shopping list.
 * Ingredients marked ignore_shopping or food_onhand are skipped automatically.
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

  // Deduplicate recipe IDs so we only fetch each recipe once
  const uniqueRecipeIds = [...new Set(mealPlans.map((mp) => mp.recipe.id))];
  const recipes = await Promise.all(uniqueRecipeIds.map((id) => getRecipe(id)));

  // Collect all unique food names across all recipes up front so we can
  // batch-check ignore_shopping / food_onhand in parallel.
  const allFoodNames = [
    ...new Set(
      recipes.flatMap((r) =>
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

  const added: AddedIngredient[] = [];
  const skipped: SkippedIngredient[] = [];

  for (const recipe of recipes) {
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
        const entry = await createShoppingEntry(food, amount, unit);
        added.push({ food, amount, unit, entry });
      }
    }
  }

  return { added, skipped };
}
