import { Recipe, MealPlan, ShoppingListEntry, Food } from '../api/types';

// Auto-disable colors when stdout is not a TTY (7.7)
const isTTY = process.stdout.isTTY === true;

// ANSI color helpers — no-ops when not a TTY
const cyan  = (s: string) => isTTY ? `\x1b[36m${s}\x1b[0m` : s;
const dim   = (s: string) => isTTY ? `\x1b[2m${s}\x1b[0m`  : s;
const green = (s: string) => isTTY ? `\x1b[32m${s}\x1b[0m` : s;
const red   = (s: string) => isTTY ? `\x1b[31m${s}\x1b[0m` : s;
const bold  = (s: string) => isTTY ? `\x1b[1m${s}\x1b[0m`  : s;

// 7.1 — full recipe detail
export function formatRecipe(recipe: Recipe): void {
  console.log(bold(cyan(recipe.name)));

  if (recipe.description) {
    console.log(recipe.description);
  }

  console.log(
    dim(`ID: ${recipe.id}`) +
    '  ' +
    dim(`Servings: ${recipe.servings}`) +
    '  ' +
    dim(`Prep: ${recipe.working_time} min`) +
    '  ' +
    dim(`Wait: ${recipe.waiting_time} min`)
  );

  if (recipe.keywords && recipe.keywords.length > 0) {
    console.log(dim(`Keywords: ${recipe.keywords.map(k => k.name).join(', ')}`));
  }

  console.log('');

  recipe.steps.forEach((step, idx) => {
    console.log(bold(`Step ${idx + 1}`));

    if (step.ingredients && step.ingredients.length > 0) {
      step.ingredients.forEach(ing => {
        const amount = ing.amount !== 0 ? String(ing.amount) : '';
        const unit   = ing.unit ? ing.unit.name : '';
        const food   = ing.food.name;
        const parts  = [amount, unit, food].filter(Boolean).join(' ');
        const note   = ing.note ? dim(` (${ing.note})`) : '';
        console.log(`  • ${parts}${note}`);
      });
    }

    if (step.instruction) {
      console.log(step.instruction);
    }

    console.log('');
  });
}

// 7.2 — recipe list (ID, name, creation date)
export function formatRecipeList(recipes: Recipe[]): void {
  if (recipes.length === 0) {
    console.log(dim('No recipes found.'));
    return;
  }

  recipes.forEach(r => {
    const date = dim(new Date(r.created_at).toLocaleDateString());
    console.log(`${dim(`[${r.id}]`)} ${cyan(r.name)}  ${date}`);
  });
}

// 7.3 — single meal plan entry
export function formatMealPlan(entry: MealPlan): void {
  // Extract just the date part from the ISO datetime string
  const date = entry.from_date.split('T')[0];
  console.log(
    `${dim(`[${entry.id}]`)} ${cyan(entry.recipe.name)}` +
    `  ${dim(date)}  ${dim(entry.meal_type.name)}`
  );
}

// 7.4 — shopping list entries
export function formatShoppingList(entries: ShoppingListEntry[]): void {
  if (entries.length === 0) {
    console.log(dim('Shopping list is empty.'));
    return;
  }

  entries.forEach(e => {
    const amount  = e.amount !== 0 ? String(e.amount) : '';
    const unit    = e.unit ? e.unit.name : '';
    const food    = e.food.name;
    const parts   = [amount, unit, food].filter(Boolean).join(' ');
    const checked = e.checked ? green('[✓]') : '[ ]';
    console.log(`${checked} ${parts}`);
  });
}

// 7.5 — food list
export function formatFoodList(foods: Food[]): void {
  if (foods.length === 0) {
    console.log(dim('No foods found.'));
    return;
  }

  foods.forEach(f => {
    const flags: string[] = [];
    if (f.ignore_shopping) flags.push(dim('ignore-shopping'));
    if (f.food_onhand)     flags.push(dim('on-hand'));
    const suffix = flags.length > 0 ? '  ' + flags.join('  ') : '';
    console.log(`${dim(`[${f.id}]`)} ${cyan(f.name)}${suffix}`);
  });
}

// 7.6 — pretty-printed JSON (no color codes in output)
export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}
// 7.7 — success (stdout, green) and error (stderr, red)
export function printSuccess(msg: string): void {
  console.log(green(msg));
}

export function printError(msg: string): void {
  process.stderr.write(red(msg) + '\n');
}
