// Tandoor API type definitions

export interface Food {
  id: number;
  name: string;
  ignore_shopping?: boolean;
  food_onhand?: boolean;
}

export interface Unit {
  id: number;
  name: string;
}

export interface Ingredient {
  id: number;
  amount: number;
  unit: Unit | null;
  food: Food;
  note: string;
}

export interface Step {
  id: number;
  instruction: string;
  ingredients: Ingredient[];
  order: number;
}

export interface Keyword {
  id: number;
  name: string;
}

export interface Recipe {
  id: number;
  name: string;
  description: string;
  servings: number;
  working_time: number;  // minutes
  waiting_time: number;  // minutes
  created_at: string;    // ISO 8601
  steps: Step[];
  keywords: Keyword[];
}

export interface MealPlan {
  id: number;
  recipe: { id: number; name: string };
  date: string;          // YYYY-MM-DD
  meal_type: { id: number; name: string };
}

export interface ShoppingListEntry {
  id: number;
  food: Food;
  unit: Unit | null;
  amount: number;
  checked: boolean;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface IngredientCreatePayload {
  food: { name: string };
  unit: { name: string } | null;
  amount: number;
  note?: string;
  order?: number | null;
}

export interface StepCreatePayload {
  instruction: string;
  order: number;
  ingredients: IngredientCreatePayload[];
}

export interface RecipeCreatePayload {
  name: string;
  description?: string;
  servings?: number;
  working_time?: number;
  waiting_time?: number;
  steps: StepCreatePayload[];
}

export interface RecipeFromSourceResponse {
  recipe: RecipeCreatePayload | null;
  recipe_id: number | null;
  images: string[];
  error: boolean;
  msg: string;
  duplicates: Array<{ id: number; name: string }>;
}
