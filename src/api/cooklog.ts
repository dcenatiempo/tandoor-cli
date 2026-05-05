import { apiClient } from './client';
import { CookLog, PaginatedResponse } from './types';
import { getRecipe } from './recipes';

export async function listCookLogs(options?: {
  recipe?: number;
  limit?: number;
  startdate?: string;
  enddate?: string;
  minRating?: number;
  maxRating?: number;
}): Promise<CookLog[]> {
  const params: Record<string, string | number> = {};
  if (options?.recipe) params['recipe'] = options.recipe;
  if (options?.limit) params['limit'] = options.limit;
  if (options?.startdate) params['created_at__gte'] = options.startdate;
  if (options?.enddate) params['created_at__lte'] = options.enddate;

  const res = await apiClient.get<PaginatedResponse<CookLog>>('/cook-log/', { params });
  
  // Sort by created_at descending (most recent first)
  let sorted = res.data.results.sort((a, b) => {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  
  // Filter by rating if specified (client-side since API may not support rating filters)
  if (options?.minRating !== undefined) {
    sorted = sorted.filter((log) => log.rating !== null && log.rating >= options.minRating!);
  }
  if (options?.maxRating !== undefined) {
    sorted = sorted.filter((log) => log.rating !== null && log.rating <= options.maxRating!);
  }
  
  return sorted;
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
  // First, get all cook logs (with a reasonable limit)
  const allLogs = await listCookLogs({
    limit: options?.limit || 100,
    startdate: options?.startdate,
    enddate: options?.enddate,
    minRating: options?.minRating,
    maxRating: options?.maxRating,
  });

  // For each cook log, fetch the recipe and check if it contains the ingredient
  const matchingLogs: CookLogWithRecipeName[] = [];
  const ingredientLower = ingredientName.toLowerCase();

  for (const log of allLogs) {
    try {
      const recipe = await getRecipe(log.recipe);
      
      // Check if any ingredient in any step matches
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
    } catch (err) {
      // Skip recipes that can't be fetched (might be deleted)
      continue;
    }
  }

  return matchingLogs;
}
