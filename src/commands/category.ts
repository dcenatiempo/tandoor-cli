import { Command } from 'commander';
import { listSupermarketCategories, resolveCategory } from '../api/supermarket-category';
import { listFoods } from '../api/food';
import { patchFood } from '../api/food';
import { printSuccess, printError } from '../output/formatter';
import { addFormatOption, resolveFormat, emitOutput } from '../output/format-option';

export function registerCategoryCommand(program: Command): void {
  const category = program
    .command('category')
    .description('Manage grocery store categories for food items');

  // ── category list ──────────────────────────────────────────────────────────
  addFormatOption(
    category
      .command('list')
      .description('List all supermarket categories'),
  ).action(async (opts) => {
    try {
      const categories = await listSupermarketCategories();
      const format = resolveFormat(opts);

      if (format === 'text' && categories.length === 0) {
        console.log('No categories found.');
        return;
      }

      emitOutput(format, {
        text: () => {
          categories
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name))
            .forEach((c) => console.log(`[${c.id}] ${c.name}`));
        },
        json: () =>
          categories
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((c) => ({ id: c.id, name: c.name })),
        api: () => categories,
      });
    } catch (err: unknown) {
      printError(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

  // ── category uncategorised ─────────────────────────────────────────────────
  addFormatOption(
    category
      .command('uncategorised')
      .description('List food items that have no supermarket category assigned')
      .option('--search <term>', 'Filter by search term'),
  ).action(async (opts) => {
    try {
      const foods = await listFoods({ fetchAll: true, search: opts.search });
      const uncategorised = foods.filter((f) => !f.supermarket_category);

      const format = resolveFormat(opts);

      if (format === 'text' && uncategorised.length === 0) {
        console.log('All foods have a category assigned.');
        return;
      }

      emitOutput(format, {
        text: () => {
          uncategorised.forEach((f) => console.log(`[${f.id}] ${f.name}`));
        },
        json: () => uncategorised.map((f) => ({ id: f.id, name: f.name })),
        api: () => uncategorised,
      });
    } catch (err: unknown) {
      printError(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

  // ── category set ───────────────────────────────────────────────────────────
  addFormatOption(
    category
      .command('set <food-id-or-name>')
      .description('Assign a supermarket category to a food item')
      .option('--category <name-or-id>', 'Category name or ID to assign (required)')
      .option('--unset', 'Remove the category from the food item'),
  ).action(async (foodIdOrName: string, opts) => {
    try {
      if (!opts.category && !opts.unset) {
        printError('Provide --category <name-or-id> to assign a category, or --unset to remove it.');
        process.exit(1);
      }
      if (opts.category && opts.unset) {
        printError('Cannot use --category and --unset together.');
        process.exit(1);
      }

      // Resolve the food
      const { getFoodByName, getFoodById } = await import('../api/food');
      const numericFoodId = parseInt(foodIdOrName, 10);
      const food =
        !isNaN(numericFoodId) && String(numericFoodId) === foodIdOrName
          ? await getFoodById(numericFoodId)
          : await getFoodByName(foodIdOrName);

      if (!food) {
        printError(`Food "${foodIdOrName}" not found.`);
        process.exit(1);
      }

      let patch: Record<string, unknown>;

      if (opts.unset) {
        patch = { supermarket_category: null };
      } else {
        const cat = await resolveCategory(opts.category as string);
        if (!cat) {
          printError(`Category "${opts.category}" not found. Run "tandoor category list" to see available categories.`);
          process.exit(1);
        }
        patch = { supermarket_category: { id: cat.id, name: cat.name } };
      }

      const updated = await patchFood(food.id, patch as Parameters<typeof patchFood>[1]);
      const format = resolveFormat(opts);

      emitOutput(format, {
        text: () => {
          if (opts.unset) {
            printSuccess(`Removed category from "${updated.name}".`);
          } else {
            const catName = updated.supermarket_category?.name ?? opts.category;
            printSuccess(`"${updated.name}" assigned to category "${catName}".`);
          }
        },
        json: () => ({
          id: updated.id,
          name: updated.name,
          category: updated.supermarket_category?.name ?? null,
        }),
        api: () => updated,
      });
    } catch (err: unknown) {
      printError(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });
}
