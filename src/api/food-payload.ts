import type { Food } from './types';

export interface FoodListPayload {
  id: number;
  name: string;
  onhand: boolean;
  ignore_shopping: boolean;
}

export function foodToListPayload(food: Food): FoodListPayload {
  return {
    id: food.id,
    name: food.name,
    onhand: food.food_onhand ?? false,
    ignore_shopping: food.ignore_shopping ?? false,
  };
}

export function foodsToListPayload(foods: Food[]): FoodListPayload[] {
  return foods.map(foodToListPayload);
}
