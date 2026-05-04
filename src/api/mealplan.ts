import { apiClient } from './client';
import { MealPlan, PaginatedResponse } from './types';

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

export async function createMealPlan(
  recipeId: number,
  date: string,
  mealTypeId: number,
): Promise<MealPlan> {
  const res = await apiClient.post<MealPlan>('/meal-plan/', {
    recipe: recipeId,
    date,
    meal_type: mealTypeId,
  });
  return res.data;
}

export async function deleteMealPlan(id: number): Promise<void> {
  await apiClient.delete(`/meal-plan/${id}/`);
}
