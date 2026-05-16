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
  recipe: MealPlanListRecipePayload;
  servings: number;
  meal_type: string;
}

export async function mealPlansToListPayload(
  entries: MealPlan[],
): Promise<MealPlanListPayload[]> {
  if (entries.length === 0) {
    return [];
  }

  const uniqueIds = [...new Set(entries.map((e) => e.recipe.id))];
  const recipes = await Promise.all(uniqueIds.map((id) => getRecipe(id)));
  const recipeById = new Map(recipes.map((r) => [r.id, r]));

  return entries.map((entry) => {
    const recipe = recipeById.get(entry.recipe.id)!;
    return {
      id: entry.id,
      date: entry.from_date.split('T')[0],
      recipe: {
        id: recipe.id,
        name: recipe.name,
        description: recipe.description ?? '',
        working_time: recipe.working_time ?? 0,
        waiting_time: recipe.waiting_time ?? 0,
      },
      servings: entry.servings,
      meal_type: entry.meal_type.name,
    };
  });
}
