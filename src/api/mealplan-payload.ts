import { getRecipe } from './recipes';
import type { MealPlan } from './types';

export interface MealPlanListRecipePayload {
  id: number;
  name: string;
  description: string;
  working_time: number;
  waiting_time: number;
}

export interface MealPlanListPayload {
  id: number;
  date: string;
  /**
   * Null when the entry is not tied to a recipe — a bare-title slot such as
   * "Takeaway". Use `title` for the label in that case.
   */
  recipe: MealPlanListRecipePayload | null;
  /** The entry's own title, if any. The only label when `recipe` is null. */
  title: string | null;
  servings: number;
  meal_type: string;
}

export async function mealPlansToListPayload(
  entries: MealPlan[],
): Promise<MealPlanListPayload[]> {
  if (entries.length === 0) {
    return [];
  }

  // Only entries that reference a recipe need one fetched. Mapping over every
  // entry is what let a single "Takeaway" slot crash the whole listing.
  const uniqueIds = [...new Set(entries.flatMap((e) => (e.recipe ? [e.recipe.id] : [])))];
  const recipes = await Promise.all(uniqueIds.map((id) => getRecipe(id)));
  const recipeById = new Map(recipes.map((r) => [r.id, r]));

  return entries.map((entry) => {
    const recipe = entry.recipe ? recipeById.get(entry.recipe.id) : undefined;
    return {
      id: entry.id,
      date: entry.from_date.split('T')[0],
      recipe: recipe
        ? {
            id: recipe.id,
            name: recipe.name,
            description: recipe.description ?? '',
            working_time: recipe.working_time ?? 0,
            waiting_time: recipe.waiting_time ?? 0,
          }
        : null,
      title: entry.title ?? null,
      servings: entry.servings,
      meal_type: entry.meal_type.name,
    };
  });
}
