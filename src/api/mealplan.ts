import { apiClient } from './client';
import { MealPlan, MealType, PaginatedResponse } from './types';

export async function listMealPlans(options?: {
  startdate?: string;
  enddate?: string;
}): Promise<MealPlan[]> {
  const params: Record<string, string> = {};
  if (options?.startdate) params['from_date'] = options.startdate;
  if (options?.enddate) params['to_date'] = options.enddate;

  const res = await apiClient.get<PaginatedResponse<MealPlan>>('/meal-plan/', { params });
  return res.data.results;
}

export async function listMealTypes(): Promise<MealType[]> {
  const res = await apiClient.get<PaginatedResponse<MealType>>('/meal-type/');
  return res.data.results;
}

export async function resolveMealType(nameOrId: string): Promise<number> {
  // If it's a number, return it as-is
  const asNumber = parseInt(nameOrId, 10);
  if (!isNaN(asNumber) && String(asNumber) === nameOrId) {
    return asNumber;
  }

  // Otherwise, fetch meal types and find by name (case-insensitive)
  const mealTypes = await listMealTypes();
  const normalized = nameOrId.toLowerCase().trim();
  const match = mealTypes.find(mt => mt.name.toLowerCase() === normalized);
  
  if (!match) {
    const available = mealTypes.map(mt => mt.name).join(', ');
    throw new Error(
      `Meal type "${nameOrId}" not found. Available meal types: ${available}`
    );
  }
  
  return match.id;
}

export async function createMealPlan(
  recipeId: number,
  date: string,
  mealTypeId: number,
  servings: number,
): Promise<MealPlan> {
  const res = await apiClient.post<MealPlan>('/meal-plan/', {
    recipe: recipeId,
    from_date: date,
    to_date: date,
    meal_type: mealTypeId,
    servings,
  });
  return res.data;
}

export async function deleteMealPlan(id: number): Promise<void> {
  await apiClient.delete(`/meal-plan/${id}/`);
}

