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
  from_date: string;     // ISO 8601 datetime
  to_date: string;       // ISO 8601 datetime
  meal_type: { id: number; name: string };
  servings: number;
  note?: string;
  title?: string;
}

export interface MealType {
  id: number;
  name: string;
  order: number;
  time: string;
  color: string | null;
  created_by: number;
}

export interface ShoppingListEntry {
  id: number;
  food: Food;
  unit: Unit | null;
  amount: number;
  checked: boolean;
}

export interface TandoorUser {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  display_name: string;
  is_staff: boolean;
  is_superuser: boolean;
  is_active: boolean;
}

export interface Household {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface UserSpace {
  id: number;
  user: TandoorUser;
  space: number;
  groups: Array<{ id: number; name: string }>;
  household: Household | null;
  active: boolean;
  internal_note: string | null;
  invite_link: number | null;
  created_at: string;
  updated_at: string;
}

export interface InviteLink {
  id: number;
  uuid: string;
  email: string;
  household: Household | number;
  group: { id: number; name: string } | string;
  valid_until: string | null;
  used_by: TandoorUser | null;
  created_by: TandoorUser;
  created_at: string;
}

export interface CookLog {
  id: number;
  recipe: number;
  servings: number;
  rating: number | null;
  created_at: string;  // ISO 8601
  created_by: number;
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
