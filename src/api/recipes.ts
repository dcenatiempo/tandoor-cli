import { apiClient } from './client';
import {
  Recipe,
  RecipeCreatePayload,
  PaginatedResponse,
  RecipeFromSourceResponse,
} from './types';

export async function listRecipes(limit: number): Promise<Recipe[]> {
  const res = await apiClient.get<PaginatedResponse<Recipe>>('/recipe/', {
    params: { sort_order: '-created_at', page_size: limit },
  });
  return res.data.results;
}

export async function searchRecipes(query: string): Promise<Recipe[]> {
  const res = await apiClient.get<PaginatedResponse<Recipe>>('/recipe/', {
    params: { query },
  });
  return res.data.results;
}

export async function getRecipe(id: number): Promise<Recipe> {
  const res = await apiClient.get<Recipe>(`/recipe/${id}/`);
  return res.data;
}

export async function randomRecipe(): Promise<Recipe | null> {
  const res = await apiClient.get<PaginatedResponse<Recipe>>('/recipe/', {
    params: { random: true, page_size: 1 },
  });
  return res.data.results[0] ?? null;
}

export async function createRecipe(payload: RecipeCreatePayload): Promise<Recipe> {
  const res = await apiClient.post<Recipe>('/recipe/', payload);
  return res.data;
}

export async function updateRecipe(
  id: number,
  patch: Partial<RecipeCreatePayload>,
): Promise<Recipe> {
  const res = await apiClient.patch<Recipe>(`/recipe/${id}/`, patch);
  return res.data;
}

export async function deleteRecipe(id: number): Promise<void> {
  await apiClient.delete(`/recipe/${id}/`);
}

export async function scrapeRecipeFromUrl(url: string): Promise<RecipeFromSourceResponse> {
  const res = await apiClient.post<RecipeFromSourceResponse>('/recipe-from-source/', { url });
  return res.data;
}

export async function setRecipeImageFromUrl(id: number, imageUrl: string): Promise<void> {
  const FormData = require('form-data') as typeof import('form-data');
  const form = new FormData();
  form.append('image_url', imageUrl);
  await apiClient.put(`/recipe/${id}/image/`, form, {
    headers: form.getHeaders(),
  });
}
