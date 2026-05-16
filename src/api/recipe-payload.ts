import type {
  Recipe,
  RecipeGetPayload,
  IngredientCreatePayload,
  StepCreatePayload,
  Ingredient,
} from './types';

function ingredientToPayload(ing: Ingredient, index: number): IngredientCreatePayload {
  const payload: IngredientCreatePayload = {
    food: { name: ing.food.name },
    unit: ing.unit ? { name: ing.unit.name } : null,
    amount: ing.amount,
    order: ing.order ?? index,
  };
  if (ing.note?.trim()) {
    payload.note = ing.note.trim();
  }
  return payload;
}

function stepsToPayload(recipe: Recipe): StepCreatePayload[] {
  const steps = recipe.steps ?? [];
  return [...steps]
    .sort((a, b) => a.order - b.order)
    .map(
      (step): StepCreatePayload => ({
        instruction: step.instruction,
        order: step.order,
        ingredients: (step.ingredients ?? []).map(ingredientToPayload),
      }),
    );
}

/** Map a full API recipe to the JSON shape used by add/update, including id. */
export function recipeToCreatePayload(recipe: Recipe): RecipeGetPayload {
  const steps = stepsToPayload(recipe);
  const payload: RecipeGetPayload = {
    id: recipe.id,
    name: recipe.name,
  };

  if (steps.length > 0) {
    payload.steps = steps;
  }

  if (recipe.description?.trim()) {
    payload.description = recipe.description.trim();
  }
  if (recipe.servings != null) {
    payload.servings = recipe.servings;
  }
  if (recipe.working_time != null) {
    payload.working_time = recipe.working_time;
  }
  if (recipe.waiting_time != null) {
    payload.waiting_time = recipe.waiting_time;
  }

  return payload;
}
