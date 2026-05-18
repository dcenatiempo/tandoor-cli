import type { Food } from './types';

export interface FoodListPayload {
  id: number;
  name: string;
  onhand: boolean;
  ignore_shopping: boolean;
  category: string | null;
}

export function foodToListPayload(food: Food): FoodListPayload {
  return {
    id: food.id,
    name: food.name,
    onhand: food.food_onhand ?? false,
    ignore_shopping: food.ignore_shopping ?? false,
    category: food.supermarket_category?.name ?? null,
  };
}

export function foodsToListPayload(foods: Food[]): FoodListPayload[] {
  return foods.map(foodToListPayload);
}
